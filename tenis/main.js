import { botAim, botServeAim, levelOf } from './ai.js';
import { HALF, flightPlan, inPlay, inServeBox, launchAt, makeBall, stepBall } from './physics.js';
import {
  awardPoint, deuceCourt, faultServe, newMatch, pointLabel, returner, serveSpot, sideLabel, sideOf, teamOf,
} from './rules.js';
import { createView } from './view.js';

const NAMES = ['Docão', 'Farofa', 'Pipoca', 'Trufa'];
const SKINS = ['classico', 'clube', 'pescador', 'bone'];
const BOTS = [['', 'Humano'], ['facil', 'Bot fácil'], ['medio', 'Bot médio'], ['dificil', 'Bot difícil']];

const canvas = document.querySelector('#quadra');
const view = createView(canvas);
const placar = document.querySelector('#placar');
const fala = document.querySelector('#fala');
const acoes = document.querySelector('#acoes');
const dica = document.querySelector('#dica');
const lobby = document.querySelector('#lobby');
const pausa = document.querySelector('#pausa');
const cadeiras = document.querySelector('#cadeiras');
const golpes = document.querySelector('#golpes');
const faixa = document.querySelector('#faixa');
const verde = document.querySelector('#verde');
const agulha = document.querySelector('#agulha');
const nota = document.querySelector('#nota');

let match = null;
let players = [];
let ball = makeBall();
let mode = 'wide';
let toss = 0;
let pauseT = 0;
let lock = false;
let flightT = 0;
let gradeT = 0;
let gradeLabel = '';
let serveLive = true;
let serveReturn = false;
let bounces = 0;
let lastTeam = 0;
let incoming = null;
let botWait = 0;
let hitLock = 0;
let message = '';
let pointsPlayed = 0;
let aim = { x: 2, z: 4 };
let nudgeX = 0;
let nudgeZ = 0;
let paused = false;
let panelKey = '';
let selected = 'liftado';
const keys = new Set();
let audio = null;

const sound = (freq, dur) => {
  try {
    audio = audio || new AudioContext();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.04, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    o.connect(g); g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + dur);
  } catch { /* sem áudio */ }
};

function seatRows() {
  const dupla = document.querySelector('input[name="mesa"]:checked').value === 'dupla';
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
}

document.querySelectorAll('input[name="mesa"]').forEach((el) => el.addEventListener('change', seatRows));
seatRows();

document.querySelector('#comanda').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const dupla = document.querySelector('input[name="mesa"]:checked').value === 'dupla';
  const setsToWin = document.querySelector('input[name="partida"]:checked').value === 'longa' ? 2 : 1;
  const seats = [...cadeiras.querySelectorAll('.seat')].map((row, i) => ({
    name: row.querySelector('input').value.trim() || NAMES[i],
    bot: row.querySelector('select').value || null,
    team: dupla ? i % 2 : i,
    skin: SKINS[i],
  }));
  beginMatch({ seats, setsToWin });
});

function beginMatch(opts) {
  match = newMatch(opts);
  players = match.seats.map((seat, i) => ({
    seat: i, team: seat.team, name: seat.name, skin: seat.skin,
    human: !seat.bot, bot: seat.bot || 'medio',
    x: 0, z: 0, side: -1, swing: 0, err: 0,
  }));
  message = '';
  pointsPlayed = 0;
  paused = false;
  panelKey = '';
  lobby.hidden = true;
  beginPoint();
}

function beginPoint() {
  if (!match || match.over) { mode = 'done'; return; }
  mode = 'toss';
  toss = 0;
  lock = false;
  flightT = 0;
  serveLive = true;
  serveReturn = false;
  bounces = 0;
  hitLock = 0;
  incoming = null;
  botWait = 0.55;
  const spot = serveSpot(match);
  ball = makeBall(tossAt(spot, 0));
  aim = {
    x: (spot.deuce ? -spot.side : spot.side) * 2,
    z: -spot.side * 3.6,
  };
  for (const p of players) {
    p.swing = 0;
    p.side = sideOf(match, p.team);
    const spot = targetFor(p);
    p.x = spot.x;
    p.z = spot.z;
  }
}

