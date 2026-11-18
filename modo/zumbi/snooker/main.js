import { chooseShot } from './ai.js';
import { DIAM, HEAD, beginShot, createWorld, moving, previewShot, snapshot, step, strike } from './physics.js';
import {
  applyShot, ballOnIds, callBall, cueInHand, handOk, handPhrase, HUE, newMatch, nextFrame,
  placeCue, resolveChoice, sideLabel, startBreak,
} from './rules.js';
import { createView } from './view.js';

const NAMES = ['Docão', 'Farofa', 'Pipoca', 'Trufa'];
const SKINS = ['classico', 'clube', 'pescador', 'bone'];
const BOTS = [
  ['', 'Humano'],
  ['facil', 'Bot fácil'],
  ['medio', 'Bot médio'],
  ['dificil', 'Bot difícil'],
];

const canvas = document.querySelector('#mesa');
const view = createView(canvas);
const placar = document.querySelector('#placar');
const contagem = document.querySelector('#contagem');
const fala = document.querySelector('#fala');
const acoes = document.querySelector('#acoes');
const forca = document.querySelector('#forca');
const forcaBar = forca.querySelector('span');
const dica = document.querySelector('#dica');
const lobby = document.querySelector('#lobby');
const pausa = document.querySelector('#pausa');
const cadeiras = document.querySelector('#cadeiras');
const marca = document.querySelector('#marca');

let match = null;
let balls = [];
let world = null;
let angle = 0;
let spinX = 0;
let spinY = 0;
let pulling = false;
let pullPx = 0;
let down = null;
let stroke = null;
let cueAnchor = null;
let stance = null;
let watch = null;
let rolling = false;
let paused = false;
let top = false;
let preview = null;
let botTimer = 0.8;
let panelKey = '';
let shotMeta = null;
let lastSamples = [];
let samples = [];
let replay = null;
let heardHit = false;
let heardPots = 0;
let audio = null;

const sound = (freq, dur, type) => {
  try {
    audio = audio || new AudioContext();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.05, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    o.connect(g); g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + dur);
  } catch { /* sem áudio */ }
};

function seatRows() {
  const modo = document.querySelector('input[name="modo"]:checked').value;
  const dupla = modo !== 'bolinho' && document.querySelector('input[name="mesa"]:checked').value === 'dupla';
  const n = dupla ? 4 : 2;
  const prev = [...cadeiras.querySelectorAll('.seat')].map((row) => ({
    name: row.querySelector('input').value,
    bot: row.querySelector('select').value,
  }));
  cadeiras.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'seat';
    const who = document.createElement('span');
    who.textContent = dupla ? (i % 2 === 0 ? 'Dupla 1' : 'Dupla 2') : (i === 0 ? 'Você' : 'Do outro lado');
    const name = document.createElement('input');
    name.value = prev[i]?.name || NAMES[i];
    name.maxLength = 16;
    const bot = document.createElement('select');
    for (const [id, label] of BOTS) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = label;
      bot.append(opt);
    }
    bot.value = prev[i]?.bot ?? (i === 0 ? '' : 'medio');
    row.append(who, name, bot);
    cadeiras.append(row);
  }
  document.querySelector('#quem').hidden = modo === 'bolinho';
  const curta = document.querySelector('input[name="corrida"][value="curta"]').parentElement;
  const longa = document.querySelector('input[name="corrida"][value="longa"]').parentElement;
  curta.lastChild.textContent = modo === 'bolinho' ? ' Até 3' : ' Melhor de 3';
  longa.lastChild.textContent = modo === 'bolinho' ? ' Até 5' : ' Melhor de 5';
}

document.querySelectorAll('input[name="modo"], input[name="mesa"]').forEach((el) => el.addEventListener('change', seatRows));
seatRows();

document.querySelector('#comanda').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const modo = document.querySelector('input[name="modo"]:checked').value;
  const dupla = modo !== 'bolinho' && document.querySelector('input[name="mesa"]:checked').value === 'dupla';
  const longa = document.querySelector('input[name="corrida"]:checked').value === 'longa';
  const seats = [...cadeiras.querySelectorAll('.seat')].map((row, i) => ({
    name: row.querySelector('input').value.trim() || NAMES[i],
    bot: row.querySelector('select').value || null,
    team: dupla ? i % 2 : i,
    skin: SKINS[i],
  }));
  beginMatch({ mode: modo, seats, race: modo === 'bolinho' ? (longa ? 5 : 3) : (longa ? 3 : 2) });
});

