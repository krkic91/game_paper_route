// version v1.0
/* Locally synthesized cycling sounds; one audio graph per mounted race. */
(function () {
  'use strict';
  window.createRaceAudio = function (scope) {
    let context, master, wind, rolling, chain, tone, enabled = true, disposed = false, lastEvent = 0;
    const sources = [];
    function gain(value = 0) {
      const node = context.createGain(); node.gain.value = value; return node;
    }
    function noise(filterType, frequency) {
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
      const filter = context.createBiquadFilter(); filter.type = filterType; filter.frequency.value = frequency;
      const volume = gain(); source.connect(filter); filter.connect(volume); volume.connect(master);
      source.start(); sources.push(source); return { filter, volume };
    }
    function smooth(param, value, seconds = .12) {
      if (context) param.setTargetAtTime(value, context.currentTime, seconds);
    }
    function silence() { if (master) smooth(master.gain, 0, .025); }
    function unlock() {
      if (disposed || !enabled) return;
      try {
        if (!context) {
          const Audio = window.AudioContext || window.webkitAudioContext;
          if (!Audio) return;
          context = new Audio(); master = gain(); master.connect(context.destination);
          wind = noise('lowpass', 500); rolling = noise('highpass', 1200);
          chain = gain(); tone = context.createOscillator(); tone.type = 'triangle';
          tone.frequency.value = 65; tone.connect(chain); chain.connect(master); tone.start(); sources.push(tone);
        }
        if (context.state === 'suspended') context.resume().catch(() => {});
      } catch { /* Sound is optional when the browser has no audio output. */ }
    }
    function update(state, active) {
      if (!context || !master) return;
      if (!enabled || !active || scope.paused || document.hidden) { silence(); return; }
      smooth(master.gain, .34);
      const speed = Math.min(1, state.speed / 20);
      smooth(wind.volume.gain, speed * speed * .16);
      smooth(wind.filter.frequency, 300 + speed * 1300);
      const rough = state.surface === 'gravel' || state.surface === 'shoulder';
      const wet = state.surface === 'wet' || state.event?.type === 'puddle' && state.time - state.event.time < .7;
      smooth(rolling.volume.gain, speed * (rough ? .065 : wet ? .04 : .012));
      smooth(rolling.filter.frequency, rough ? 400 : wet ? 2200 : 1200);
      smooth(tone.frequency, 42 + state.cadence * .8);
      smooth(chain.gain, state.effort > .01 ? (.008 + .004 * Math.sin(state.pedalPhase * 2)) * state.effort : .002 * speed);
      if (state.event?.id !== lastEvent) {
        lastEvent = state.event?.id;
        if (['cone', 'rider'].includes(state.event?.type) && state.time - state.event.time < .2) {
          // Reuse the rolling channel for a brief impact; no unowned transient nodes.
          rolling.volume.gain.cancelScheduledValues(context.currentTime);
          rolling.volume.gain.setValueAtTime(.13, context.currentTime);
          rolling.volume.gain.setTargetAtTime(.015, context.currentTime + .02, .06);
        }
      }
    }
    scope.onPause(silence);
    scope.on(document, 'visibilitychange', () => { if (document.hidden) silence(); }, true);
    scope.on(window, 'blur', silence, true);
    scope.cleanup(() => {
      disposed = true;
      for (const source of sources) { try { source.stop(); source.disconnect(); } catch {} }
      if (context && context.state !== 'closed') context.close().catch(() => {});
    });
    return { unlock, update, silence, setEnabled(value) { enabled = Boolean(value); if (enabled) unlock(); else silence(); } };
  };
})();