function tossAt(spot, u, handX) {
  const t = Math.min(1, Math.max(0, u));
  return {
    x: (handX ?? spot.x) - 0.55,
    y: 1.45 + Math.sin(t * Math.PI) * 1.05,
    z: spot.z - spot.side * (0.35 + 0.12 * t),
  };
}

const GRADE = {
  perfect: { power: 1, err: 0.4, depth: 0, label: 'No tempo', cls: 'tempo' },
  early: { power: 0.72, err: 1.25, depth: -1.35, label: 'Cedo', cls: '' },
  'bad-early': { power: 0.5, err: 2.2, depth: -2.7, label: 'Cedo', cls: '' },
  late: { power: 0.86, err: 1.2, depth: 1.55, label: 'Tarde', cls: '' },
  'bad-late': { power: 0.55, err: 2.1, depth: 2.5, label: 'Tarde', cls: '' },
};

function riskHeld() {
  return keys.has('Shift');
}

function judge(delta, risk) {
  const green = risk ? 0.045 : 0.07;
  let name = 'bad-late';
  if (Math.abs(delta) <= green) name = 'perfect';
  else if (delta < -0.2) name = 'bad-early';
  else if (delta < 0) name = 'early';
  else if (delta < 0.16) name = 'late';
  const g = { ...GRADE[name] };
  if (risk && name === 'perfect') {
    g.power = 1.16;
    g.err = 0.28;
    g.label = 'Risco';
    g.cls = 'risco';
  } else if (risk && name !== 'perfect') {
    g.power *= 0.82;
    g.err += 0.7;
  }
  return g;
}

function placeAim(base, side, g) {
  const far = -side;
  return {
    x: base.x + (Math.random() - 0.5) * g.err * 2,
    z: base.z + far * g.depth + (Math.random() - 0.5) * g.err,
    power: g.power,
  };
}

function flashGrade(g) {
  gradeLabel = g.label;
  gradeT = 0.65;
  nota.className = g.cls || '';
}

function teamOnSide(zSign) {
  for (const team of [0, 1]) if (sideOf(match, team) === zSign) return team;
  return 0;
}

function humanCanAct() {
  if (!match || paused || match.over || lock) return false;
  if (mode === 'toss' || mode === 'up') return players[match.server]?.human;
  if (mode !== 'flight' || serveLive) return false;
  return players.some((p) => p.human && p.team === teamOnSide(Math.sign(ball.z || ball.vz || -1)) && allowed(p));
}

function allowed(p) {
  if (!serveReturn) return true;
  return p.seat === returner(match);
}

function swing(kind) {
  if (!match || paused || match.over || lock) return;
  selected = kind;
  const server = players[match.server];
  if (mode === 'toss' && server?.human) {
    mode = 'up';
    toss = 0;
    return;
  }
  if (mode === 'up' && server?.human) {
    const g = judge(toss - 0.36, riskHeld());
    flashGrade(g);
    pendingGrade = g;
    strikeServe();
    return;
  }
  if (mode !== 'flight' || !incoming?.t) return;
  const dest = teamOnSide(Math.sign(ball.vz || ball.z || 1));
  const human = players.find((p) => p.human && p.team === dest && allowed(p));
  if (!human) return;
  const delta = flightT - incoming.t;
  if (delta < -0.52) return;
  if (serveLive) {
    flashGrade(GRADE.early);
    finishPoint(teamOf(match, match.server), 'Antes do quique');
    return;
  }
  const dist = Math.hypot(ball.x - human.x, ball.z - human.z);
  if (dist > 2.5 || ball.y > 3.4) {
    flashGrade({ label: 'Longe', cls: '' });
    return;
  }
  let g = judge(delta, riskHeld());
  if (dist > 1.45) g = { ...g, power: g.power * 0.8, err: g.err + 0.85 };
  flashGrade(g);
  let shaped = placeAim(aim, human.side, g);
  if (kind === 'curto') {
    const far = -human.side;
    shaped = { ...shaped, x: aim.x * 0.35, z: far * 2.55 + (shaped.z - aim.z) };
  }
  strike(human, kind, shaped);
}

let pendingGrade = GRADE.perfect;

