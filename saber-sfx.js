// Zumbido, whoosh e estalo do sabre. Tudo sintetizado, sem arquivo de áudio.

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
    const t = actx.currentTime;
    const src = actx.createBufferSource();
    src.buffer = noiseBuffer();
    const filter = actx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(fromHz, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(toHz, 1), t + dur);
    const gain = actx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + dur);
  }

  function glide(type, fromHz, toHz, dur, vol) {
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(fromHz, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(toHz, 1), t + dur);
    const gain = actx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur);
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
    },

    swing() {
      if (!ready()) return;
      burst(0.18, 2000, 340, 0.2, 'bandpass');
      glide('sine', 420, 140, 0.18, 0.07);
    },

    clash() {
      if (!ready()) return;
      burst(0.12, 1800, 4200, 0.28, 'highpass');
      glide('sine', 900, 1600, 0.12, 0.14);
    },
  };
}
