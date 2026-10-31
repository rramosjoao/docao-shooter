// ============================================================
//  Modo Invasão 🎃: trilha de terror procedural (Web Audio, sem arquivos) — mesmo jeito dos sons sintetizados do jogo.
//  Drone grave dissonante (trítono) com filtro "respirando" · pulso de coração (tum-tum) · stabs dissonantes (cluster de 2ª menor)
//  · no chefão: guincho agudo com tremolo. Intensidade: 0 pausa (calma), 1 wave, 2 chefão. Passa pelo master do jogo (mute do menu vale).
// ============================================================
const LEVELS = [
  { bpm: 52, drone: 0.22, cut: 260, stab: 0.06, screech: 0, beat: 0.55 }, // pausa/preparação: calmo
  { bpm: 84, drone: 0.3, cut: 520, stab: 0.22, screech: 0, beat: 0.8 }, // wave
  { bpm: 118, drone: 0.38, cut: 900, stab: 0.5, screech: 0.05, beat: 1.0 }, // chefão
];
export function createInvMusic(actx, dest) {
  let out = null, nodes = [], level = 0, next = 0, beat = 0, on = false, lfo = null, filt = null, droneG = null, screechG = null;
  const ramp = (p, v, t = 1.2) => { const n = actx.currentTime; p.cancelScheduledValues(n); p.setValueAtTime(p.value, n); p.linearRampToValueAtTime(v, n + t); };
  function osc(type, f, g, to, detune = 0) { const o = actx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; const gg = actx.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(to); o.start(); nodes.push(o); return o; }
  function start() {
    if (on || !actx) return; on = true; level = 0;
    out = actx.createGain(); out.gain.value = 0; out.connect(dest); ramp(out.gain, 0.55, 2.5);
    // drone: Lá grave + trítono (Ré#) levemente desafinados, num passa-baixa que abre e fecha devagar
    filt = actx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = LEVELS[0].cut; filt.Q.value = 6;
    droneG = actx.createGain(); droneG.gain.value = LEVELS[0].drone; filt.connect(droneG); droneG.connect(out);
    osc('sawtooth', 55, 0.5, filt, -7); osc('sawtooth', 55, 0.5, filt, 6); osc('sawtooth', 77.78, 0.32, filt, 3); osc('sine', 27.5, 0.9, droneG);
    lfo = actx.createOscillator(); lfo.frequency.value = 0.07; const lg = actx.createGain(); lg.gain.value = 140; lfo.connect(lg); lg.connect(filt.frequency); lfo.start(); nodes.push(lfo);
    // guincho do chefão: dois senos agudos em trítono com tremolo
    screechG = actx.createGain(); screechG.gain.value = 0; screechG.connect(out);
    const trem = actx.createGain(); trem.gain.value = 0.5; trem.connect(screechG);
    osc('sine', 880, 0.5, trem); osc('sine', 1244.5, 0.35, trem);
    const tl = actx.createOscillator(); tl.frequency.value = 7; const tg = actx.createGain(); tg.gain.value = 0.5; tl.connect(tg); tg.connect(trem.gain); tl.start(); nodes.push(tl);
    next = actx.currentTime + 0.3; beat = 0;
  }
  function stop(fade = 1.5) {
    if (!on) return; on = false; const o = out, ns = nodes; nodes = []; out = null;
    ramp(o.gain, 0, fade); setTimeout(() => { for (const n of ns) { try { n.stop(); } catch (e) { /* */ } } o.disconnect(); }, fade * 1000 + 200);
  }
  function setLevel(l) {
    l = Math.max(0, Math.min(2, l | 0)); if (!on || l === level) return; level = l; const L = LEVELS[l];
    ramp(droneG.gain, L.drone, 2); ramp(filt.frequency, L.cut, 2.5); ramp(screechG.gain, L.screech, 3);
  }
  // batida "tum-tum" (seno que cai de 70 → 38 Hz) + estalo grave
  function thump(t, v) {
    const o = actx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
    const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3);
  }
  // stab dissonante: cluster de 2ª menor (+ trítono) com ataque seco e cauda curta
  function stab(t, v) {
    const roots = [220, 233.08, 207.65, 311.13], r = roots[Math.floor(Math.random() * roots.length)];
    const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = r * 3; f.Q.value = 1.4;
    const g = actx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7); f.connect(g); g.connect(out);
    for (const m of [1, 1.0595, 1.4142, 2.1189]) { const o = actx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(r * m, t); o.frequency.linearRampToValueAtTime(r * m * 0.97, t + 0.7); o.connect(f); o.start(t); o.stop(t + 0.75); }
  }
  // chamado a cada quadro: agenda as batidas com ~0,25 s de antecedência
  function tick() {
    if (!on || !out) return; const L = LEVELS[level], spb = 60 / L.bpm;
    while (next < actx.currentTime + 0.25) {
      thump(next, 0.55 * L.beat); thump(next + spb * 0.28, 0.32 * L.beat); // tum-tum
      if (beat % 4 === 3 && Math.random() < L.stab * 2) stab(next + spb * 0.5, 0.11 + 0.06 * level);
      else if (Math.random() < L.stab * 0.35) stab(next + spb * 0.75, 0.07);
      next += spb; beat++;
    }
  }
  return { start, stop, setLevel, tick, get on() { return on; }, get level() { return level; } };
}