function beginMatch(opts) {
  match = newMatch(opts);
  balls = [];
  startBreak(match, balls);
  world = createWorld(balls);
  angle = 0;
  stroke = null;
  cueAnchor = null;
  watch = null;
  rolling = false;
  paused = false;
  replay = null;
  lastSamples = [];
  panelKey = '';
  lobby.hidden = true;
  pausa.hidden = true;
  view.setPigs(match.seats);
  botTimer = 0.8;
}

function freeHand(spot) {
  if (!handOk(match, spot.x, spot.z)) return false;
  return !balls.some((b) => !b.pocketed && b.id !== 'cue' && Math.hypot(b.x - spot.x, b.z - spot.z) < DIAM + 0.004);
}

function human() {
  return !!(match && !match.seats[match.turn].bot && !match.frameOver && !match.matchOver);
}

function cueBall() {
  return balls.find((b) => b.id === 'cue' && !b.pocketed) || null;
}

function fire(shot) {
  if (!match || rolling || match.pending || match.inHand || match.frameOver || match.matchOver) return;
  shotMeta = { legalIds: ballOnIds(match, balls) };
  const cue = cueBall();
  if (cue) watch = { x: cue.x, z: cue.z, angle: shot.angle };
  match.lastSnap = snapshot(world);
  beginShot(world);
  strike(world, shot);
  rolling = true;
  shotTime = 0;
  samples = [];
  heardHit = false;
  heardPots = 0;
  sound(520, 0.04, 'triangle');
}

function finishRolling() {
  rolling = false;
  lastSamples = samples;
  const cue = balls.find((b) => b.id === 'cue');
  const report = {
    firstId: world.firstId,
    potted: world.potted.slice(),
    off: world.off.slice(),
    cuePotted: !cue || cue.pocketed || world.potted.includes('cue') || world.off.includes('cue'),
    legalIds: shotMeta?.legalIds,
    railAfter: !!world.railAfter,
    railBalls: world.railBalls ? world.railBalls.size : 0,
  };
  applyAndCheck(report);
}

function applyAndCheck(report) {
  applyShot(match, balls, report);
  botTimer = 0.7;
  panelKey = '';
}

function onChoice(choice) {
  resolveChoice(match, balls, choice);
  panelKey = '';
  botTimer = 0.45;
}

function onPlace(spot) {
  const kitchen = match.inHand === 'kitchen';
  placeCue(balls, spot.x, spot.z);
  match.inHand = false;
  preview = null;
  if (kitchen) angle = 0;
  else {
    const cue = cueBall();
    const target = balls.find((b) => ballOnIds(match, balls).includes(b.id));
    if (cue && target) angle = Math.atan2(target.z - cue.z, target.x - cue.x);
  }
  panelKey = '';
}

function beginStroke(shot, alreadyPulled) {
  const cue = cueBall();
  if (!cue || stroke) return;
  cueAnchor = { x: cue.x, z: cue.z };
  watch = { x: cue.x, z: cue.z, angle: shot.angle };
  const target = Math.max(0.05, shot.power) * 0.28;
  stroke = alreadyPulled
    ? { phase: 'strike', t: 0, shot, pull: target, target, dur: 0.22 - shot.power * 0.06 }
    : { phase: 'back', t: 0, shot, pull: 0, target, dur: 0.2 };
}

function stepStroke(dt) {
  if (!stroke) return;
  if (stroke.phase === 'back') {
    stroke.t += dt;
    const u = Math.min(1, stroke.t / 0.32);
    stroke.pull = stroke.target * u;
    if (u >= 1) { stroke.phase = 'strike'; stroke.t = 0; }
    return;
  }
  if (stroke.phase === 'strike') {
    stroke.t += dt;
    const u = Math.min(1, stroke.t / stroke.dur);
    stroke.pull = stroke.target * (1 - u * u);
    if (u >= 1) {
      const shot = stroke.shot;
      stroke.phase = 'hold';
      stroke.t = 0;
      stroke.pull = -0.012;
      fire(shot);
    }
    return;
  }
  if (stroke.phase === 'hold') {
    stroke.t += dt;
    if (stroke.t > 0.16) { stroke.phase = 'fade'; stroke.t = 0; }
    return;
  }
  stroke.t += dt;
  if (stroke.t > 0.14) { stroke = null; cueAnchor = null; }
}

