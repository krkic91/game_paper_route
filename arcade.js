(function () {
  'use strict';
  const Art = window.ArcadeArt;
  const categories = { arcade: 'Arcade', sport: 'Thể thao', board: 'Bàn cờ', puzzle: 'Trí tuệ' };
  const categoryColors = {
    arcade: '#bdcf91',
    sport: '#91b8bd',
    board: '#d8b491',
    puzzle: '#b7a5d0',
  };
  const games = [
    {
      id: 'delivery',
      title: 'Delivery Dash',
      category: 'arcade',
      players: '1 người',
      badge: 'NGUYÊN BẢN',
      description: 'Một chiếc xe đạp, cả khu phố đợi bạn.',
      keywords: 'giao báo xe đạp paperboy game cũ',
      intro:
        'Trở lại con phố quen với chiếc xe đạp và một túi báo. Giao thật chuẩn, né thật khéo và về đích an toàn.',
      instructions: [
        'A / D hoặc ← / → để lái. W / S hoặc ↑ / ↓ để tăng, giảm tốc.',
        'Space để ném báo vào mục tiêu. J ném trái, K ném phải. Mỗi lần giao đúng được 100 điểm.',
        'Trên điện thoại: kéo mặt đường để lái, chạm để ném, giữ ĐẠP XE để tăng tốc.',
        'Giữ ít nhất 1 trong 3 mạng để hoàn thành tuyến đường.',
      ],
      variant: 'Giữ nguyên game gốc: 24 hộp thư, 36 tờ báo và chặng chướng ngại cuối đường.',
    },
    {
      id: 'race',
      title: 'Đua xe đạp',
      category: 'sport',
      players: '1 người',
      badge: 'NƯỚC RÚT NÀO',
      description: 'Đường đua xanh, cuộc rượt đuổi đầy nắng.',
      keywords: 'bicycle racing đua tốc độ',
      intro:
        'Cùng 3 đối thủ chinh phục đường đua dài 1 km. Tốc độ là lợi thế, nhưng nước rút đúng lúc mới là bí quyết.',
      instructions: [
        'Dùng A / D, ← / → hoặc giữ các nút trái, phải để lái.',
        'Giữ Space, W, ↑, Shift hoặc nút nước rút để tăng tốc. Thả ra để hồi năng lượng.',
        'Tránh cọc tiêu và vũng nước. Nhặt chai nước để hồi thêm năng lượng.',
        'Bạn có 3 mạng. Về đích nhanh, thứ hạng cao và ít va chạm sẽ được nhiều điểm hơn.',
      ],
      variant:
        'Cuộc đua đơn với 3 đối thủ do máy điều khiển. Đường đua tạo chướng ngại mới mỗi lần chơi.',
    },
    {
      id: 'caro',
      title: 'Caro',
      category: 'board',
      players: '1–2 người',
      badge: '',
      description: 'Năm nước thẳng hàng, một chiến thắng.',
      keywords: 'gomoku x o cờ trí tuệ chiến thuật',
      intro:
        'Một bàn cờ, hai ký hiệu và vô số chiến thuật. Tìm nước thắng trước khi đối thủ nhận ra!',
      instructions: [
        'Chọn Đấu với máy hoặc 2 người cùng máy. X luôn đi trước.',
        'Nhấn một ô trống để đặt quân. Có thể dùng mũi tên trên bàn và Enter để đánh.',
        'Nối từ 5 quân cùng loại liên tiếp theo hàng ngang, dọc hoặc chéo để thắng.',
        'Ván đấu hòa khi bàn kín mà không bên nào thắng.',
      ],
      variant:
        'Caro tự do 15 × 15: từ 5 quân là thắng, kể cả bị chặn hai đầu. Không áp dụng luật cấm của Renju.',
    },
    {
      id: 'ludo',
      title: 'Cờ cá ngựa',
      category: 'board',
      players: '1–4 người',
      badge: 'VUI CÙNG BẠN',
      description: 'Tung xúc xắc, đưa cả đội về nhà.',
      keywords: 'ludo xúc xắc cờ ngựa nhiều người',
      intro:
        'Xúc xắc đã sẵn sàng. Xuất chuồng, đá ngựa đối thủ và đưa 4 chú ngựa của bạn về đích trước nhất.',
      instructions: [
        'Chơi Bạn + 3 máy, 2 người hoặc 4 người trên cùng thiết bị. Bạn là đội Xanh lá khi đấu máy.',
        'Ra 6 để đưa ngựa từ chuồng ra điểm xuất phát. Sau khi tung, chạm một ngựa đang sáng để đi.',
        'Ra 6 được thêm lượt. Đáp lên đối thủ để đá về chuồng; ô có ngôi sao là vùng an toàn.',
        'Đi hết vòng rồi vào đường màu của mình. Cần đúng số bước để vào ô đích số 6. Về đủ 4 ngựa là thắng.',
      ],
      variant:
        'Phiên bản Ludo rút gọn: cho phép xếp chồng quân; không chặn đường, không phạt ba lần ra 6. Máy tự đi sau một nhịp chờ.',
    },
    {
      id: 'quan',
      title: 'Ô ăn quan',
      category: 'board',
      players: '1–2 người',
      badge: '',
      description: 'Nhặt một nắm tuổi thơ, rải một vòng vui.',
      keywords: 'o an quan dân gian mancala sỏi quan',
      intro:
        'Trò chơi dân gian thân thuộc trở lại trên màn hình. Quan sát, tính toán và chọn hướng rải thật khéo.',
      instructions: [
        'Bạn / Người 1 chơi hàng dưới. Chọn một ô dân có quân ở hàng của mình, rồi chọn rải trái hoặc phải.',
        'Rải mỗi ô 1 dân theo hướng đã chọn. Gặp ô dân có quân kế tiếp thì nhấc lên và rải tiếp; không nhấc ô quan.',
        'Gặp một ô trống rồi đến ô có quân: ăn ô có quân. Có thể ăn liên tiếp nếu tiếp tục xen kẽ trống – có quân. Quan = 10 điểm, dân = 1 điểm.',
        'Hàng của người sắp đi trống: trừ 5 điểm để rải lại, có thể mượn thành điểm âm. Hai ô quan trống hẳn: thu dân hàng mình, ai nhiều điểm hơn thắng.',
      ],
      variant:
        'Luật cơ bản, không áp dụng điều kiện “quan non”. Máy tự tính nước; hoặc chọn 2 người để chơi chung thiết bị.',
    },
    {
      id: 'pool',
      title: 'Bida bỏ túi',
      category: 'sport',
      players: '1 người',
      badge: '',
      description: 'Ngắm một đường, đánh một cú thật êm.',
      keywords: 'billiards billiard bi da bi-a pool bida',
      intro: 'Một bàn nỉ xanh và 15 bi màu. Thả lỏng tay, căn đúng góc và tận hưởng từng cú đánh.',
      instructions: [
        'Di chuột hoặc chạm bàn để chọn hướng ngắm từ bi trắng. Đường chấm gợi ý đường đi.',
        'Chỉnh thanh Lực đánh, rồi nhấn Đánh bi. Chờ bi dừng hẳn trước cú tiếp theo.',
        'Bàn phím: ← / → chỉnh góc, ↑ / ↓ chỉnh lực, Space đánh bi.',
        'Bi màu vào lỗ: +100 điểm; mỗi cú đánh: −5. Bi trắng vào lỗ: −50 và được đặt lại. Dọn đủ 15 bi nhận thêm 500 điểm.',
      ],
      variant:
        'Chế độ luyện tập bida 6 lỗ, không phải luật 8-ball. Bi đen cũng là bi mục tiêu, có thể đánh vào lỗ bất kỳ lúc nào.',
    },
    {
      id: 'snake',
      title: 'Rắn săn mồi',
      category: 'arcade',
      players: '1 người',
      badge: 'TUỔI THƠ ĐÂY RỒI',
      description: 'Một trái nữa thôi… rồi lại một trái nữa.',
      keywords: 'snake rắn trái cây cổ điển',
      intro:
        'Chú rắn nhỏ có một chiếc bụng không đáy. Ăn nhiều hơn, dài hơn và khéo léo hơn qua từng nước đi.',
      instructions: [
        'Dùng phím mũi tên hoặc W A S D để đổi hướng.',
        'Trên điện thoại: vuốt mặt bàn hoặc nhấn các nút điều hướng.',
        'Mỗi trái cây được 10 điểm. Rắn lớn lên và di chuyển nhanh hơn.',
        'Không chạm tường, không cắn thân mình. Không thể quay đầu 180° ngay lập tức.',
      ],
      variant: 'Bàn 20 × 20 có tường. Kỷ lục được lưu tự động trên thiết bị này.',
    },
    {
      id: '2048',
      title: '2048',
      category: 'puzzle',
      players: '1 người',
      badge: '',
      description: 'Những con số nhỏ, một mục tiêu lớn.',
      keywords: '2048 ghép số giải đố logic',
      intro: 'Trượt, gộp và tính xa hơn một nước. Liệu bạn có chạm được con số 2048?',
      instructions: [
        'Dùng mũi tên, W A S D, các nút bên dưới hoặc vuốt mặt bàn.',
        'Các ô cùng số chạm nhau sẽ gộp lại. Một ô chỉ gộp một lần trong mỗi nước đi.',
        'Sau mỗi nước hợp lệ, một ô 2 hoặc 4 mới xuất hiện. Số vừa gộp được cộng vào điểm.',
        'Đạt 2048 vẫn có thể chơi tiếp. Ván kết thúc khi không còn nước đi hợp lệ.',
      ],
      variant: 'Bàn 4 × 4 cổ điển. Mẹo nhỏ: giữ ô lớn nhất ở một góc và dành chỗ cho những ô mới.',
    },
    {
      id: 'memory',
      title: 'Lật thẻ trí nhớ',
      category: 'puzzle',
      players: '1 người',
      badge: '',
      description: 'Lật một tấm thẻ, tìm một người bạn.',
      keywords: 'memory matching lật hình tìm cặp hoa quả',
      intro:
        'Một khu vườn trái cây đang trốn sau những tấm thẻ. Tìm đủ các cặp bằng trí nhớ của bạn.',
      instructions: [
        'Lật hai thẻ bất kỳ. Hai hình giống nhau sẽ được giữ ngửa.',
        'Nếu không khớp, thẻ tự úp sau một nhịp ngắn. Ghi nhớ vị trí nhé!',
        'Tìm đủ 8 cặp để hoàn thành. Đồng hồ chỉ bắt đầu sau lần lật đầu tiên.',
        'Ít lần lật và ít thời gian hơn sẽ được điểm cao hơn.',
      ],
      variant:
        '16 thẻ, 8 cặp trái cây; trộn lại mỗi ván. Điểm = 1.600 − 30 × lần lật − 2 × giây, tối thiểu 100.',
    },
    {
      id: 'breakout',
      title: 'Phá gạch',
      category: 'arcade',
      players: '1 người',
      badge: '',
      description: 'Đỡ bóng thật khéo, dọn sạch bầu trời.',
      keywords: 'breakout arkanoid bóng phá gạch cổ điển',
      intro: 'Giữ quả bóng trong cuộc chơi và biến bức tường gạch thành một cơn mưa điểm số.',
      instructions: [
        'Di chuột, kéo trên bàn hoặc dùng A / D, ← / → để di chuyển thanh đỡ.',
        'Nhấn Phóng bóng, Space hoặc chạm bàn để đưa bóng vào cuộc sau khi mất mạng.',
        'Mỗi viên gạch vỡ được 10 điểm. Bạn có 3 mạng để phá đủ 50 viên.',
        'Bóng đập vào mép thanh đỡ sẽ bật theo góc rộng hơn.',
      ],
      variant:
        'Một màn arcade cổ điển với tốc độ bóng tăng dần. Có nút trái, phải để chơi trên điện thoại.',
    },
  ];
  const ids = new Set(games.map((game) => game.id));
  const storageKey = 'tramchoi.library.v1';
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    stored = {};
  }
  if (typeof stored !== 'object' || Array.isArray(stored)) stored = {};
  const favorites = new Set(
    Array.isArray(stored.favorites) ? stored.favorites.filter((id) => ids.has(id)) : [],
  );
  let recent = Array.isArray(stored.recent)
    ? [...new Set(stored.recent.filter((id) => ids.has(id)))].slice(0, 10)
    : [];
  const records = {};
  for (const game of games)
    if (Number.isFinite(stored.records?.[game.id]) && stored.records[game.id] >= 0)
      records[game.id] = Math.min(1000000000, Math.floor(stored.records[game.id]));
  let storageWarning = false;
  function save() {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ favorites: [...favorites], recent, records }),
      );
    } catch {
      if (!storageWarning) {
        storageWarning = true;
        notify('Trình duyệt không cho lưu dữ liệu. Bạn vẫn có thể chơi bình thường.');
      }
    }
  }
  const $ = (selector) => document.querySelector(selector);
  const grid = $('#game-grid'),
    search = $('#search'),
    dialog = $('#player-dialog'),
    stage = $('#game-stage'),
    shell = $('#player-shell'),
    help = $('#game-help');
  const toast = $('#toast');
  let view = 'all',
    filter = 'all',
    sort = 'featured',
    active = null,
    instance = null,
    paused = false,
    helpVisible = true,
    helpPaused = false,
    opener = null,
    pauseFocus = null,
    toastTimer;
  document.querySelectorAll('[data-icon]').forEach((element) => {
    element.innerHTML = Art.icon(element.dataset.icon);
  });
  $('#hero-art').innerHTML = Art.hero();
  $('#together-art').innerHTML =
    `<svg viewBox="0 0 260 230" aria-hidden="true"><g transform="translate(40 31) rotate(12 90 90)">${Art.ludoBoard()}</g></svg>`;

  function notify(message) {
    clearTimeout(toastTimer);
    (dialog.open ? dialog : document.body).append(toast);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2800);
  }
  const normalize = (value) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  function filteredGames() {
    const words = normalize(search.value).split(/\s+/).filter(Boolean);
    const result = games.filter((game) => {
      if (
        (view === 'favorites' && !favorites.has(game.id)) ||
        (view === 'recent' && !recent.includes(game.id))
      )
        return false;
      if (filter !== 'all' && filter !== game.category) return false;
      const haystack = normalize(
        `${game.title} ${game.description} ${game.keywords} ${categories[game.category]}`,
      );
      return words.every((word) => haystack.includes(word));
    });
    if (sort === 'name') result.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
    else if (sort === 'recent' || view === 'recent')
      result.sort(
        (a, b) =>
          (recent.includes(a.id) ? recent.indexOf(a.id) : 99) -
          (recent.includes(b.id) ? recent.indexOf(b.id) : 99),
      );
    return result;
  }
  function favoriteButton(game) {
    const saved = favorites.has(game.id);
    return `<button class="favorite-button ${saved ? 'is-favorite' : ''}" data-favorite="${game.id}" aria-label="${saved ? 'Bỏ' : 'Thêm'} ${game.title} ${saved ? 'khỏi' : 'vào'} yêu thích" aria-pressed="${saved}" title="${saved ? 'Bỏ yêu thích' : 'Thêm yêu thích'}">${Art.icon('heart')}</button>`;
  }
  function renderLibrary() {
    const visible = filteredGames();
    grid.innerHTML = visible
      .map(
        (game) =>
          `<article class="game-card" data-game="${game.id}"><div class="game-cover"><button class="cover-play" data-play="${game.id}" aria-label="Chơi ${game.title}">${Art.cover(game.id)}<span class="cover-hover"><span>${Art.icon('play')}Chơi ngay</span></span></button>${game.badge ? `<span class="cover-label ${game.id === 'delivery' ? 'original' : ''}">${game.id === 'delivery' ? Art.icon('spark') : ''}${game.badge}</span>` : ''}${favoriteButton(game)}</div><div class="game-card-body"><button class="game-card-title" data-play="${game.id}">${game.title}${Art.icon('arrow-up-right')}</button><p class="game-card-description">${game.description}</p><div class="game-card-meta"><span class="category-tag" style="--tag:${categoryColors[game.category]}"><i></i>${categories[game.category]}</span><span class="players-label">${Art.icon('users')}${game.players}</span></div></div></article>`,
      )
      .join('');
    $('#favorite-count').textContent = favorites.size;
    $('#result-count').textContent = visible.length;
    $('#library-title').textContent = search.value.trim()
      ? 'Kết quả tìm kiếm'
      : view === 'favorites'
        ? 'Game yêu thích'
        : view === 'recent'
          ? 'Chơi gần đây'
          : filter === 'all'
            ? 'Tất cả trò chơi'
            : `Game ${categories[filter].toLowerCase()}`;
    $('#breadcrumb-current').textContent =
      view === 'all' ? 'Khám phá' : view === 'favorites' ? 'Yêu thích' : 'Chơi gần đây';
    $('#empty-state').hidden = visible.length > 0;
    const noFavorites = !search.value.trim() && view === 'favorites' && !favorites.size;
    const noRecent = !search.value.trim() && view === 'recent' && !recent.length;
    $('#empty-title').textContent = noFavorites
      ? 'Một góc dành riêng cho game bạn thích'
      : noRecent
        ? 'Cuộc vui đầu tiên đang chờ bạn'
        : 'Chưa tìm thấy game';
    $('#empty-description').textContent = noFavorites
      ? 'Chạm vào trái tim trên một game để lưu vào bộ sưu tập của bạn.'
      : noRecent
        ? 'Mở một game bất kỳ, lần sau bạn sẽ tìm thấy ngay ở đây.'
        : 'Thử một từ khóa khác hoặc chọn thể loại khác nhé.';
    $('#search-announcement').textContent = `${visible.length} game phù hợp.`;
    const exploring = view === 'all' && !search.value.trim();
    $('.welcome').hidden = !exploring;
    $('.highlights').hidden = !exploring;
    $('.surprise-banner').hidden = !exploring;
    document.querySelectorAll('[data-view]').forEach((button) => {
      const selected = button.dataset.view === view;
      button.classList.toggle('active', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-filter]').forEach((button) => {
      const selected = button.dataset.filter === filter;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', selected);
    });
  }
  function updateHelpFavorite() {
    if (!active) return;
    const button = help.querySelector('[data-help-favorite]');
    if (!button) return;
    const saved = favorites.has(active.id);
    button.classList.toggle('is-favorite', saved);
    button.setAttribute('aria-pressed', saved);
    button.innerHTML = `${Art.icon('heart')}${saved ? 'Đã thêm vào yêu thích' : 'Thêm vào yêu thích'}`;
  }
  function toggleFavorite(id) {
    const game = games.find((game) => game.id === id);
    if (!game) return;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    save();
    renderLibrary();
    updateHelpFavorite();
    notify(
      favorites.has(id)
        ? `Đã thêm ${game.title} vào yêu thích`
        : `Đã bỏ ${game.title} khỏi yêu thích`,
    );
    // Restore focus when the list has been rebuilt, including a disappearing favorite.
    if (!dialog.open)
      (
        grid.querySelector(`[data-favorite="${id}"]`) ||
        grid.querySelector('.favorite-button') ||
        $('#clear-filters')
      ).focus({ preventScroll: true });
  }
  function renderHelp(game) {
    help.innerHTML = `<div class="help-cover">${Art.cover(game.id)}</div><h3>Một chút về trò chơi</h3><p>${game.intro}</p><div class="help-label">CHƠI THẾ NÀO?</div><ol>${game.instructions.map((text) => `<li>${text}</li>`).join('')}</ol><p class="help-variant">${game.variant}</p><div class="help-record">${Art.icon('trophy', 28)}<div><small>Kỷ lục trên thiết bị này</small><strong id="game-best">${(records[game.id] || 0).toLocaleString('vi-VN')}</strong><span class="record-unit">điểm</span></div></div><button class="button button-secondary help-favorite" data-help-favorite></button>`;
    updateHelpFavorite();
  }
  function setHelp(value) {
    helpVisible = value;
    shell.classList.toggle('show-help', value);
    shell.classList.toggle('help-hidden', !value);
    $('#help-game').setAttribute('aria-expanded', value);
    if (window.innerWidth <= 800) {
      if (value && !paused) {
        helpPaused = true;
        setPaused(true);
      } else if (!value && helpPaused) {
        helpPaused = false;
        setPaused(false);
      }
    }
  }
  function setPaused(value) {
    if (!instance) return;
    const next = Boolean(value);
    if (next && !paused) pauseFocus = document.activeElement;
    paused = next;
    instance.setPaused?.(paused);
    stage.inert = paused;
    $('#pause-screen').hidden = !paused;
    $('#pause-game').innerHTML = Art.icon(paused ? 'play' : 'pause');
    $('#pause-game').setAttribute('aria-label', paused ? 'Tiếp tục game' : 'Tạm dừng game');
    $('#pause-game').title = paused ? 'Tiếp tục (P)' : 'Tạm dừng (P)';
    if (paused) $('#resume-game').focus({ preventScroll: true });
    else if (pauseFocus?.isConnected && !pauseFocus.disabled)
      pauseFocus.focus({ preventScroll: true });
    else stage.querySelector('.game-workspace')?.focus({ preventScroll: true });
  }
  function restartGame() {
    if (!instance) return;
    helpPaused = false;
    setPaused(false);
    instance.restart();
    (
      stage.querySelector('[data-start]') ||
      stage.querySelector('.game-workspace') ||
      stage.querySelector('iframe')
    )?.focus({ preventScroll: true });
  }
  function iframeControl(frame, action, value) {
    frame.contentWindow?.postMessage(
      { type: 'tramchoi:control', action, value },
      location.protocol === 'file:' ? '*' : location.origin,
    );
  }
  function mountGame(game) {
    if (active?.id === game.id && dialog.open) return;
    if (instance) instance.destroy();
    if (!dialog.open) opener = document.activeElement;
    active = game;
    instance = null;
    paused = false;
    helpPaused = false;
    pauseFocus = null;
    stage.innerHTML = '';
    stage.inert = false;
    $('#pause-screen').hidden = true;
    $('#pause-game').innerHTML = Art.icon('pause');
    $('#pause-game').setAttribute('aria-label', 'Tạm dừng game');
    $('#pause-game').title = 'Tạm dừng (P)';
    $('#player-title').textContent = game.title;
    $('#player-category').textContent = `${categories[game.category]} · ${game.players}`;
    $('#player-footnote').textContent =
      game.id === 'delivery'
        ? 'Delivery Dash · Game nguyên bản của bạn'
        : 'Chơi tại chỗ · Kỷ lục lưu trên thiết bị';
    renderHelp(game);
    helpVisible = window.innerWidth > 800;
    shell.classList.toggle('show-help', helpVisible);
    shell.classList.toggle('help-hidden', !helpVisible);
    $('#help-game').setAttribute('aria-expanded', helpVisible);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
    const onScore = (score) => {
      if (!Number.isFinite(score) || score < 0 || active?.id !== game.id) return;
      score = Math.floor(score);
      if (score > (records[game.id] || 0)) {
        records[game.id] = score;
        save();
        const record = $('#game-best');
        if (record) record.textContent = score.toLocaleString('vi-VN');
      }
    };
    if (game.id === 'delivery') {
      const frame = document.createElement('iframe');
      frame.title = 'Delivery Dash — game giao báo nguyên bản';
      frame.src = 'delivery.html';
      frame.allow = 'fullscreen';
      stage.append(frame);
      frame.addEventListener(
        'load',
        () => {
          if (active?.id === 'delivery') iframeControl(frame, 'pause', paused);
        },
        { once: true },
      );
      instance = {
        frame,
        onScore,
        restart: () => iframeControl(frame, 'restart'),
        setPaused: (value) => iframeControl(frame, 'pause', value),
        destroy: () => frame.remove(),
      };
      frame.focus({ preventScroll: true });
    } else {
      try {
        instance = window.ArcadeGames[game.id](stage, { best: records[game.id] || 0, onScore });
        (
          stage.querySelector('[data-start]') ||
          stage.querySelector('[tabindex="0"]') ||
          stage.querySelector('.game-workspace')
        )?.focus({ preventScroll: true });
      } catch (error) {
        console.error('Không thể mở game:', error);
        stage.innerHTML =
          '<div class="empty-state"><h3>Chưa mở được game</h3><p>Hãy tải lại trang và thử lại nhé.</p></div>';
        notify('Có lỗi khi mở game. Vui lòng tải lại trang.');
      }
    }
    recent = [game.id, ...recent.filter((id) => id !== game.id)].slice(0, 10);
    save();
    renderLibrary();
  }
  function clearGameHash() {
    if (location.hash.startsWith('#play/'))
      history.replaceState(null, '', location.href.split('#')[0]);
  }
  function closeGame(updateHash = true) {
    if (!active && !dialog.open) return;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    const closingId = active?.id;
    instance?.destroy();
    instance = null;
    active = null;
    paused = false;
    helpPaused = false;
    stage.inert = false;
    stage.innerHTML = '';
    $('#pause-screen').hidden = true;
    if (dialog.open) dialog.close();
    document.body.classList.remove('modal-open');
    document.body.append(toast);
    if (updateHash) clearGameHash();
    if (opener?.isConnected && opener !== document.body) opener.focus({ preventScroll: true });
    else
      (
        grid.querySelector(`[data-game="${closingId}"] .cover-play`) || $('[data-play="delivery"]')
      ).focus({ preventScroll: true });
  }
  function playGame(id) {
    if (!ids.has(id)) return;
    const hash = `#play/${id}`;
    if (location.hash === hash) mountGame(games.find((game) => game.id === id));
    else location.hash = hash;
  }
  function syncRoute() {
    if (!location.hash.startsWith('#play/')) {
      closeGame(false);
      return;
    }
    const id = location.hash.slice(6);
    const game = games.find((game) => game.id === id);
    if (game) mountGame(game);
    else {
      closeGame(false);
      clearGameHash();
      notify('Game này chưa có trong thư viện. Hãy chọn một trò khác nhé.');
    }
  }
  function randomGame() {
    let pool = filteredGames();
    if (!pool.length) pool = games;
    if (pool.length > 1) pool = pool.filter((game) => game.id !== (active?.id || recent[0]));
    playGame(pool[Math.floor(Math.random() * pool.length)].id);
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('.brand,.mobile-brand')) {
      event.preventDefault();
      closeGame();
      view = 'all';
      filter = 'all';
      search.value = '';
      sort = 'featured';
      $('#sort').value = 'featured';
      renderLibrary();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const play = event.target.closest('[data-play]');
    if (play) {
      playGame(play.dataset.play);
      return;
    }
    const favorite = event.target.closest('[data-favorite]');
    if (favorite) {
      toggleFavorite(favorite.dataset.favorite);
      return;
    }
    if (event.target.closest('[data-help-favorite]') && active) {
      toggleFavorite(active.id);
      return;
    }
    if (event.target.closest('[data-random]')) {
      randomGame();
      return;
    }
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) {
      view = viewButton.dataset.view;
      filter = 'all';
      search.value = '';
      renderLibrary();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const filterButton = event.target.closest('[data-filter]');
    if (filterButton) {
      filter = filterButton.dataset.filter;
      renderLibrary();
      return;
    }
    const category = event.target.closest('[data-category]');
    if (category) {
      view = 'all';
      filter = category.dataset.category;
      search.value = '';
      renderLibrary();
      $('#library').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  search.addEventListener('input', renderLibrary);
  $('#sort').addEventListener('change', (event) => {
    sort = event.target.value;
    renderLibrary();
  });
  $('#clear-filters').addEventListener('click', () => {
    view = 'all';
    filter = 'all';
    search.value = '';
    sort = 'featured';
    $('#sort').value = 'featured';
    renderLibrary();
    $('#library').scrollIntoView({ block: 'start' });
  });
  $('#close-game').addEventListener('click', () => closeGame());
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeGame();
  });
  $('#pause-game').addEventListener('click', () => setPaused(!paused));
  $('#resume-game').addEventListener('click', () => setPaused(false));
  $('#restart-game').addEventListener('click', restartGame);
  $('#help-game').addEventListener('click', () => setHelp(!helpVisible));
  $('#fullscreen-game').hidden = !document.fullscreenEnabled;
  $('#fullscreen-game').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch {
      notify('Trình duyệt chưa cho phép toàn màn hình. Bạn vẫn có thể chơi ở cửa sổ này.');
    }
  });
  window.addEventListener('hashchange', syncRoute);
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (dialog.open) {
      if (window.ArcadeShared.isTyping(event)) return;
      if (key === 'p' && !event.repeat) {
        event.preventDefault();
        setPaused(!paused);
      }
      if (key === 'r' && !event.repeat) {
        event.preventDefault();
        restartGame();
      }
    } else if (
      (key === '/' && !window.ArcadeShared.isTyping(event)) ||
      ((event.ctrlKey || event.metaKey) && key === 'k')
    ) {
      event.preventDefault();
      search.focus();
      search.select();
    } else if (key === 'escape' && document.activeElement === search) {
      search.value = '';
      renderLibrary();
      search.blur();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dialog.open && !paused) setPaused(true);
  });
  window.addEventListener('message', (event) => {
    const sameOrigin =
      event.origin === location.origin ||
      (location.protocol === 'file:' && event.origin === 'null');
    if (
      !instance?.frame ||
      event.source !== instance.frame.contentWindow ||
      !sameOrigin ||
      !event.data
    )
      return;
    if (event.data.type === 'tramchoi:score' && active?.id === 'delivery')
      instance.onScore(event.data.score);
    if (event.data.type === 'tramchoi:shortcut') {
      if (event.data.action === 'pause') setPaused(!paused);
      if (event.data.action === 'restart') restartGame();
      if (event.data.action === 'close') closeGame();
    }
  });
  renderLibrary();
  syncRoute();
})();