function moveToward(p, target, dt, speed) {
  const dx = target.x - p.x;
  const dz = target.z - p.z;
  const dist = Math.hypot(dx, dz);
  const step = Math.min(dist, speed * dt);
  if (dist > 0.02) {
    p.x += (dx / dist) * step;
    p.z += (dz / dist) * step;
  }
  const s = p.side;
  if (s < 0) p.z = Math.max(-HALF - 3, Math.min(-3.1, p.z));
  else p.z = Math.min(HALF + 3, Math.max(3.1, p.z));
  p.x = Math.max(-6.2, Math.min(6.2, p.x));
}

function targetFor(p) {
  const side = p.side;
  const spot = serveSpot(match);
  const serving = p.seat === match.server;
  if (serving && (mode === 'toss' || mode === 'up')) {
    const slide = p.human ? Math.max(-1.5, Math.min(1.5, nudgeX)) : 0;
    return { x: spot.x + slide, z: spot.z };
  }
  if (match.doubles && p.team === teamOf(match, match.server) && !serving && (mode !== 'flight' || serveLive)) {
    return { x: -spot.x * 0.8, z: side * 4.5 };
  }
  if (p.seat === returner(match) && (serveLive || serveReturn || mode === 'toss' || mode === 'up')) {
    return {
      x: -Math.sign(spot.x || 1) * 2.5 + (p.human ? nudgeX : 0),
      z: side * (HALF - 0.6) + (p.human ? nudgeZ : 0),
    };
  }
  if (mode === 'flight' && incoming?.strike && Math.sign(incoming.strike.z) === side && p.team === teamOnSide(side)) {
    return {
      x: incoming.strike.x + (p.human ? nudgeX : p.err),
      z: incoming.strike.z + (p.human ? nudgeZ : 0),
    };
  }
  return { x: p.human ? nudgeX : 0, z: side * (HALF + 0.85) };
}

function inReach(p) {
  if (Math.sign(ball.z) !== p.side && Math.abs(ball.z) > 0.5) return false;
  return Math.hypot(ball.x - p.x, ball.z - p.z) < 1.85 && ball.y > 0.3 && ball.y < 3.2;
}

function strikeServe() {
  const spot = serveSpot(match);
  const server = players[match.server];
  const second = match.serveBall === 1;
  const botShot = server.human ? null : botServeAim(match, spot, server.bot, second);
  const kind = server.human
    ? (second || selected === 'cortado' || selected === 'lob' ? 'saque2' : 'saque')
    : botShot.kind;
  const shaped = server.human ? placeAim(aim, spot.side, pendingGrade) : null;
  const target = server.human ? shaped : botShot;
  const from = { x: ball.x, y: Math.max(1.7, ball.y), z: ball.z };
  const shot = launchAt(from, target, kind, match.doubles);
  const power = shaped?.power ?? 1;
  ball = makeBall({
    x: from.x, y: from.y, z: from.z, ...shot, taped: false,
    vx: shot.vx * power, vy: shot.vy * power, vz: shot.vz * power,
  });
  lastTeam = server.team;
  serveLive = true;
  serveReturn = false;
  bounces = 0;
  mode = 'flight';
  flightT = 0;
  hitLock = 0.2;
  incoming = flightPlan(ball, match.doubles);
  botWait = waitForReturn(server.team);
  for (const p of players) if (!p.human) p.err = (Math.random() - 0.5) * levelOf(p.bot).err;
  server.swing = 0.24;
  sound(520, 0.06);
}

function strike(p, kind, shaped) {
  if (serveReturn && p.seat !== returner(match)) {
    finishPoint(teamOf(match, match.server), 'Foi o parceiro');
    return;
  }
  const from = { x: p.x, y: Math.max(0.9, Math.min(2.45, ball.y)), z: p.z - p.side * 0.25 };
  const target = p.human ? (shaped || aim) : botAim(match, p, p.bot);
  const shot = launchAt(from, target, p.human ? kind : target.kind, match.doubles);
  const power = p.human ? (shaped?.power ?? 1) : 1;
  ball = makeBall({
    x: from.x, y: from.y, z: from.z, ...shot,
    vx: shot.vx * power, vy: shot.vy * power, vz: shot.vz * power,
  });
  lastTeam = p.team;
  serveLive = false;
  serveReturn = false;
  bounces = 0;
  flightT = 0;
  hitLock = 0.28;
  incoming = flightPlan(ball, match.doubles);
  botWait = waitForReturn(p.team);
  for (const q of players) if (!q.human) q.err = (Math.random() - 0.5) * levelOf(q.bot).err;
  p.swing = 0.24;
  sound(440, 0.05);
}