canvas.addEventListener('pointerdown', (ev) => {
  if (!match || paused || replay || rolling || stroke || !human()) return;
  canvas.setPointerCapture(ev.pointerId);
  const spot = view.pointerToTable(ev.clientX, ev.clientY);
  if (cueInHand(match)) {
    if (spot && freeHand(spot)) onPlace(spot);
    return;
  }
  if (match.pending) return;
  down = { x: ev.clientX, y: ev.clientY };
  pulling = true;
  pullPx = 0;
});

canvas.addEventListener('pointermove', (ev) => {
  if (!match || paused || replay || rolling || stroke) return;
  if (cueInHand(match)) {
    const spot = view.pointerToTable(ev.clientX, ev.clientY);
    preview = spot && freeHand(spot) ? spot : preview;
    return;
  }
  if (pulling && down) {
    pullPx = Math.max(0, ev.clientY - down.y);
    forca.hidden = false;
    forcaBar.style.height = Math.min(100, (pullPx / 280) * 100) + '%';
    return;
  }
  if (!human() || match.pending) return;
  const fine = ev.shiftKey ? 0.22 : 1;
  angle -= (ev.movementX || 0) * 0.00314 * fine;
});

canvas.addEventListener('pointerup', (ev) => {
  if (!pulling) return;
  pulling = false;
  forca.hidden = true;
  const dist = Math.max(0, ev.clientY - down.y);
  down = null;
  if (dist < 15 || !human()) return;
  beginStroke({ angle, power: Math.max(0.08, Math.min(1, dist / 280)), spinX, spinY }, true);
});

canvas.addEventListener('wheel', (ev) => {
  if (!human() || rolling || paused || stroke || match?.inHand) return;
  ev.preventDefault();
  angle += Math.sign(ev.deltaY) * 0.007;
}, { passive: false });

window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') { togglePause(); return; }
  if (!human() || rolling || paused || match?.inHand) return;
  if (ev.key === 'ArrowLeft') angle += 0.0087;
  if (ev.key === 'ArrowRight') angle -= 0.0087;
});

document.querySelector('#topo').addEventListener('click', () => {
  top = !top;
  document.querySelector('#topo').textContent = top ? 'Vista do taco' : 'Vista de cima';
});
document.querySelector('#pausa-btn').addEventListener('click', togglePause);
document.querySelector('#continua').addEventListener('click', togglePause);
document.querySelector('#rever').addEventListener('click', () => {
  if (lastSamples.length < 2 || rolling) return;
  replay = { frames: lastSamples, i: 0, live: snapshot(world) };
  paused = false;
  pausa.hidden = true;
});
document.querySelector('#de-novo').addEventListener('click', () => {
  if (!match) return;
  beginMatch({ mode: match.mode, seats: match.seats, race: match.race });
});

function togglePause() {
  if (!match || lobby.hidden === false) return;
  paused = !paused;
  pausa.hidden = !paused;
}

const disco = document.querySelector('#disco');
disco.addEventListener('pointerdown', (ev) => {
  disco.setPointerCapture(ev.pointerId);
  setSpin(ev);
});
disco.addEventListener('pointermove', (ev) => { if (disco.hasPointerCapture(ev.pointerId)) setSpin(ev); });
document.querySelector('#limpa').addEventListener('click', () => { spinX = 0; spinY = 0; marca.style.transform = ''; });

function setSpin(ev) {
  const rect = disco.getBoundingClientRect();
  let x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  let y = ((ev.clientY - rect.top) / rect.height) * 2 - 1;
  const len = Math.hypot(x, y) || 1;
  const k = Math.min(1, len);
  spinX = (x / len) * k;
  spinY = -(y / len) * k;
  marca.style.transform = 'translate(' + (spinX * 30) + 'px,' + (-spinY * 30) + 'px)';
}

function botAct() {
  const seat = match.seats[match.turn];
  let shot;
  try { shot = chooseShot(match, balls, seat.bot || 'medio'); }
  catch { shot = { angle: 0, power: 0.3, spinX: 0, spinY: 0 }; }
  if (shot.grupo) { onChoice(shot.grupo); return; }
  if (shot.place) onPlace(shot.place);
  if (shot.angle != null) beginStroke({ angle: shot.angle, power: shot.power, spinX: shot.spinX || 0, spinY: shot.spinY || 0 }, false);
}

