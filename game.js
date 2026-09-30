// version v1.0
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const pedalButton = document.getElementById('pedalButton');
const {
  constants,
  clamp,
  lerp,
  smoothstep,
  createGameState,
  resetGameState,
  getAimPreview,
  getTargetMailbox,
  updateGame,
} = window.GameCore;

const {
  TAU,
  ROAD_WIDTH,
  VIEW_DISTANCE,
  COURSE_START,
  LEVEL_END,
} = constants;

const keys = new Set();
const pendingKeyboardThrow = {
  left: false,
  right: false,
  auto: false,
};
const mobile = {
  steering: 0,
  pedal: false,
  pendingThrow: false,
  steerReleased: false,
  activeSteerId: null,
  gestures: new Map(),
  pedalPointers: new Set(),
};

const game = createGameState();
const feedback = {
  text: '',
  detail: '',
  color: '#ffffff',
  time: 0,
};
const onboarding = {
  visible: true,
  time: 3,
};
let activeAimPreview = null;
let highlightedMailbox = null;
let lastTime = 0;
let arcadePaused = false;

function postToArcade(type, data = {}) {
  if (window.parent !== window) {
    window.parent.postMessage({ type, ...data }, location.protocol === 'file:' ? '*' : location.origin);
  }
}

function clearHeldControls() {
  keys.clear();
  mobile.pedalPointers.clear();
  mobile.gestures.clear();
  mobile.pedal = false;
  mobile.steering = 0;
  mobile.steerReleased = true;
  mobile.activeSteerId = null;
  mobile.pendingThrow = false;
  pendingKeyboardThrow.left = false;
  pendingKeyboardThrow.right = false;
  pendingKeyboardThrow.auto = false;
}

window.addEventListener('blur', clearHeldControls);
window.addEventListener('message', (event) => {
  const sameOrigin = event.origin === location.origin || (location.protocol === 'file:' && event.origin === 'null');
  if (event.source !== window.parent || !sameOrigin || event.data?.type !== 'tramchoi:control') return;
  if (event.data.action === 'pause') {
    arcadePaused = Boolean(event.data.value);
    clearHeldControls();
    lastTime = 0;
  }
  if (event.data.action === 'restart') resetGame();
});

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function dismissOnboarding() {
  onboarding.visible = false;
  onboarding.time = 0;
}

function resetGame() {
  keys.clear();
  resetGameState(game);
  feedback.text = '';
  feedback.detail = '';
  feedback.time = 0;
  activeAimPreview = null;
  highlightedMailbox = null;
  onboarding.visible = true;
  onboarding.time = 3;
  mobile.pendingThrow = false;
  pendingKeyboardThrow.left = false;
  pendingKeyboardThrow.right = false;
  pendingKeyboardThrow.auto = false;
  mobile.steering = 0;
  mobile.steerReleased = false;
  mobile.activeSteerId = null;
  mobile.gestures.clear();
  mobile.pedalPointers.clear();
  mobile.pedal = false;
}

window.addEventListener('resize', resize);
resize();

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (window.parent !== window && ['p', 'r', 'escape'].includes(key)) {
    event.preventDefault();
    if (!event.repeat) postToArcade('tramchoi:shortcut', { action: { p: 'pause', r: 'restart', escape: 'close' }[key] });
    return;
  }
  if (arcadePaused) return;
  keys.add(key);
  if (['a', 'd', 'w', 's', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'j', 'k', ' '].includes(key) || event.code === 'Space') {
    dismissOnboarding();
  }
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) || event.code === 'Space') {
    event.preventDefault();
  }
  if (!event.repeat) {
    if (key === 'j') pendingKeyboardThrow.left = true;
    if (key === 'k') pendingKeyboardThrow.right = true;
    if (key === ' ' || event.code === 'Space') pendingKeyboardThrow.auto = true;
  }
  if (key === 'r') resetGame();
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener('pointerdown', (event) => {
  if (event.target === pedalButton) return;
  dismissOnboarding();
  canvas.setPointerCapture?.(event.pointerId);
  mobile.gestures.set(event.pointerId, {
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    moved: false,
    startTime: performance.now(),
  });
});

canvas.addEventListener('pointermove', (event) => {
  const gesture = mobile.gestures.get(event.pointerId);
  if (!gesture) return;

  gesture.lastX = event.clientX;
  gesture.lastY = event.clientY;
  const dx = event.clientX - gesture.startX;
  const dy = event.clientY - gesture.startY;

  if (Math.abs(dx) > 8 || Math.abs(dy) > 8) gesture.moved = true;

  if (mobile.activeSteerId === null || mobile.activeSteerId === event.pointerId) {
    mobile.activeSteerId = event.pointerId;
    mobile.steering = clamp(dx / 90, -1, 1);
    if (Math.abs(mobile.steering) < 0.08) mobile.steering = 0;
  }
});

