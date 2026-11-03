// Um AudioContext só pro jogo inteiro.
// O Safari deixa o contexto 'suspended' até um gesto e também usa 'interrupted'
// quando a aba perde o foco. O resume() tem que ser chamado dentro do handler
// síncrono (pointerdown, keydown, touchend, click). O pointer lock não conta.
// Um segundo contexto (a voz abria o dela no pointerdown, o jogo abria outro no click)
// estoura o limite do WebKit e o contexto dos tiros fica mudo pra sempre.

let ctx = null;
let made = 0;
let primed = false;
let tag = 'sfx';
const log = [];

function pushLog(kind, node) {
  log.push({ kind, node, t: ctx ? ctx.currentTime : 0 });
  if (log.length > 160) log.shift();
}

export function noteAudio(node) { pushLog(tag, node); }

export function withAudioTag(kind, fn) {
  const prev = tag;
  tag = kind || prev;
  try { return fn(); }
  catch (e) { return undefined; }
  finally { tag = prev; }
}

export function sharedAudio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    made += 1;
  } catch (e) { ctx = null; }
  return ctx;
}

function playSilence(c) {
  const n = Math.max(8, (c.sampleRate * 0.02) | 0);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  src.start();
  pushLog('unlock', 'silence');
}

// Gesto do usuário: resume() e um buffer mudo, os dois no mesmo turno síncrono.
export function unlockAudio() {
  const c = sharedAudio();
  if (!c) return null;
  const locked = c.state === 'suspended' || c.state === 'interrupted';
  try { if (locked) c.resume(); } catch (e) { /* o gesto seguinte tenta de novo */ }
  if (!primed || locked) {
    primed = true;
    try { playSilence(c); } catch (e) { /* buffer mudo é só a chave */ }
  }
  return c;
}

// Foco de volta: o Safari põe 'interrupted'. Não cria contexto aqui (ainda não houve gesto).
export function resumeAudio() {
  if (!ctx) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  try {
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') ctx.resume();
  } catch (e) { /* o próximo clique retoma */ }
}

export function armAudioGestures() {
  if (armAudioGestures.done || typeof document === 'undefined') return;
  armAudioGestures.done = true;
  const go = () => { unlockAudio(); };
  for (const ev of ['pointerdown', 'keydown', 'touchend', 'click']) document.addEventListener(ev, go, true);
  window.addEventListener('focus', resumeAudio);
  document.addEventListener('visibilitychange', resumeAudio);
}

// WebKit lança exceção em setValueAtTime(NaN/Infinity) e em exponentialRamp até 0,
// valor negativo ou não finito. A exceção não pode escapar: um som falho calava o resto.
export function safeSet(param, value, time) {
  if (!param) return;
  const v = Number.isFinite(value) ? value : 0;
  const t = Number.isFinite(time) && time >= 0 ? time : 0;
  try { param.setValueAtTime(v, t); } catch (e) { /* valor rejeitado */ }
}

export function safeExpRamp(param, value, time) {
  if (!param) return;
  let v = Number.isFinite(value) ? value : 0.001;
  if (!(v > 0)) v = 0.001;
  const t = Number.isFinite(time) && time > 0 ? time : 0.001;
  try { param.exponentialRampToValueAtTime(v, t); }
  catch (e) { try { param.setValueAtTime(v, t); } catch (e2) { /* já passou */ } }
}

if (typeof window !== 'undefined') {
  window.__audio = {
    get state() { return ctx ? ctx.state : 'none'; },
    get count() { return made; },
    get log() { return log; },
    has(kind) { return log.some((row) => row.kind === kind); },
    badRamp() {
      const c = sharedAudio();
      if (!c) return { threw: true, state: 'none' };
      const g = c.createGain();
      let threw = false;
      try {
        g.gain.value = 0;
        safeExpRamp(g.gain, 0, c.currentTime + 0.05);
        safeSet(g.gain, NaN, c.currentTime);
        safeExpRamp(g.gain, Infinity, NaN);
        safeSet(g.gain, Infinity, c.currentTime);
      } catch (e) { threw = true; }
      try { g.disconnect(); } catch (e) { /* solto */ }
      return { threw, state: c.state };
    },
  };
}
