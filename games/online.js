// version v1.0
(function () {
  'use strict';

  // This session belongs to the tab, not to a board renderer or its pause timers.
  if (window.CaroOnline) return;
  const SESSION_KEY = 'tram-choi.caro.online.session';
  const NAME_KEY = 'tram-choi.caro.online.name';
  const REQUEST_TIMEOUT = 8000;
  // IDs must stay unique across reloads: the server remembers them with the seat.
  const requestPrefix = window.crypto.randomUUID ? window.crypto.randomUUID() :
    Array.from(window.crypto.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, '0')).join('');
  const listeners = new Set();
  const requests = new Map();
  let socket = null,
    opening = null,
    openingReject = null,
    connectTimer = null,
    reconnectTimer = null,
    reconnectAttempt = 0,
    requestSequence = 0,
    generation = 0,
    handshakePending = false,
    resumePending = null,
    stopped = false,
    suspended = false,
    offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  function readSession() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(SESSION_KEY));
      if (
        saved &&
        typeof saved.code === 'string' &&
        typeof saved.token === 'string' &&
        saved.token.length &&
        Number.isInteger(saved.seat)
      ) {
        return { code: saved.code, token: saved.token, seat: saved.seat };
      }
    } catch (_) {
      // Storage can be unavailable in private/embedded browsing contexts.
    }
    return null;
  }

  const state = {
    connection: 'idle',
    room: null,
    you: null,
    session: readSession(),
    pending: false,
    pendingIndex: null,
    error: '',
  };

  function getState() {
    return { ...state, session: state.session ? { ...state.session } : null };
  }

  function emit() {
    state.pending = handshakePending || requests.size > 0;
    const move = Array.from(requests.values()).find((request) => request.type === 'move');
    state.pendingIndex = move ? move.index : null;
    for (const listener of listeners) listener(getState());
  }

  function saveSession(session) {
    try {
      if (session) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else window.sessionStorage.removeItem(SESSION_KEY);
    } catch (_) {
      // The current tab can still play when storage is disabled.
    }
    state.session = session;
  }

  function failure(message, code) {
    const error = new Error(message);
    if (code) error.code = code;
    return error;
  }

  function localFailure(message, code) {
    state.error = message;
    emit();
    return Promise.reject(failure(message, code));
  }

  function settle(requestId, error) {
    const request = requests.get(requestId);
    if (!request) return;
    clearTimeout(request.timer);
    requests.delete(requestId);
    if (error) request.reject(error);
    else request.resolve(getState());
    emit();
  }

  function rejectRequests(error) {
    for (const request of requests.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    requests.clear();
    resumePending = null;
  }

  function cancelReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  function closeConnection(message) {
    const current = socket;
    socket = null;
    clearTimeout(connectTimer);
    connectTimer = null;
    if (openingReject) openingReject(failure(message, 'DISCONNECTED'));
    opening = null;
    openingReject = null;
    rejectRequests(failure(message, 'DISCONNECTED'));
    if (current && current.readyState < 2) current.close(1000);
  }

  function endpoint() {
    if (window.location.protocol === 'file:') {
      throw failure('Chơi online cần mở game qua máy chủ HTTP/HTTPS, không thể mở trực tiếp file HTML.');
    }
    const configured = document.querySelector('meta[name="caro-websocket-url"]');
    const url = new URL(
      configured && configured.content.trim() ? configured.content.trim() : '/ws/caro',
      window.location.href,
    );
    if (url.protocol === 'https:') url.protocol = 'wss:';
    if (url.protocol === 'http:') url.protocol = 'ws:';
    if (!['ws:', 'wss:'].includes(url.protocol)) {
      throw failure('Địa chỉ máy chủ online không hợp lệ.');
    }
    if (window.location.protocol === 'https:' && url.protocol !== 'wss:') {
      throw failure('Trang HTTPS cần máy chủ online dùng kết nối bảo mật WSS.');
    }
    url.hash = '';
    return url.href;
  }

  function scheduleReconnect() {
    if (!state.session || stopped || suspended || offline || reconnectTimer) return;
    state.connection = 'reconnecting';
    const delay = Math.min(500 * 2 ** reconnectAttempt++, 5000);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      ensureOpen().catch(() => {});
    }, delay);
  }

  function send(type, payload = {}) {
    if (!socket || socket.readyState !== 1) {
      return localFailure('Chưa kết nối với máy chủ. Vui lòng đợi kết nối lại.', 'DISCONNECTED');
    }
    const requestId = `${requestPrefix}-${++requestSequence}`;
    const current = socket;
    state.error = '';
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!requests.has(requestId)) return;
        const error = failure('Máy chủ chưa phản hồi. Đang kết nối lại để cập nhật bàn cờ.', 'TIMEOUT');
        state.error = error.message;
        settle(requestId, error);
        // Never resend a move: reconnect/resume obtains the authoritative snapshot.
        closeConnection(error.message);
        state.connection = state.session ? 'reconnecting' : 'unavailable';
        scheduleReconnect();
        emit();
      }, REQUEST_TIMEOUT);
      requests.set(requestId, { type, index: payload.index, timer, resolve, reject });
      emit();
      try {
        current.send(JSON.stringify({ type, requestId, ...payload }));
      } catch (_) {
        const error = failure('Không thể gửi yêu cầu. Vui lòng đợi kết nối lại.', 'DISCONNECTED');
        state.error = error.message;
        closeConnection(error.message);
        state.connection = state.session ? 'reconnecting' : 'unavailable';
        scheduleReconnect();
        emit();
      }
    });
  }

  function resumeSession() {
    if (!state.session) return Promise.resolve();
    if (resumePending) return resumePending;
    const { code, token } = state.session;
    const promise = send('resume', { code, token });
    resumePending = promise;
    // Register both paths so automatic background reconnection has no unhandled rejection.
    promise.then(
      () => {
        if (resumePending === promise) resumePending = null;
      },
      () => {
        if (resumePending === promise) resumePending = null;
      },
    );
    return promise;
  }

  function receive(event, current) {
    if (socket !== current) return;
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (_) {
      return;
    }
    if (!message || typeof message !== 'object') return;
    if (message.type === 'ack') {
      settle(message.requestId);
    } else if (message.type === 'session') {
      if (
        typeof message.code !== 'string' ||
        typeof message.token !== 'string' ||
        !Number.isInteger(message.seat)
      ) return;
      // Persist before notifying views, including views about to switch 2D/3D.
      saveSession({ code: message.code, token: message.token, seat: message.seat });
      emit();
    } else if (message.type === 'state' && message.room) {
      if (!state.session || message.room.code !== state.session.code) return;
      if (
        state.room &&
        state.room.roundId === message.room.roundId &&
        state.room.version > message.room.version
      ) return;
      state.room = message.room;
      state.you = message.you;
      emit();
    } else if (message.type === 'error') {
      const request = requests.get(message.requestId);
      state.error = message.message || 'Không thể thực hiện yêu cầu online.';
      if (
        request &&
        request.type === 'resume' &&
        ['ROOM_NOT_FOUND', 'INVALID_TOKEN', 'SESSION_EXPIRED'].includes(message.code)
      ) {
        saveSession(null);
        state.room = null;
        state.you = null;
        cancelReconnect();
      }
      settle(message.requestId, failure(state.error, message.code));
      emit();
    } else if (message.type === 'left') {
      saveSession(null);
      state.room = null;
      state.you = null;
      emit();
    }
  }

  function ensureOpen() {
    if (socket && socket.readyState === 1) return Promise.resolve();
    if (opening) return opening;
    if (suspended || offline) {
      return Promise.reject(failure('Thiết bị đang mất kết nối mạng.', 'DISCONNECTED'));
    }
    let address;
    try {
      address = endpoint();
    } catch (error) {
      state.connection = 'unavailable';
      state.error = error.message;
      emit();
      return Promise.reject(error);
    }
    cancelReconnect();
    state.connection = state.session ? 'reconnecting' : 'connecting';
    emit();
    let resolveOpen;
    const promise = new Promise((resolve, reject) => {
      resolveOpen = resolve;
      openingReject = reject;
    });
    opening = promise;
    let current;
    try {
      current = new WebSocket(address);
    } catch (_) {
      closeConnection('Không thể mở kết nối đến máy chủ online.');
      state.connection = state.session ? 'reconnecting' : 'unavailable';
      state.error = 'Không thể mở kết nối đến máy chủ online.';
      scheduleReconnect();
      emit();
      return promise;
    }
    socket = current;
    connectTimer = setTimeout(() => {
      if (socket !== current) return;
      closeConnection('Không kết nối được với máy chủ online. Vui lòng thử lại.');
      state.connection = state.session ? 'reconnecting' : 'unavailable';
      state.error = 'Không kết nối được với máy chủ online. Vui lòng thử lại.';
      scheduleReconnect();
      emit();
    }, REQUEST_TIMEOUT);
    current.addEventListener('open', () => {
      if (socket !== current) return;
      clearTimeout(connectTimer);
      connectTimer = null;
      opening = null;
      openingReject = null;
      reconnectAttempt = 0;
      state.connection = 'connected';
      state.error = '';
      if (state.session) resumeSession().catch(() => {});
      emit();
      resolveOpen();
    });
    current.addEventListener('message', (event) => receive(event, current));
    current.addEventListener('error', () => {
      if (socket !== current) return;
      state.error = 'Không kết nối được với máy chủ online. Vui lòng kiểm tra mạng hoặc thử lại.';
      emit();
      // WebSocket dispatches close after an error; it owns reconnect scheduling.
    });
    current.addEventListener('close', (event) => {
      if (socket !== current) return;
      const replaced = event.code === 4001;
      const message = replaced
        ? 'Phiên chơi đã được mở ở nơi khác. Bấm kết nối lại để tiếp tục trên thiết bị này.'
        : 'Kết nối online bị gián đoạn. Đang chờ kết nối lại.';
      closeConnection(message);
      stopped = replaced;
      state.connection = replaced ? 'replaced' : state.session ? 'reconnecting' : 'unavailable';
      state.error = message;
      if (!replaced) scheduleReconnect();
      emit();
    });
    return promise;
  }

  async function enter(type, payload) {
    if (state.session) return localFailure('Bạn đang ở trong một phòng. Hãy rời phòng trước.');
    if (handshakePending) return localFailure('Đang xử lý yêu cầu vào phòng.');
    const currentGeneration = generation;
    handshakePending = true;
    stopped = false;
    state.error = '';
    emit();
    try {
      await ensureOpen();
      if (currentGeneration !== generation) throw failure('Đã hủy yêu cầu vào phòng.', 'CANCELLED');
      try {
        window.localStorage.setItem(NAME_KEY, payload.name || '');
      } catch (_) {}
      return await send(type, payload);
    } catch (error) {
      if (currentGeneration === generation) state.error = error.message;
      throw error;
    } finally {
      if (currentGeneration === generation) {
        handshakePending = false;
        emit();
      }
    }
  }

  function roomCommand(type, payload = {}) {
    if (!state.session || !state.room) return localFailure('Bạn chưa tham gia phòng online.');
    if (state.connection !== 'connected') {
      return localFailure('Vui lòng đợi kết nối lại trước khi tiếp tục.', 'DISCONNECTED');
    }
    if (state.pending) return localFailure('Đang chờ máy chủ xác nhận yêu cầu trước.');
    return send(type, { roundId: state.room.roundId, ...payload });
  }

  function retry() {
    if (suspended || offline) return Promise.resolve();
    stopped = false;
    state.error = '';
    cancelReconnect();
    reconnectAttempt = 0;
    if (socket && socket.readyState === 1) {
      return state.room ? send('sync') : state.session ? resumeSession() : Promise.resolve();
    }
    return ensureOpen();
  }

  function reconnectIfNeeded() {
    if (state.session && !stopped && !suspended && !offline && (!socket || socket.readyState > 1)) {
      retry().catch(() => {});
    }
  }

  window.addEventListener('pagehide', () => {
    suspended = true;
    cancelReconnect();
    closeConnection('Trang đang tạm đóng. Sẽ khôi phục phòng khi bạn quay lại.');
    state.connection = state.session ? 'reconnecting' : 'idle';
    emit();
  });
  window.addEventListener('pageshow', () => {
    suspended = false;
    offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    reconnectIfNeeded();
  });
  window.addEventListener('offline', () => {
    offline = true;
    cancelReconnect();
    closeConnection('Thiết bị đang mất kết nối mạng.');
    state.connection = state.session ? 'reconnecting' : 'unavailable';
    state.error = 'Thiết bị đang mất kết nối mạng.';
    emit();
  });
  window.addEventListener('online', () => {
    offline = false;
    reconnectIfNeeded();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) reconnectIfNeeded();
  });

  window.CaroOnline = {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    },
    getName() {
      try {
        return window.localStorage.getItem(NAME_KEY) || '';
      } catch (_) {
        return '';
      }
    },
    create(name) {
      return enter('create', { name: String(name || '').trim() });
    },
    join(code, name) {
      return enter('join', {
        code: String(code || '').trim().toUpperCase(),
        name: String(name || '').trim(),
      });
    },
    ready() {
      return roomCommand('ready');
    },
    move(index) {
      return roomCommand('move', { index, version: state.room && state.room.version });
    },
    rematch() {
      return roomCommand('rematch');
    },
    leave() {
      ++generation;
      stopped = true;
      handshakePending = false;
      cancelReconnect();
      // Send before closing; leave also succeeds locally while the network is unavailable.
      if (socket && socket.readyState === 1) {
        try {
          socket.send(JSON.stringify({ type: 'leave', requestId: `${requestPrefix}-${++requestSequence}` }));
        } catch (_) {}
      }
      saveSession(null);
      closeConnection('Đã rời phòng online.');
      state.connection = 'idle';
      state.room = null;
      state.you = null;
      state.error = '';
      emit();
      return Promise.resolve();
    },
    resumeSaved() {
      if (!state.session) return false;
      if (state.connection === 'connected' && state.room) return true;
      if (!stopped) retry().catch(() => {});
      return true;
    },
    retry,
    clearError() {
      state.error = '';
      emit();
    },
    getInviteCode() {
      const query = window.location.hash.split('?')[1] || '';
      return (new URLSearchParams(query).get('room') || '').trim().toUpperCase();
    },
    inviteLink(code) {
      const url = new URL(window.location.href);
      url.hash = `play/caro?${new URLSearchParams({ room: String(code || '').trim().toUpperCase() })}`;
      return url.href;
    },
  };
})();
