(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeliveryGuide = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  function aimStatus(game, side, core) {
    if (game.state !== 'playing') return { kind: 'finished', text: 'Đã kết thúc', blocked: true };
    if (game.player.papersLeft <= 0) return { kind: 'empty', text: 'Hết báo', blocked: true };
    if (game.player.throwCooldown > 0) return { kind: 'cooldown', text: 'Đang lấy báo…', blocked: true };
    if (core.getTargetMailbox(game, side)) return { kind: 'ready', text: 'Trong tầm · ném ngay', blocked: false };
    if (game.papers.some(p => p.targetMailbox && (!side || p.targetMailbox.side === side)))
      return { kind: 'flying', text: 'Báo đang bay tới', blocked: false };
    const upcoming = game.mailboxes.some(m => !m.hit && m.z - game.player.z >= 3 && (!side || m.side === side));
    return upcoming ? { kind: 'range', text: 'Chờ hộp thư vào tầm', blocked: false }
      : { kind: 'clear', text: 'Không còn hộp thư phía trước', blocked: false };
  }
  function updateButton(button, game, side, core, inactive = false) {
    const status = aimStatus(game, side, core);
    button.dataset.aim = status.kind;
    button.disabled = inactive || status.blocked;
    const label = button.querySelector('[data-aim-label]');
    const text = inactive ? 'Chờ bắt đầu / tiếp tục' : status.text;
    if (label && label.textContent !== text) label.textContent = text;
    return status;
  }
  return { aimStatus, updateButton };
});