function finishCanvasPointer(event) {
  const gesture = mobile.gestures.get(event.pointerId);
  if (!gesture) return;

  const duration = performance.now() - gesture.startTime;
  const totalDx = event.clientX - gesture.startX;
  const totalDy = event.clientY - gesture.startY;
  const tapLike = Math.abs(totalDx) < 12 && Math.abs(totalDy) < 12 && duration < 260;

  if (mobile.activeSteerId === event.pointerId) {
    mobile.activeSteerId = null;
    mobile.steering = 0;
    mobile.steerReleased = true;
  }

  if (tapLike) {
    if (game.state === 'playing') {
      mobile.pendingThrow = true;
    } else {
      resetGame();
    }
  }
  mobile.gestures.delete(event.pointerId);
}

canvas.addEventListener('pointerup', finishCanvasPointer);
canvas.addEventListener('pointercancel', finishCanvasPointer);
canvas.addEventListener('pointerleave', (event) => {
  if (event.pointerType !== 'mouse') return;
  finishCanvasPointer(event);
});

function updatePedalState() {
  mobile.pedal = mobile.pedalPointers.size > 0;
}

function pedalPointerDown(event) {
  event.preventDefault();
  event.stopPropagation();
  if (game.state !== 'playing') {
    resetGame();
    return;
  }
  dismissOnboarding();
  pedalButton.setPointerCapture?.(event.pointerId);
  mobile.pedalPointers.add(event.pointerId);
  updatePedalState();
}

function pedalPointerUp(event) {
  event.preventDefault();
  event.stopPropagation();
  mobile.pedalPointers.delete(event.pointerId);
  updatePedalState();
}

pedalButton.addEventListener('pointerdown', pedalPointerDown);
pedalButton.addEventListener('pointerup', pedalPointerUp);
pedalButton.addEventListener('pointercancel', pedalPointerUp);
pedalButton.addEventListener('lostpointercapture', pedalPointerUp);

function buildInput() {
  const keyboardSteering = (keys.has('a') || keys.has('arrowleft') ? -1 : 0) + (keys.has('d') || keys.has('arrowright') ? 1 : 0);
  const keyboardThrottle = (keys.has('w') || keys.has('arrowup') ? 1 : 0) + (keys.has('s') || keys.has('arrowdown') ? -1 : 0);

  const input = {
    steering: keyboardSteering !== 0 ? keyboardSteering : mobile.steering,
    throttle: keyboardThrottle,
    pedal: mobile.pedal,
    stopSteering: mobile.steerReleased,
    throwLeft: pendingKeyboardThrow.left,
    throwRight: pendingKeyboardThrow.right,
    throwAuto: pendingKeyboardThrow.auto || mobile.pendingThrow,
  };

  pendingKeyboardThrow.left = false;
  pendingKeyboardThrow.right = false;
  pendingKeyboardThrow.auto = false;
  mobile.pendingThrow = false;
  mobile.steerReleased = false;
  return input;
}

function cameraAnchors() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    near: { x: w * 0.5, y: h * (w < 700 ? 0.82 : 0.8) },
    far: { x: w * 0.5, y: h * (w < 700 ? 0.13 : 0.16) },
  };
}

function project(worldX, worldZ) {
  const dz = worldZ - game.player.z;
  if (dz < -8 || dz > VIEW_DISTANCE + 25) return null;

  const { near, far } = cameraAnchors();
  const t = clamp(dz / VIEW_DISTANCE, 0, 1);
  const baseX = lerp(near.x, far.x, t);
  const baseY = lerp(near.y, far.y, t);
  const scale = lerp(1.35, 0.23, smoothstep(0, 1, t));

  const dx = far.x - near.x;
  const dy = far.y - near.y;
  const length = Math.hypot(dx, dy) || 1;
  const perpX = -dy / length;
  const perpY = dx / length;
  const lateralScale = window.innerWidth < 700 ? 14.5 : 17.5;
  const roadOffset = worldX * scale * lateralScale;

  return {
    x: baseX + perpX * roadOffset,
    y: baseY + perpY * roadOffset,
    scale,
    depth: dz,
    t,
  };
}