function waitForReturn(hittingTeam) {
  const bots = players.filter((p) => !p.human && p.team !== hittingTeam);
  if (!bots.length) return 0.05;
  return Math.min(...bots.map((p) => levelOf(p.bot).delay));
}

function tryHit() {
  if (mode !== 'flight' || serveLive || lock || hitLock > 0) return;
  const dest = teamOnSide(Math.sign(ball.z || 1));
  const ready = players.filter((p) => p.team === dest && allowed(p) && inReach(p));
  if (botWait > 0) return;
  const bots = ready.filter((p) => !p.human).sort((a, b) => (
    Math.hypot(ball.x - a.x, ball.z - a.z) - Math.hypot(ball.x - b.x, ball.z - b.z)
  ));
  if (bots[0]) strike(bots[0], bots[0].bot);
}

function finishPoint(winner, call) {
  if (lock || !match || match.over) return;
  lock = true;
  const out = awardPoint(match, winner);
  present(out, call);
  pointsPlayed += 1;
}

function fault() {
  if (lock) return;
  lock = true;
  ball.dead = true;
  const out = faultServe(match);
  if (out.event === 'fault') {
    message = 'Falta';
    mode = 'pause';
    pauseT = 0.6;
    return;
  }
  pointsPlayed += 1;
  present(out, 'Dupla falta');
}

function present(out, call) {
  const named = { game: 'Game', set: 'Set', match: 'Game, set e partida', tiebreak: 'Tie-break', double: 'Dupla falta' };
  let text = named[out.event] || call || '';
  if (out.double && out.event === 'point') text = 'Dupla falta';
  if (out.ends) text = text ? text + ' · Troca de lado' : 'Troca de lado';
  message = text;
  mode = 'pause';
  pauseT = out.event === 'match' || out.event === 'set' || out.event === 'game' ? 1.25 : 0.85;
  ball.vx = ball.vy = ball.vz = 0;
}

function afterStep() {
  if (ball.net === 'hit') {
    if (serveLive) fault();
    else finishPoint(1 - lastTeam, 'Na rede');
    return;
  }
  if (Math.abs(ball.z) > 16 || Math.abs(ball.x) > 12) {
    if (serveLive) fault();
    else finishPoint(1 - lastTeam, 'Fora');
    return;
  }
  if (!ball.bounced) return;
  const spot = serveSpot(match);
  if (serveLive) {
    const boxed = inServeBox(ball.x, ball.z, spot.side, spot.deuce);
    if (ball.taped && boxed) {
      message = 'Let';
      mode = 'pause';
      pauseT = 0.45;
      lock = true;
      ball.dead = true;
      return;
    }
    if (boxed && !ball.taped) {
      serveLive = false;
      serveReturn = true;
      bounces = 1;
      ball.taped = false;
      return;
    }
    fault();
    return;
  }
  if (Math.sign(ball.z) === sideOf(match, lastTeam)) {
    finishPoint(1 - lastTeam, 'Na rede');
    return;
  }
  if (!inPlay(ball.x, ball.z, match.doubles)) {
    finishPoint(1 - lastTeam, 'Fora');
    return;
  }
  bounces += 1;
  if (bounces >= 2 || ball.dead) finishPoint(lastTeam, serveReturn ? 'Não devolveu' : '');
}

