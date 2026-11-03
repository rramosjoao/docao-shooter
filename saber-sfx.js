// Zumbido, whoosh e estalo do sabre. Tudo sintetizado, sem arquivo de áudio.
import { safeExpRamp, safeSet } from './audio.js';

export function createSaberSfx() {
  let actx = null;
  let master = null;
  let noiseBuf = null;
  let humSaw = null;
  let humSine = null;
  let humGainSaw = null;
  let humGainSine = null;

  function stopHum() {
    const oscs = [humSaw, humSine];
    const gains = [humGainSaw, humGainSine];
    humSaw = null;
    humSine = null;
    humGainSaw = null;
    humGainSine = null;
    for (let i = 0; i < oscs.length; i++) {
      const osc = oscs[i];
      if (!osc) continue;
      try { osc.stop(); } catch (e) { /* já parado */ }
      try { osc.disconnect(); } catch (e) { /* já solto */ }
    }
    for (let i = 0; i < gains.length; i++) {
      const gain = gains[i];
      if (!gain) continue;
      try { gain.disconnect(); } catch (e) { /* já solto */ }
    }
  }

  function noiseBuffer() {
    if (noiseBuf) return noiseBuf;
    const len = actx.sampleRate;
    noiseBuf = actx.createBuffer(1, len, len);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  function burst(dur, fromHz, toHz, vol, filterType) {
    if (!actx || !master || !(vol > 0) || !(dur > 0)) return;
    try {
      const t = actx.currentTime;
      const end = t + dur;
      const src = actx.createBufferSource();
      src.buffer = noiseBuffer();
      const filter = actx.createBiquadFilter();
      filter.type = filterType;
      filter.Q.value = 0.8;
      safeSet(filter.frequency, fromHz > 0 ? fromHz : 1, t);
      safeExpRamp(filter.frequency, Math.max(toHz, 1), end);
      const gain = actx.createGain();
      safeSet(gain.gain, vol, t);
      safeExpRamp(gain.gain, 0.001, end);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(t);
      src.stop(end);
    } catch (e) { /* um whoosh falho não cala o zumbido */ }
  }

  function glide(type, fromHz, toHz, dur, vol) {
    if (!actx || !master || !(vol > 0) || !(dur > 0) || !(fromHz > 0)) return;
    try {
      const t = actx.currentTime;
      const end = t + dur;
      const osc = actx.createOscillator();
      osc.type = type;
      safeSet(osc.frequency, fromHz, t);
      safeExpRamp(osc.frequency, Math.max(toHz, 1), end);
      const gain = actx.createGain();
      safeSet(gain.gain, vol, t);
      safeExpRamp(gain.gain, 0.001, end);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(end);
    } catch (e) { /* um tom falho não cala o resto */ }
  }

  function ready() {
    return !!(actx && master);
  }

  return {
    bind(ctx, out) {
      const next = ctx || null;
      if (next !== actx) {
        stopHum();
        noiseBuf = null;
      }
      actx = next;
      master = next ? (out || null) : null;
    },

    hum(on) {
      if (!ready()) {
        if (!on) stopHum();
        return;
      }
      if (!on) {
        stopHum();
        return;
      }
      if (humSaw || humSine) return;

      try {
      const sawGain = actx.createGain();
      sawGain.gain.value = 0.03;
      sawGain.connect(master);
      const saw = actx.createOscillator();
      saw.type = 'sawtooth';
      saw.frequency.value = 70;
      saw.connect(sawGain);

      const sineGain = actx.createGain();
      sineGain.gain.value = 0.012;
      sineGain.connect(master);
      const sine = actx.createOscillator();
      sine.type = 'sine';
      sine.frequency.value = 140;
      sine.connect(sineGain);

      humSaw = saw;
      humSine = sine;
      humGainSaw = sawGain;
      humGainSine = sineGain;
      saw.start();
      sine.start();
      } catch (e) { stopHum(); }
    },

    // Tudo abaixo é oscilador e ruído gerado na hora. Nenhum sample, nenhuma faixa protegida.
    swing(loud = 1) {
      if (!ready()) return;
      const v = Math.max(0.35, Math.min(1.8, loud || 1));
      burst(0.18, 2000, 340, 0.2 * v, 'bandpass');
      glide('sine', 420, 140, 0.18, 0.07 * v);
    },

    clash() {
      if (!ready()) return;
      burst(0.12, 1800, 4200, 0.28, 'highpass');
      glide('sine', 900, 1600, 0.12, 0.14);
    },

    parry(perfect) {
      if (!ready()) return;
      burst(perfect ? 0.16 : 0.08, perfect ? 900 : 1400, perfect ? 3200 : 2200, perfect ? 0.34 : 0.16, 'highpass');
      glide('triangle', perfect ? 520 : 300, perfect ? 1480 : 640, perfect ? 0.16 : 0.08, perfect ? 0.12 : 0.05);
    },

    dash() {
      if (!ready()) return;
      burst(0.14, 500, 180, 0.22, 'lowpass');
      glide('sawtooth', 180, 70, 0.14, 0.05);
    },

    spin() {
      if (!ready()) return;
      burst(0.42, 1600, 280, 0.18, 'bandpass');
      glide('sine', 240, 90, 0.42, 0.06);
    },

    throw() {
      if (!ready()) return;
      burst(0.2, 2400, 400, 0.16, 'bandpass');
      glide('square', 660, 180, 0.2, 0.04);
    },

    catch() {
      if (!ready()) return;
      glide('sine', 880, 220, 0.1, 0.08);
      burst(0.06, 2000, 600, 0.1, 'highpass');
    },

    spinHit() {
      if (!ready()) return;
      burst(0.1, 1200, 3600, 0.2, 'highpass');
    },

    humDrive(k) {
      if (!ready() || !humGainSaw || !humSaw) return;
      try {
      const hot = Math.max(0, Math.min(1, k || 0));
      const t = actx.currentTime;
      humGainSaw.gain.setTargetAtTime(0.02 + hot * 0.05, t, 0.06);
      if (humGainSine) humGainSine.gain.setTargetAtTime(0.01 + hot * 0.02, t, 0.06);
      humSaw.frequency.setTargetAtTime(62 + hot * 36, t, 0.08);
      if (humSine) humSine.frequency.setTargetAtTime(124 + hot * 70, t, 0.08);
      } catch (e) { /* zumbido falho não trava o quadro */ }
    },
  };
}