function drawQuad(x1, y1, x2, y2, x3, y3, x4, y4, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawRouteMarker(z, label, color, checkered = false) {
  const left = project(-ROAD_WIDTH * 0.56, z);
  const right = project(ROAD_WIDTH * 0.56, z);
  const center = project(0, z);
  if (!left || !right || !center) return;

  const scale = center.scale;
  const height = Math.max(18, 43 * scale);
  const topLeft = { x: left.x, y: left.y - height };
  const topRight = { x: right.x, y: right.y - height };

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#f5f8fa';
  ctx.lineWidth = Math.max(2, 4 * scale);
  ctx.beginPath();
  ctx.moveTo(left.x, left.y + 3 * scale);
  ctx.lineTo(topLeft.x, topLeft.y);
  ctx.moveTo(right.x, right.y + 3 * scale);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.stroke();

  const segments = checkered ? 8 : 1;
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    ctx.strokeStyle = checkered && i % 2 ? '#ffffff' : color;
    ctx.lineWidth = Math.max(5, 10 * scale);
    ctx.beginPath();
    ctx.moveTo(lerp(topLeft.x, topRight.x, t0), lerp(topLeft.y, topRight.y, t0));
    ctx.lineTo(lerp(topLeft.x, topRight.x, t1), lerp(topLeft.y, topRight.y, t1));
    ctx.stroke();
  }

  const labelX = (topLeft.x + topRight.x) * 0.5;
  const labelY = (topLeft.y + topRight.y) * 0.5 - Math.max(8, 11 * scale);
  ctx.fillStyle = '#10202b';
  ctx.font = `900 ${Math.max(9, 12 * scale)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeText(label, labelX, labelY);
  ctx.fillText(label, labelX, labelY);
  ctx.restore();
}

function drawGround() {
  const step = 3;
  for (let z = 0; z < VIEW_DISTANCE; z += step) {
    const z0 = game.player.z + z;
    const z1 = z0 + step;
    const left0 = project(-22, z0);
    const right0 = project(22, z0);
    const left1 = project(-22, z1);
    const right1 = project(22, z1);
    if (!left0 || !right0 || !left1 || !right1) continue;

    const lawnShade = z0 > COURSE_START ? (Math.floor(z / step) % 2 ? '#4d9d45' : '#47943f') : (Math.floor(z / step) % 2 ? '#64b955' : '#59ad4c');
    drawQuad(left0.x, left0.y, right0.x, right0.y, right1.x, right1.y, left1.x, left1.y, lawnShade);

    const roadL0 = project(-ROAD_WIDTH * 0.5, z0);
    const roadR0 = project(ROAD_WIDTH * 0.5, z0);
    const roadL1 = project(-ROAD_WIDTH * 0.5, z1);
    const roadR1 = project(ROAD_WIDTH * 0.5, z1);
    const leftKerb0 = project(-ROAD_WIDTH * 0.52, z0);
    const leftKerb1 = project(-ROAD_WIDTH * 0.52, z1);
    const rightKerb0 = project(ROAD_WIDTH * 0.52, z0);
    const rightKerb1 = project(ROAD_WIDTH * 0.52, z1);

    const roadColor = z0 > COURSE_START ? '#343b42' : '#454d55';
    drawQuad(roadL0.x, roadL0.y, roadR0.x, roadR0.y, roadR1.x, roadR1.y, roadL1.x, roadL1.y, roadColor);
    drawQuad(roadL0.x, roadL0.y, leftKerb0.x, leftKerb0.y, leftKerb1.x, leftKerb1.y, roadL1.x, roadL1.y, z0 > COURSE_START ? '#ffb23f' : '#f4f7f8');
    drawQuad(rightKerb0.x, rightKerb0.y, roadR0.x, roadR0.y, roadR1.x, roadR1.y, rightKerb1.x, rightKerb1.y, z0 > COURSE_START ? '#ffb23f' : '#f4f7f8');

    if ((Math.floor(z0 / 8) % 2) === 0 && z0 < COURSE_START) {
      const dashL0 = project(-0.15, z0);
      const dashR0 = project(0.15, z0);
      const dashL1 = project(-0.15, z1);
      const dashR1 = project(0.15, z1);
      drawQuad(dashL0.x, dashL0.y, dashR0.x, dashR0.y, dashR1.x, dashR1.y, dashL1.x, dashL1.y, '#f8efb7');
    }

    if (z0 > COURSE_START && (Math.floor((z0 - COURSE_START) / 10) % 2) === 0) {
      const coneL0 = project(-ROAD_WIDTH * 0.36, z0);
      const coneR0 = project(ROAD_WIDTH * 0.36, z0);
      const coneL1 = project(-ROAD_WIDTH * 0.34, z1);
      const coneR1 = project(ROAD_WIDTH * 0.34, z1);
      drawQuad(coneL0.x, coneL0.y, coneR0.x, coneR0.y, coneR1.x, coneR1.y, coneL1.x, coneL1.y, 'rgba(255, 162, 54, 0.12)');
    }
  }
}

function drawHouse(house) {
  const p = project(house.x, house.z);
  if (!p) return;

  const width = house.width * p.scale * 11;
  const height = house.depth * p.scale * 8.5;
  ctx.fillStyle = house.color;
  ctx.fillRect(p.x - width * 0.5, p.y - height, width, height);

  ctx.fillStyle = house.roof;
  ctx.beginPath();
  ctx.moveTo(p.x - width * 0.58, p.y - height);
  ctx.lineTo(p.x, p.y - height - height * 0.38);
  ctx.lineTo(p.x + width * 0.58, p.y - height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  const ww = width * 0.16;
  const wh = height * 0.18;
  ctx.fillRect(p.x - width * 0.24, p.y - height * 0.64, ww, wh);
  ctx.fillRect(p.x + width * 0.08, p.y - height * 0.64, ww, wh);
}

function drawMailbox(mailbox) {
  const p = project(mailbox.x, mailbox.z);
  if (!p) return;
  const scale = p.scale;
  const isTarget = mailbox === highlightedMailbox && !mailbox.hit;
  const pulsePhase = (performance.now() * 0.005) + mailbox.pulse;
  const pulse = 1 + Math.sin(pulsePhase) * (isTarget ? 0.07 : 0.025);

  ctx.save();
  ctx.translate(p.x, p.y);

  ctx.fillStyle = 'rgba(14, 29, 34, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 1.5 * scale, 10 * scale, 3.2 * scale, 0, 0, TAU);
  ctx.fill();

  if (isTarget) {
    const ring = (19 + Math.sin(pulsePhase) * 2.5) * scale;
    ctx.fillStyle = 'rgba(255, 220, 69, 0.14)';
    ctx.beginPath();
    ctx.arc(0, -17 * scale, ring * 1.3, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#ffe45c';
    ctx.lineWidth = Math.max(2, 2.6 * scale);
    ctx.setLineDash([Math.max(3, 5 * scale), Math.max(2, 3 * scale)]);
    ctx.beginPath();
    ctx.arc(0, -17 * scale, ring, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ffe45c';
    ctx.beginPath();
    ctx.moveTo(0, -39 * scale);
    ctx.lineTo(-5 * scale, -47 * scale);
    ctx.lineTo(5 * scale, -47 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.font = `900 ${Math.max(9, 10 * scale)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#17212a';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffe45c';
    ctx.strokeText('MỤC TIÊU', 0, -51 * scale);
    ctx.fillText('MỤC TIÊU', 0, -51 * scale);
  }

  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#65452e';
  ctx.fillRect(-1.8 * scale, -13 * scale, 3.6 * scale, 14 * scale);
  ctx.fillStyle = '#4b3425';
  ctx.fillRect(-6 * scale, -1.5 * scale, 12 * scale, 2.5 * scale);

  ctx.fillStyle = mailbox.hit ? '#75d56d' : '#f7f9fb';
  ctx.strokeStyle = mailbox.hit ? '#348b42' : '#b9c4cc';
  ctx.lineWidth = Math.max(1, 1.3 * scale);
  ctx.beginPath();
  ctx.moveTo(-8 * scale, -25 * scale);
  ctx.quadraticCurveTo(-8 * scale, -31 * scale, -2 * scale, -31 * scale);
  ctx.lineTo(4 * scale, -31 * scale);
  ctx.quadraticCurveTo(9 * scale, -29 * scale, 9 * scale, -24 * scale);
  ctx.lineTo(9 * scale, -15 * scale);
  ctx.lineTo(-8 * scale, -15 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = mailbox.hit ? '#2f9d50' : '#e94f4f';
  ctx.fillRect(-8.5 * scale, -17.5 * scale, 18 * scale, 3 * scale);
  ctx.fillRect(4.5 * scale, -34 * scale, 2 * scale, 11 * scale);
  ctx.fillRect(5.5 * scale, -34 * scale, 7 * scale, 5 * scale);

  if (mailbox.hit) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.max(8, 10 * scale)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('✓', 0, -20 * scale);
  }
  ctx.restore();
}