function updatePlay(dt) {
  if (mode === 'pause') {
    pauseT -= dt;
    if (pauseT <= 0) {
      if (match.over) mode = 'done';
      else beginPoint();
    }
    return;
  }
  if (mode === 'done') return;
  nudgeX = (keys.has('ArrowRight') || keys.has('d') || keys.has('D') ? 1.6 : 0)
    - (keys.has('ArrowLeft') || keys.has('a') || keys.has('A') ? 1.6 : 0);
  const forward = (keys.has('ArrowUp') || keys.has('w') || keys.has('W') ? 1 : 0)
    - (keys.has('ArrowDown') || keys.has('s') || keys.has('S') ? 1 : 0);
  const sideNow = players.find((p) => p.human)?.side || -1;
  nudgeZ = -sideNow * forward * 1.7;
  if (gradeT > 0) gradeT -= dt;
  for (const p of players) {
    p.side = sideOf(match, p.team);
    if (p.swing > 0) p.swing -= dt;
    const speed = p.human ? 7 : levelOf(p.bot).speed;
    moveToward(p, targetFor(p), dt, speed);
  }
  if (hitLock > 0) hitLock -= dt;
  if (mode === 'toss') {
    const server = players[match.server];
    Object.assign(ball, tossAt(serveSpot(match), 0, server?.x), { vx: 0, vy: 0, vz: 0, bounced: false, dead: false });
    if (!players[match.server].human) {
      botWait -= dt;
      if (botWait <= 0) { mode = 'up'; toss = 0; }
    }
    return;
  }
  if (mode === 'up') {
    toss += dt;
    const u = Math.min(1, toss / 0.72);
    const server = players[match.server];
    Object.assign(ball, tossAt(serveSpot(match), u, server?.x), { vx: 0, vy: 0, vz: 0, bounced: false, dead: false });
    if (!server.human && toss > 0.36) strikeServe();
    if (server.human && toss > 0.78) fault();
    return;
  }
  flightT += dt;
  botWait -= dt;
  tryHit();
  if (mode !== 'flight' || lock) return;
  let left = Math.min(dt, 0.05);
  let guard = 0;
  while (left > 0 && !lock && guard++ < 4) {
    const h = Math.min(left, 1 / 60);
    // step is inside after? use physics step via a local import already stepBall
    stepLive(h);
    left -= h;
  }
  tryHit();
}

function stepLive(dt) {
  stepBall(ball, dt, match.doubles);
  afterStep();
}

canvas.addEventListener('pointermove', (ev) => {
  const spot = view.pointerOnCourt(ev.clientX, ev.clientY);
  if (!spot || !match || paused) return;
  aim = { x: spot.x, z: spot.z };
});
canvas.addEventListener('pointerdown', (ev) => {
  if (ev.button === 2) swing('reto');
  else if (ev.button === 0) swing(selected);
});
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') { togglePause(); return; }
  if (ev.key === ' ' && match) ev.preventDefault();
  keys.add(ev.key);
  if (ev.repeat) return;
  if (ev.key === 'q' || ev.key === 'Q') swing('cortado');
  if (ev.key === 'e' || ev.key === 'E') swing('lob');
  if (ev.key === 'r' || ev.key === 'R' || ev.key === ' ') swing('curto');
  if (ev.key === 'f' || ev.key === 'F') swing('reto');
});
window.addEventListener('keyup', (ev) => keys.delete(ev.key));

golpes.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button');
  if (!btn) return;
  selected = btn.dataset.golpe;
});

function togglePause() {
  if (!match) return;
  paused = !paused;
  pausa.hidden = !paused;
}
document.querySelector('#pausa-btn').addEventListener('click', togglePause);
document.querySelector('#continua').addEventListener('click', togglePause);
document.querySelector('#de-novo').addEventListener('click', () => {
  if (!match) return;
  paused = false;
  pausa.hidden = true;
  beginMatch({ seats: match.seats, setsToWin: match.setsToWin });
});

function cameraMode() {
  if (!match) return 'wide';
  return players.some((p) => p.human) ? 'behind' : 'corner';
}

function focusPlayer() {
  if (!players.length) return null;
  if (mode === 'pause' || mode === 'done') return players.find((p) => p.human) || players[0];
  if (mode === 'toss' || mode === 'up') return players[match.server];
  const z = ball.vz !== 0 ? Math.sign(ball.vz) : Math.sign(ball.z || -1);
  const team = teamOnSide(z);
  return players.find((p) => p.team === team && p.human) || players.find((p) => p.team === team) || players[0];
}