function syncBoard() {
  if (!match) return;
  const teams = match.seats.length > 2 ? [0, 1] : [0, 1];
  placar.innerHTML = '';
  for (const team of teams) {
    const card = document.createElement('div');
    card.className = 'side' + (match.seats[match.turn].team === team && !match.frameOver ? ' on' : '');
    const title = document.createElement('b');
    title.textContent = sideLabel(match, team);
    const pts = document.createElement('div');
    pts.className = 'pts';
    pts.textContent = match.mode === 'bolinho' ? String(match.bolinhos[team]) : String(match.frames[team]);
    const meta = document.createElement('small');
    if (match.mode === 'bolinho') meta.textContent = 'bolinhos · até ' + match.race;
    else {
      const g = match.groups?.[team];
      const nome = g === 'lisa' ? 'lisas' : g === 'listra' ? 'listradas' : 'aberta';
      meta.textContent = nome + ' · até ' + match.race;
    }
    card.append(title, pts, meta);
    placar.append(card);
  }
  syncCount();
  const seat = match.seats[match.turn];
  let line = match.text || '';
  if (!match.frameOver) {
    let vez;
    if (match.inHand) vez = seat.name + ' ' + handPhrase(match);
    else vez = 'Vez de ' + seat.name + ' · ' + callBall(match, balls);
    line = line ? line + ' · ' + vez : vez;
  }
  fala.textContent = line;
  dica.hidden = !human() || !!match.pending || match.inHand || rolling;
}

function syncCount() {
  if (!match) { contagem.hidden = true; return; }
  contagem.hidden = false;
  contagem.innerHTML = '';
  if (match.mode === 'bolinho') {
    const objs = balls.filter((b) => b.id !== 'cue');
    const faltam = objs.filter((b) => !b.pocketed).length;
    contagem.append(grupoBolas('Bolinho', objs, false, faltam + ' faltam · ' + (objs.length - faltam) + ' caíram'));
    return;
  }
  const lisas = balls.filter((b) => b.group === 'lisa').sort((a, b) => a.n - b.n);
  const listras = balls.filter((b) => b.group === 'listra').sort((a, b) => a.n - b.n);
  const oito = balls.find((b) => b.n === 8);
  contagem.append(grupoBolas('Lisas' + dono('lisa'), lisas, false));
  if (oito) contagem.append(grupoBolas('Oito', [oito], false, oito.pocketed ? 'caiu' : 'na mesa'));
  contagem.append(grupoBolas('Listradas' + dono('listra'), listras, true));
}

function dono(group) {
  const team = (match.groups || []).findIndex((g) => g === group);
  return team >= 0 ? ' · ' + sideLabel(match, team) : '';
}

function grupoBolas(label, list, stripe, detail) {
  const wrap = document.createElement('div');
  wrap.className = list.length === 1 ? 'meio' : 'grupo';
  const faltam = list.filter((b) => !b.pocketed).length;
  const topo = document.createElement('div');
  topo.className = 'topo';
  const name = document.createElement('b');
  name.textContent = label;
  const meta = document.createElement('small');
  meta.textContent = detail || (faltam + ' faltam · ' + (list.length - faltam) + ' caíram');
  topo.append(name, meta);
  const pips = document.createElement('div');
  pips.className = 'pips';
  for (const ball of list) {
    const pip = document.createElement('i');
    pip.className = 'pip' + (stripe ? ' listra' : '') + (ball.pocketed ? ' fora' : '');
    const hue = HUE[((ball.n - 1) % 8) + 1] || ball.color;
    pip.style.setProperty('--c', hue);
    const num = document.createElement('span');
    num.textContent = String(ball.n || '');
    pip.append(num);
    pips.append(pip);
  }
  wrap.append(topo, pips);
  return wrap;
}

function syncActions() {
  if (!match) return;
  const key = [match.turn, match.phase, match.pending && match.pending.type, match.pending && match.pending.kind, match.inHand, match.frameOver, match.matchOver, match.text, human()].join('|');
  if (key === panelKey) return;
  panelKey = key;
  acoes.innerHTML = '';
  const add = (label, fn, className) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    if (className) btn.className = className;
    btn.addEventListener('click', fn);
    acoes.append(btn);
    return btn;
  };
  if (match.matchOver) {
    add('Outra partida', () => beginMatch({ mode: match.mode, seats: match.seats, race: match.race }));
    return;
  }
  if (match.frameOver) {
    add('Próxima partida', () => { nextFrame(match, balls); panelKey = ''; botTimer = 0.6; });
    return;
  }
  if (!human()) return;
  if (match.pending?.type === 'grupo') {
    add('Lisas, 1 a 7', () => onChoice('lisa'));
    add('Listradas, 9 a 15', () => onChoice('listra'));
  }
}

