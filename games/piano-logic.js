(function (root, factory) {
  'use strict'; const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ArcadePiano = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Public-domain melodies, freshly transcribed; no recording or lyrics used.
  const SONGS = [
    { id: 'joy', title: 'Niềm vui', credit: 'Giai điệu Ode to Joy · Beethoven', notes: [64,64,65,67,67,65,64,62,60,60,62,64,[64,1.5],[62,.5],[62,2],64,64,65,67,67,65,64,62,60,60,62,64,[62,1.5],[60,.5],[60,2]] },
    { id: 'star', title: 'Ngôi sao nhỏ', credit: 'Giai điệu dân gian Pháp · thế kỷ XVIII', notes: [60,60,67,67,69,69,[67,2],65,65,64,64,62,62,[60,2],67,67,65,65,64,64,[62,2],67,67,65,65,64,64,[62,2],60,60,67,67,69,69,[67,2],65,65,64,64,62,62,[60,2]] },
    { id: 'breeze', title: 'Gió bên hiên', credit: 'Giai điệu ngũ cung viết riêng cho Trạm Chơi', notes: [60,62,64,67,[69,2],67,64,62,[60,2],62,64,67,69,[72,2],69,67,64,[62,2],64,67,69,72,[74,2],72,69,67,[64,2],67,64,62,60,[62,2],64,62,[60,3]] },
  ];
  const WINDOW = 0.22;
  function createGame(options = {}) {
    const song = SONGS.find(s => s.id === options.song) || SONGS[0], bpm = [60,90,120].includes(options.bpm) ? options.bpm : 90;
    let target = 2, previousLane = -1;
    const notes = song.notes.map((entry, id) => {
      const [pitch, beats] = Array.isArray(entry) ? entry : [entry, 1];
      let lane = (pitch + Math.floor(id / 4)) % 4; if (lane === previousLane) lane = (lane + 1) % 4;
      previousLane = lane;
      const note = { id, pitch, lane, at: target, status: 'pending', beats }; target += beats * 60 / bpm; return note;
    });
    return { song: song.id, bpm, notes, phase: 'play', time: 0, score: 0, combo: 0, bestCombo: 0, hearts: 3, hits: 0, misses: 0, judgment: 'Sẵn sàng…', feedbackUntil: 0, end: notes.at(-1).at + WINDOW };
  }
  function settle(s) {
    if (s.hearts <= 0) { s.phase = 'finished'; s.won = false; }
    else if (s.notes.every(n => n.status !== 'pending')) { s.phase = 'finished'; s.won = true; }
  }
  function miss(s, label) { s.hearts--; s.misses++; s.combo = 0; s.judgment = label; s.feedbackUntil = s.time + .65; }
  function tick(s, dt) {
    if (s.phase !== 'play' || !Number.isFinite(dt) || dt < 0) return;
    s.time += dt;
    for (const note of s.notes) if (note.status === 'pending' && s.time > note.at + WINDOW) {
      note.status = 'miss'; miss(s, 'Lỡ nhịp'); if (s.hearts <= 0) break;
    }
    settle(s);
  }
  function hit(s, lane) {
    if (s.phase !== 'play' || !Number.isInteger(lane) || lane < 0 || lane > 3 || s.time < s.notes[0].at - WINDOW) return { ok: false, ignored: true };
    const note = s.notes.find(n => n.status === 'pending' && n.lane === lane && Math.abs(n.at - s.time) <= WINDOW + 1e-9);
    if (!note) { miss(s, 'Chạm lệch nhịp'); settle(s); return { ok: false }; }
    note.status = 'hit'; s.hits++; s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo);
    const perfect = Math.abs(note.at - s.time) <= .08, multiplier = 1 + Math.min(3, Math.floor((s.combo - 1) / 10));
    const points = (perfect ? 100 : 60) * multiplier; s.score += points;
    s.judgment = `${perfect ? 'Tuyệt!' : 'Đúng nhịp'} +${points}`; s.feedbackUntil = s.time + .6; settle(s);
    return { ok: true, pitch: note.pitch, points, perfect };
  }
  return { SONGS, WINDOW, createGame, tick, hit };
});