function drawObstacle(obstacle) {
  const p = project(obstacle.x, obstacle.z);
  if (!p) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  const scale = p.scale;
  const danger = p.depth > 0 && p.depth < 15 && game.state === 'playing';

  ctx.fillStyle = danger ? 'rgba(255, 83, 72, 0.2)' : 'rgba(10, 20, 24, 0.23)';
  ctx.beginPath();
  ctx.ellipse(0, 2 * scale, (danger ? 15 : 11) * scale, (danger ? 6 : 4) * scale, 0, 0, TAU);
  ctx.fill();
  if (danger) {
    ctx.strokeStyle = 'rgba(255, 112, 92, 0.85)';
    ctx.lineWidth = Math.max(1.5, 2 * scale);
    ctx.beginPath();
    ctx.ellipse(0, 1.5 * scale, 15 * scale, 6 * scale, 0, 0, TAU);
    ctx.stroke();
  }

  if (obstacle.type === 'trash') {
    ctx.fillStyle = obstacle.hitFlash ? '#ffe36d' : '#81909d';
    ctx.strokeStyle = '#3e4b54';
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.fillRect(-7 * scale, -16 * scale, 14 * scale, 16 * scale);
    ctx.strokeRect(-7 * scale, -16 * scale, 14 * scale, 16 * scale);
    ctx.fillStyle = '#5f6d78';
    ctx.fillRect(-9 * scale, -18 * scale, 18 * scale, 4 * scale);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(-3.5 * scale, -13 * scale, 2 * scale, 10 * scale);
  } else if (obstacle.type === 'dog') {
    ctx.fillStyle = obstacle.hitFlash ? '#ffe36d' : '#9a633e';
    ctx.strokeStyle = '#503521';
    ctx.lineWidth = Math.max(1, 1.2 * scale);
    ctx.beginPath();
    ctx.ellipse(-1 * scale, -8 * scale, 10 * scale, 6.5 * scale, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(8 * scale, -14 * scale, 5.5 * scale, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#59361f';
    ctx.beginPath();
    ctx.moveTo(6 * scale, -18 * scale);
    ctx.lineTo(8 * scale, -25 * scale);
    ctx.lineTo(11 * scale, -18 * scale);
    ctx.fill();
    ctx.fillRect(-8 * scale, -4 * scale, 2.5 * scale, 7 * scale);
    ctx.fillRect(3 * scale, -4 * scale, 2.5 * scale, 7 * scale);
    ctx.fillStyle = '#17191c';
    ctx.beginPath();
    ctx.arc(11 * scale, -15 * scale, 1.2 * scale, 0, TAU);
    ctx.fill();
  } else if (obstacle.type === 'pothole') {
    ctx.fillStyle = '#171c21';
    ctx.strokeStyle = '#717980';
    ctx.lineWidth = Math.max(1.5, 2 * scale);
    ctx.beginPath();
    ctx.ellipse(0, 0, 12 * scale, 6.5 * scale, -0.12, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(-2 * scale, -1.5 * scale, 5 * scale, 1.6 * scale, -0.12, 0, TAU);
    ctx.fill();
  } else if (obstacle.type === 'cone') {
    ctx.fillStyle = '#ff8a24';
    ctx.strokeStyle = '#a94318';
    ctx.lineWidth = Math.max(1, 1.3 * scale);
    ctx.beginPath();
    ctx.moveTo(0, -21 * scale);
    ctx.lineTo(-9 * scale, 0);
    ctx.lineTo(9 * scale, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff8df';
    ctx.fillRect(-6.5 * scale, -10 * scale, 13 * scale, 3.5 * scale);
    ctx.fillStyle = '#d75f1e';
    ctx.fillRect(-11 * scale, 0, 22 * scale, 3 * scale);
  } else if (obstacle.type === 'barrier') {
    ctx.fillStyle = '#e0544f';
    ctx.strokeStyle = '#7b2f2c';
    ctx.lineWidth = Math.max(1, 1.3 * scale);
    ctx.fillRect(-19 * scale, -13 * scale, 38 * scale, 12 * scale);
    ctx.strokeRect(-19 * scale, -13 * scale, 38 * scale, 12 * scale);
    ctx.fillStyle = '#fff5df';
    for (let x = -17; x < 17; x += 10) {
      ctx.save();
      ctx.translate(x * scale, -7 * scale);
      ctx.rotate(-0.55);
      ctx.fillRect(-2 * scale, -7 * scale, 4 * scale, 14 * scale);
      ctx.restore();
    }
    ctx.fillStyle = '#553a29';
    ctx.fillRect(-14 * scale, -1 * scale, 3.5 * scale, 9 * scale);
    ctx.fillRect(10.5 * scale, -1 * scale, 3.5 * scale, 9 * scale);
  }

  ctx.restore();
}

function drawTrajectory() {
  if (!activeAimPreview?.mailbox) return;

  const screenPoints = [];
  for (const point of activeAimPreview.points) {
    const p = project(point.x, point.z);
    if (!p) continue;
    screenPoints.push({ x: p.x, y: p.y - point.y * p.scale * 14, scale: p.scale });
  }
  if (screenPoints.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([8, 8]);
  ctx.lineDashOffset = -(performance.now() * 0.02) % 16;
  ctx.beginPath();
  ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
  for (let i = 1; i < screenPoints.length; i++) {
    ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
  }
  ctx.strokeStyle = 'rgba(17, 28, 34, 0.55)';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#ffe65c';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 2; i < screenPoints.length - 1; i += 3) {
    const point = screenPoints[i];
    ctx.fillStyle = '#fff9ce';
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(2.2, point.scale * 3.2), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawPaper(paper) {
  const p = project(paper.x, paper.z);
  if (!p) return;
  ctx.save();
  ctx.translate(p.x, p.y - paper.y * p.scale * 14 - 7 * p.scale);
  ctx.rotate(paper.age * 12);
  const s = Math.max(4, 6.5 * p.scale);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 5;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2a3a46';
  ctx.lineWidth = 1.2;
  ctx.fillRect(-s, -s * 0.65, s * 2, s * 1.3);
  ctx.strokeRect(-s, -s * 0.65, s * 2, s * 1.3);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#8eb2c7';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-s * 0.65, -s * 0.2);
  ctx.lineTo(s * 0.65, -s * 0.2);
  ctx.moveTo(-s * 0.65, s * 0.2);
  ctx.lineTo(s * 0.35, s * 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawParticle(particle) {
  const p = project(particle.x, particle.z);
  if (!p) return;
  ctx.fillStyle = particle.color;
  const size = Math.max(1, particle.size * p.scale * 50);
  ctx.globalAlpha = clamp(particle.life / 0.8, 0, 1);
  ctx.beginPath();
  ctx.arc(p.x, p.y - size, size, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  const p = project(game.player.x, game.player.z + 2);
  if (!p) return;
  const flash = game.player.invuln > 0 && Math.floor(performance.now() * 0.02) % 2 === 0;
  const scale = window.innerWidth < 700 ? 1.18 : 1.38;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(game.player.tilt * 0.28);
  ctx.globalAlpha = flash ? 0.42 : 1;

  ctx.fillStyle = 'rgba(12, 23, 28, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 5 * scale, 21 * scale, 7 * scale, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = '#111820';
  ctx.lineWidth = 3.2 * scale;
  ctx.beginPath();
  ctx.arc(-11 * scale, 0, 8 * scale, 0, TAU);
  ctx.arc(11 * scale, 0, 8 * scale, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = '#d8e1e7';
  ctx.lineWidth = 1.1 * scale;
  ctx.beginPath();
  ctx.arc(-11 * scale, 0, 5.5 * scale, 0, TAU);
  ctx.arc(11 * scale, 0, 5.5 * scale, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = '#ffc928';
  ctx.lineWidth = 3 * scale;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-11 * scale, 0);
  ctx.lineTo(-2 * scale, -11 * scale);
  ctx.lineTo(7 * scale, 0);
  ctx.lineTo(-11 * scale, 0);
  ctx.moveTo(-2 * scale, -11 * scale);
  ctx.lineTo(11 * scale, 0);
  ctx.lineTo(7 * scale, -13 * scale);
  ctx.stroke();

  ctx.fillStyle = '#197fc0';
  ctx.strokeStyle = '#0c456b';
  ctx.lineWidth = 1.4 * scale;
  roundedRectPath(-6 * scale, -26 * scale, 12 * scale, 15 * scale, 3 * scale);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f4bd63';
  ctx.beginPath();
  ctx.arc(0, -32 * scale, 6 * scale, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ef4f43';
  ctx.beginPath();
  ctx.arc(0, -34 * scale, 6.4 * scale, Math.PI, TAU);
  ctx.lineTo(7 * scale, -33 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f7f1dc';
  ctx.strokeStyle = '#a94c3c';
  ctx.lineWidth = 1.2 * scale;
  ctx.fillRect(7 * scale, -24 * scale, 9 * scale, 12 * scale);
  ctx.strokeRect(7 * scale, -24 * scale, 9 * scale, 12 * scale);

  ctx.fillStyle = '#ffe45c';
  ctx.beginPath();
  ctx.arc(19 * scale, -7 * scale, 3.5 * scale, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function showFeedback(text, detail, color) {
  feedback.text = text;
  feedback.detail = detail;
  feedback.color = color;
  feedback.time = 1.65;
}

function drawFeedback(w) {
  if (feedback.time <= 0 || game.state !== 'playing') return;

  const alpha = clamp(feedback.time / 0.3, 0, 1);
  const panelW = Math.min(310, w - 24);
  const panelX = (w - panelW) * 0.5;
  const panelY = window.innerWidth < 700 ? 152 : 26;

  ctx.save();
  ctx.globalAlpha = alpha;
  roundedRectPath(panelX, panelY, panelW, 66, 14);
  ctx.fillStyle = 'rgba(9, 20, 29, 0.9)';
  ctx.fill();
  ctx.strokeStyle = feedback.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = feedback.color;
  ctx.textAlign = 'center';
  ctx.font = '900 17px Inter, sans-serif';
  ctx.fillText(feedback.text, w * 0.5, panelY + 27);
  ctx.fillStyle = '#eaf3f8';
  ctx.font = '600 12px Inter, sans-serif';
  ctx.fillText(feedback.detail, w * 0.5, panelY + 49);
  ctx.restore();
}

function drawUI() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const compact = w < 700;
  const panelW = compact ? 180 : 250;
  const panelH = compact ? 132 : 156;
  const panelX = w - panelW - (compact ? 10 : 18);
  const panelY = compact ? 10 : 18;
  const phaseColor = game.player.z >= COURSE_START ? '#ffad42' : '#50d890';
  const phaseName = game.player.z >= COURSE_START ? 'CHẶNG CHƯỚNG NGẠI' : 'KHU DÂN CƯ';
  const totalMailboxes = game.mailboxes.length;

  roundedRectPath(panelX, panelY, panelW, panelH, 14);
  ctx.fillStyle = 'rgba(7, 18, 29, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = phaseColor;
  roundedRectPath(panelX, panelY, panelW, 7, 7);
  ctx.fill();
  ctx.fillStyle = '#a8c2d2';
  ctx.font = `800 ${compact ? 9 : 10}px Inter, sans-serif`;
  ctx.fillText(phaseName, panelX + 14, panelY + 25);

  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${compact ? 23 : 28}px Inter, sans-serif`;
  ctx.fillText(`${game.delivered}/${totalMailboxes}`, panelX + 14, panelY + (compact ? 52 : 58));
  ctx.fillStyle = '#b9cfdb';
  ctx.font = `700 ${compact ? 9 : 10}px Inter, sans-serif`;
  ctx.fillText('ĐÃ GIAO', panelX + 14, panelY + (compact ? 67 : 74));

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe064';
  ctx.font = `900 ${compact ? 17 : 20}px Inter, sans-serif`;
  ctx.fillText(game.score.toLocaleString('vi-VN'), panelX + panelW - 14, panelY + (compact ? 51 : 57));
  ctx.fillStyle = '#b9cfdb';
  ctx.font = `700 ${compact ? 9 : 10}px Inter, sans-serif`;
  ctx.fillText('ĐIỂM', panelX + panelW - 14, panelY + (compact ? 67 : 74));
  ctx.textAlign = 'left';

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(panelX + 14, panelY + (compact ? 78 : 88));
  ctx.lineTo(panelX + panelW - 14, panelY + (compact ? 78 : 88));
  ctx.stroke();

  const statY = panelY + (compact ? 101 : 115);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${compact ? 12 : 14}px Inter, sans-serif`;
  ctx.fillText(`▤  ${game.player.papersLeft}`, panelX + 14, statY);
  ctx.fillStyle = '#dce9f0';
  ctx.font = `600 ${compact ? 9 : 11}px Inter, sans-serif`;
  ctx.fillText('TỜ BÁO', panelX + 14, statY + 16);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ff6f6f';
  ctx.font = `900 ${compact ? 14 : 17}px Inter, sans-serif`;
  ctx.fillText('♥'.repeat(Math.max(0, game.player.hearts)) || '—', panelX + panelW - 14, statY);
  ctx.fillStyle = game.player.collisionRecovery > 0 ? '#63e5ad' : '#dce9f0';
  ctx.font = `700 ${compact ? 9 : 11}px Inter, sans-serif`;
  ctx.fillText(game.player.collisionRecovery > 0 ? 'ĐANG AN TOÀN' : 'MẠNG', panelX + panelW - 14, statY + 16);
  ctx.textAlign = 'left';

  const barX = compact ? 14 : 20;
  const barY = h - 29;
  const barW = compact ? Math.max(140, w - 136) : Math.min(430, w - 40);
  roundedRectPath(barX, barY, barW, 13, 7);
  ctx.fillStyle = 'rgba(7, 18, 25, 0.68)';
  ctx.fill();
  const progress = clamp(game.player.z / LEVEL_END, 0, 1);
  if (progress > 0.005) {
    roundedRectPath(barX, barY, Math.max(10, barW * progress), 13, 7);
    ctx.fillStyle = '#ffd94f';
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.42)';
  ctx.lineWidth = 1;
  roundedRectPath(barX, barY, barW, 13, 7);
  ctx.stroke();

  const courseX = barX + barW * (COURSE_START / LEVEL_END);
  ctx.fillStyle = '#ff9b3d';
  ctx.beginPath();
  ctx.arc(courseX, barY + 6.5, 4.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${compact ? 9 : 10}px Inter, sans-serif`;
  ctx.fillText(`${Math.round(progress * 100)}%`, barX, barY - 7);
  ctx.textAlign = 'right';
  ctx.fillText('ĐÍCH', barX + barW, barY - 7);
  ctx.textAlign = 'left';

  if (onboarding.visible && game.state === 'playing') {
    if (compact) {
      const introW = Math.max(170, w - 132);
      const introX = 12;
      const introY = h - 144;
      roundedRectPath(introX, introY, introW, 78, 13);
      ctx.fillStyle = 'rgba(7, 18, 29, 0.88)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 226, 86, 0.55)';
      ctx.stroke();
      ctx.fillStyle = '#ffe45c';
      ctx.font = '900 12px Inter, sans-serif';
      ctx.fillText('GIAO BÁO VÀO HỘP THƯ', introX + 12, introY + 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText('Kéo trên đường để lái', introX + 12, introY + 43);
      ctx.fillText('Chạm để ném khi thấy MỤC TIÊU', introX + 12, introY + 62);
    } else {
      const introW = Math.min(610, w - 40);
      const introX = (w - introW) * 0.5;
      const introY = h - 124;
      roundedRectPath(introX, introY, introW, 68, 14);
      ctx.fillStyle = 'rgba(7, 18, 29, 0.86)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 226, 86, 0.45)';
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe45c';
      ctx.font = '900 14px Inter, sans-serif';
      ctx.fillText('SPACE để ném khi hộp thư hiện “MỤC TIÊU”', w * 0.5, introY + 27);
      ctx.fillStyle = '#eaf3f8';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillText('Đi theo đường chấm vàng • Lái tránh thùng rác, ổ gà và chó', w * 0.5, introY + 49);
      ctx.textAlign = 'left';
    }
  }

  drawFeedback(w);

  if (game.state === 'won' || game.state === 'failed') {
    ctx.fillStyle = 'rgba(4, 10, 16, 0.58)';
    ctx.fillRect(0, 0, w, h);

    const resultW = Math.min(520, w - 24);
    const resultH = compact ? 244 : 260;
    const resultX = (w - resultW) * 0.5;
    const resultY = (h - resultH) * 0.5;
    const accent = game.state === 'won' ? '#5ce09a' : '#ff6d68';
    roundedRectPath(resultX, resultY, resultW, resultH, 20);
    ctx.fillStyle = 'rgba(8, 20, 30, 0.97)';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `900 ${compact ? 26 : 32}px Inter, sans-serif`;
    ctx.fillText(game.state === 'won' ? 'HOÀN THÀNH TUYẾN!' : 'BẠN ĐÃ NGÃ XE!', w * 0.5, resultY + 50);
    ctx.fillStyle = '#c8dce7';
    ctx.font = `600 ${compact ? 12 : 14}px Inter, sans-serif`;
    ctx.fillText(game.state === 'won' ? 'Bạn đã về đích an toàn.' : 'Hết mạng trước khi tới đích.', w * 0.5, resultY + 76);

    const attempts = game.delivered + game.missed;
    const accuracy = attempts > 0 ? Math.round((game.delivered / attempts) * 100) : 0;
    const statTop = resultY + 99;
    const columnW = resultW / 3;
    const resultStats = [
      [game.delivered, 'ĐÃ GIAO'],
      [`${accuracy}%`, 'CHÍNH XÁC'],
      [game.score, 'ĐIỂM'],
    ];
    for (let i = 0; i < resultStats.length; i++) {
      const x = resultX + columnW * (i + 0.5);
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.moveTo(resultX + columnW * i, statTop);
        ctx.lineTo(resultX + columnW * i, statTop + 61);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${compact ? 22 : 26}px Inter, sans-serif`;
      ctx.fillText(resultStats[i][0], x, statTop + 28);
      ctx.fillStyle = '#9eb9c8';
      ctx.font = `700 ${compact ? 9 : 10}px Inter, sans-serif`;
      ctx.fillText(resultStats[i][1], x, statTop + 49);
    }

    roundedRectPath(resultX + 24, resultY + resultH - 58, resultW - 48, 38, 10);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.fillStyle = '#10202a';
    ctx.font = `900 ${compact ? 12 : 13}px Inter, sans-serif`;
    ctx.fillText('NHẤN R HOẶC CHẠM MÀN HÌNH ĐỂ CHƠI LẠI', w * 0.5, resultY + resultH - 34);
    ctx.textAlign = 'left';
  }
}

function render() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  skyGrad.addColorStop(0, '#73c4ff');
  skyGrad.addColorStop(0.42, '#c6ebff');
  skyGrad.addColorStop(0.4201, '#75c967');
  skyGrad.addColorStop(1, '#59ab4c');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  const preferredSide = keys.has('j') ? -1 : keys.has('k') ? 1 : 0;
  activeAimPreview = getAimPreview(game, preferredSide);
  highlightedMailbox = game.player.papersLeft > 0 ? getTargetMailbox(game, preferredSide) : null;
  if (!activeAimPreview?.mailbox) activeAimPreview = null;

  drawGround();
  drawTrajectory();

  const drawables = [
    { z: COURSE_START, fn: () => drawRouteMarker(COURSE_START, 'CHƯỚNG NGẠI', '#ff9b3d') },
    { z: LEVEL_END, fn: () => drawRouteMarker(LEVEL_END, 'VỀ ĐÍCH', '#202830', true) },
  ];
  for (const house of game.houses) drawables.push({ z: house.z, fn: () => drawHouse(house) });
  for (const mailbox of game.mailboxes) drawables.push({ z: mailbox.z, fn: () => drawMailbox(mailbox) });
  for (const obstacle of game.obstacles) drawables.push({ z: obstacle.z, fn: () => drawObstacle(obstacle) });
  for (const paper of game.papers) drawables.push({ z: paper.z, fn: () => drawPaper(paper) });
  for (const particle of game.particles) drawables.push({ z: particle.z, fn: () => drawParticle(particle) });

  drawables.sort((a, b) => b.z - a.z);
  for (const item of drawables) item.fn();

  drawPlayer();
  drawUI();
}

function frame(timestamp) {
  if (arcadePaused || document.hidden) {
    lastTime = timestamp;
    requestAnimationFrame(frame);
    return;
  }
  const dt = Math.min(0.033, (timestamp - lastTime) / 1000 || 0.016);
  lastTime = timestamp;

  const previousZ = game.player.z;
  const previousDelivered = game.delivered;
  const previousMissed = game.missed;
  const previousCrashes = game.crashes;
  const previousScore = game.score;
  feedback.time = Math.max(0, feedback.time - dt);
  if (onboarding.visible && game.state === 'playing') {
    onboarding.time = Math.max(0, onboarding.time - dt);
    if (onboarding.time <= 0) onboarding.visible = false;
  }

  updateGame(game, dt, buildInput());

  if (game.crashes > previousCrashes) {
    showFeedback('VA CHẠM!', `Còn ${Math.max(0, game.player.hearts)} mạng — đang được bảo vệ`, '#ff7770');
  } else if (game.delivered > previousDelivered) {
    showFeedback('GIAO THÀNH CÔNG!', '+100 điểm', '#61e6a2');
  } else if (game.missed > previousMissed) {
    showFeedback('NÉM TRƯỢT', 'Chờ đường ngắm vàng khóa vào hộp thư', '#ffbb55');
  } else if (previousZ < COURSE_START && game.player.z >= COURSE_START) {
    showFeedback('CHẶNG CHƯỚNG NGẠI', 'Tập trung né cọc tiêu, rào chắn và chó', '#ffad42');
  }

  if (game.score !== previousScore) postToArcade('tramchoi:score', { score: game.score });
  render();
  requestAnimationFrame(frame);
}

resetGame();
requestAnimationFrame(frame);