let last = performance.now();
let shotTime = 0;
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  try {
  if (match && !paused) {
    if (stroke && !replay) stepStroke(dt);
    if (replay) stepReplay(dt);
    else if (rolling) {
      let left = Math.min(0.05, dt);
      shotTime += left;
      let guard = 0;
      while (left > 0 && guard++ < 3) {
        const h = Math.min(left, 1 / 60);
        step(world, h);
        left -= h;
      }
      if (samples.length < 480) samples.push(snapshot(world));
      if (!heardHit && world.firstId) { heardHit = true; sound(160, 0.05, 'square'); }
      if (world.potted.length > heardPots) { heardPots = world.potted.length; sound(90, 0.12, 'sine'); }
      if (shotTime > 9) {
        for (const b of balls) { b.vx = b.vz = b.sx = b.sz = 0; }
      }
      if (!moving(world)) finishRolling();
    } else if (!stroke && !human() && !match.frameOver && !match.matchOver) {
      botTimer -= dt;
      if (botTimer <= 0) { botTimer = 2; botAct(); }
    }
  }
  if (match?.inHand && !preview) preview = match.inHand === 'kitchen' ? { x: HEAD - 0.16, z: 0.05 } : { x: 0, z: 0 };
  const cue = balls.find((b) => b.id === 'cue');
  const handCue = match && match.inHand && preview ? { id: 'cue', x: preview.x, z: preview.z, pocketed: false } : null;
  const liveCue = (cue && !cue.pocketed) ? cue : handCue;
  const aimCue = (stroke && cueAnchor) ? { id: 'cue', x: cueAnchor.x, z: cueAnchor.z, pocketed: false } : liveCue;
  const aimAngle = stroke?.shot?.angle ?? angle;
  if (aimCue && !rolling && !replay) stance = { x: aimCue.x, z: aimCue.z, angle: aimAngle };
  const stand = (rolling || replay) && stance ? stance : aimCue;
  const standAngle = (rolling || replay) && stance ? stance.angle : aimAngle;
  const lookMode = top ? 'top' : !human() ? 'corner' : (rolling || replay) ? 'watch' : 'aim';
  view.placePlayers(match ? match.turn : -1, lookMode === 'top' ? null : stand, standAngle);
  view.look(lookMode, lookMode === 'corner' ? (stand || aimCue) : aimCue, lookMode === 'corner' ? standAngle : aimAngle, watch);
  view.setBalls(balls);
  view.setPreview(match && match.inHand ? (preview || null) : null);
  const legal = match ? new Set(ballOnIds(match, balls)) : new Set();
  const showAim = (lookMode === 'aim' || (lookMode === 'corner' && !rolling && !replay)) && aimCue && !match?.pending;
  view.setAim(aimCue, showAim ? previewShot(balls, aimCue, aimAngle) : null, legal);
  const pullM = stroke ? stroke.pull : pulling ? (pullPx / 280) * 0.28 : 0;
  const showCue = !!aimCue && (stroke || !rolling && !replay) && (lookMode === 'aim' || lookMode === 'corner' || (stroke && stroke.phase !== 'fade'));
  view.setCue(stroke && cueAnchor ? cueAnchor : aimCue, aimAngle, pullM, showCue && stroke?.phase !== 'fade');
  view.setTurn(match ? match.turn : 0);
  view.update(dt);
  if (match) { syncBoard(); syncActions(); }
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => view.resize());
requestAnimationFrame(frame);

function stepReplay(dt) {
  replay.i += dt * 60;
  const frames = replay.frames;
  const i = Math.min(frames.length - 1, Math.floor(replay.i));
  const shot = frames[i];
  for (const s of shot) {
    const b = balls.find((ball) => ball.id === s.id);
    if (!b) continue;
    b.x = s.x; b.z = s.z; b.pocketed = s.pocketed;
  }
  if (replay.i >= frames.length) {
    restore(world, replay.live);
    replay = null;
  }
}