function syncHud() {
  placar.innerHTML = '';
  for (const team of [0, 1]) {
    const card = document.createElement('div');
    const serving = teamOf(match, match.server) === team;
    card.className = 'side' + (serving && !match.over ? ' on' : '');
    const title = document.createElement('b');
    title.textContent = (serving ? '● ' : '') + sideLabel(match, team);
    const games = document.createElement('div');
    games.className = 'games';
    const past = match.history.map((set) => set[team]).join('  ');
    const cur = match.over ? '' : String(match.games[team]);
    games.textContent = [past, cur].filter(Boolean).join('  ') + (match.over ? '' : ' games');
    const pts = document.createElement('div');
    pts.className = 'pts';
    const raw = pointLabel(match, team);
    const iguais = !match.tiebreak && match.pts[0] >= 3 && match.pts[0] === match.pts[1];
    const said = raw === '0' ? 'Zero' : raw;
    pts.textContent = match.over ? (match.winner === team ? 'venceu' : '') : (iguais ? 'Iguais' : said);
    card.append(title, games, pts);
    placar.append(card);
  }
  let line = message;
  if (!match.over && (mode === 'toss' || mode === 'up')) {
    const who = match.seats[match.server].name;
    const lado = deuceCourt(match) ? 'direita' : 'esquerda';
    const qual = match.serveBall ? '2º saque' : '1º saque';
    line = [message, qual + ' de ' + who, 'lado ' + lado].filter(Boolean).join(' · ');
  }
  if (match.tiebreak && !match.over) line = (line ? line + ' · ' : '') + 'Tie-break';
  fala.textContent = line;
  dica.hidden = pointsPlayed > 1;
  golpes.hidden = !match || match.over;
  for (const btn of golpes.querySelectorAll('button')) {
    btn.classList.toggle('on', btn.dataset.golpe === selected);
  }
  const key = match.over ? 'over' : '';
  if (key !== panelKey) {
    panelKey = key;
    acoes.innerHTML = '';
    if (match.over) {
      const again = document.createElement('button');
      again.type = 'button';
      again.textContent = 'Outra partida';
      again.addEventListener('click', () => beginMatch({ seats: match.seats, setsToWin: match.setsToWin }));
      acoes.append(again);
    }
  }
}

function showAim() {
  if (!match || match.over || paused) return false;
  if (mode === 'toss' || mode === 'up') return !!players[match.server]?.human;
  if (mode !== 'flight') return false;
  const dest = teamOnSide(Math.sign(ball.vz || ball.z || 1));
  return players.some((p) => p.human && p.team === dest);
}

function meterState() {
  if (!match || paused || match.over) return null;
  if (mode === 'up' && players[match.server]?.human) {
    const second = match.serveBall === 1;
    const center = 0.36 / 0.78;
    const half = (second ? 0.09 : 0.05) / 0.78;
    return { u: Math.min(1, toss / 0.78), green0: center - half, green1: center + half };
  }
  if (mode !== 'flight' || !incoming?.t) return null;
  const dest = teamOnSide(Math.sign(ball.vz || ball.z || 1));
  if (!players.some((p) => p.human && p.team === dest)) return null;
  const start = incoming.t - 0.52;
  const span = 0.72;
  if (flightT < start || flightT > start + span) return null;
  const mid = 0.52 / span;
  const green = (riskHeld() ? 0.045 : 0.07) / span;
  return { u: (flightT - start) / span, green0: mid - green, green1: mid + green };
}

function aimOk() {
  if (!match) return false;
  const spot = serveSpot(match);
  if (mode === 'toss' || mode === 'up') return inServeBox(aim.x, aim.z, spot.side, spot.deuce);
  const hitter = players.find((p) => p.human) || players[0];
  const far = hitter ? -hitter.side : 1;
  return inPlay(aim.x, aim.z, match.doubles) && Math.sign(aim.z) === far;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  try {
    if (match && !paused) updatePlay(dt);
    const human = players.find((p) => p.human);
    const focus = human || focusPlayer();
    const cam = cameraMode();
    const watch = focus;
    view.sync({
      ball: match ? ball : null,
      players: match ? players : null,
      aimAt: showAim() ? { ...aim, ok: aimOk() } : null,
      bounce: mode === 'flight' ? (incoming?.bounce || null) : null,
      watch,
      mode: match ? cam : 'wide',
    }, dt);
    if (match) syncHud();
    const meter = meterState();
    faixa.hidden = !meter;
    if (meter) {
      verde.style.left = (meter.green0 * 100) + '%';
      verde.style.width = ((meter.green1 - meter.green0) * 100) + '%';
      agulha.style.left = (Math.max(0, Math.min(1, meter.u)) * 100) + '%';
    }
    nota.hidden = gradeT <= 0;
    if (gradeT > 0) nota.textContent = gradeLabel;
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => view.resize());
requestAnimationFrame(frame);
