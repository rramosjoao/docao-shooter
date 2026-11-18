// Sinuca de bar: bola 8 (lisas e listradas) e bolinho. Sem D, sem colorida, sem snooker.
import { DIAM, FOOT, HEAD, L, R, W, inKitchen, makeBall, onCloth } from './physics.js';

const HUE = {
  1: '#f0c400', 2: '#1d4e9e', 3: '#d23a2e', 4: '#6b3fa0',
  5: '#e07a1f', 6: '#1f8a3b', 7: '#7a2e2a', 8: '#1a120e',
};
const WORD = {
  1: 'amarela', 2: 'azul', 3: 'vermelha', 4: 'roxa',
  5: 'laranja', 6: 'verde', 7: 'vinho', 8: 'preta',
};

function poolBall(n, x, z) {
  const hue = HUE[((n - 1) % 8) + 1];
  const stripe = n > 8;
  return makeBall({
    id: 'b' + n, name: (stripe ? 'listrada ' : 'lisa ') + WORD[((n - 1) % 8) + 1],
    value: n, n, color: hue, stripe, group: n === 8 ? 'oito' : stripe ? 'listra' : 'lisa',
    x, z,
  });
}

function triangle(apexX) {
  const gap = DIAM * 1.015;
  const rowGap = gap * Math.sqrt(3) / 2;
  const slots = [];
  for (let row = 0; row < 5; row++) {
    for (let i = 0; i <= row; i++) {
      slots.push({ row, i, x: apexX + row * rowGap, z: (i - row / 2) * gap });
    }
  }
  return slots;
}

export function rackBalls(mode) {
  const cue = makeBall({
    id: 'cue', name: 'branca', value: 0, n: 0, color: '#f4efe4',
    x: HEAD - 0.18, z: 0.08,
  });
  if (mode === 'bolinho') {
    const gap = DIAM * 1.04;
    return [
      cue,
      makeBall({ id: 'b1', name: 'vermelha', value: 1, n: 1, color: '#d23a2e', group: 'bola', x: 0.12, z: 0 }),
      makeBall({ id: 'b2', name: 'vermelha', value: 1, n: 1, color: '#d23a2e', group: 'bola', x: 0.12 + gap, z: -gap * 0.5 }),
      makeBall({ id: 'b3', name: 'vermelha', value: 1, n: 1, color: '#d23a2e', group: 'bola', x: 0.12 + gap, z: gap * 0.5 }),
    ];
  }
  const slots = triangle(FOOT);
  const at = (row, i) => slots.find((s) => s.row === row && s.i === i);
  const taken = new Set();
  const put = (n, slot) => {
    taken.add(slot);
    return poolBall(n, slot.x, slot.z);
  };
  const balls = [
    cue,
    put(1, at(0, 0)),
    put(8, at(2, 1)),
    put(2, at(4, 0)),
    put(9, at(4, 4)),
  ];
  const rest = [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15];
  let k = 0;
  for (const slot of slots) {
    if (taken.has(slot)) continue;
    balls.push(put(rest[k++], slot));
  }
  return balls;
}

export function newMatch(opts) {
  const mode = opts.mode === 'bolinho' ? 'bolinho' : 'bola8';
  const seats = opts.seats.map((s, i) => ({
    name: s.name || ('Docão ' + (i + 1)),
    bot: s.bot || null,
    team: mode === 'bolinho' ? i : (s.team ?? i % 2),
    skin: s.skin || 'classico',
  }));
  return {
    mode,
    seats,
    race: opts.race || (mode === 'bolinho' ? 5 : 2),
    frames: [0, 0],
    bolinhos: [0, 0],
    groups: [null, null],
    open: true,
    turn: 0,
    breakSeat: 0,
    breakShot: true,
    pending: null,
    inHand: 'kitchen',
    frameOver: false,
    matchOver: false,
    text: '',
    winner: null,
    lastSnap: null,
  };
}

export function onTable(balls) {
  return balls.filter((b) => !b.pocketed && b.id !== 'cue');
}

export function ballOnIds(match, balls) {
  const live = onTable(balls);
  if (match.mode === 'bolinho') return live.map((b) => b.id);
  if (match.open || !match.groups[teamOf(match)]) return live.filter((b) => b.n !== 8).map((b) => b.id);
  const mine = match.groups[teamOf(match)];
  const group = live.filter((b) => b.group === mine);
  if (!group.length) return live.filter((b) => b.n === 8).map((b) => b.id);
  return group.map((b) => b.id);
}

export function teamOf(match, seat = match.turn) {
  return match.seats[seat].team;
}

export function sideLabel(match, team) {
  return match.seats.filter((s) => s.team === team).map((s) => s.name).join(' e ');
}

function cue(balls) { return balls.find((b) => b.id === 'cue'); }

function occupied(balls, x, z, ignore) {
  return balls.some((b) => !b.pocketed && b.id !== ignore && Math.hypot(b.x - x, b.z - z) < DIAM + 0.001);
}

function respot(balls, ball) {
  const spots = [{ x: FOOT, z: 0 }, { x: 0, z: 0 }, { x: HEAD, z: 0 }];
  const tryAt = (x, z) => {
    if (occupied(balls, x, z, ball.id)) return false;
    ball.x = x; ball.z = z; ball.vx = ball.vz = ball.sx = ball.sz = 0; ball.pocketed = false;
    return true;
  };
  for (const s of spots) if (tryAt(s.x, s.z)) return;
  for (let i = 1; i < 16; i++) {
    if (tryAt(Math.min(L / 2 - R * 3, FOOT + i * DIAM), 0)) return;
  }
}

function bury(ball) {
  if (!ball) return;
  ball.pocketed = true;
  ball.vx = ball.vz = ball.sx = ball.sz = 0;
}

function pass(match) {
  match.turn = (match.turn + 1) % match.seats.length;
}

function giveHand(match, balls, zone) {
  bury(cue(balls));
  match.inHand = zone;
}

function endRack(match, team, text) {
  match.frames[team] += 1;
  match.frameOver = true;
  match.pending = null;
  match.inHand = false;
  match.text = text;
  if (match.frames[team] >= match.race) {
    match.matchOver = true;
    match.winner = team;
    match.text = sideLabel(match, team) + ' fechou.';
  }
}

export function applyShot(match, balls, report) {
  match.pending = null;
  match.text = '';
  if (match.frameOver || match.matchOver) return;
  if (match.mode === 'bolinho') return applyBolinho(match, balls, report);

  const me = teamOf(match);
  const breaking = match.breakShot;
  match.breakShot = false;
  const potted = (report.potted || []).filter((id) => id !== 'cue');
  const off = (report.off || []).filter((id) => id !== 'cue');
  const cueDown = !!(report.cuePotted || (report.off || []).includes('cue'));
  const legal = new Set(report.legalIds || ballOnIds(match, balls));
  const firstOk = !!(report.firstId && legal.has(report.firstId));
  const eight = balls.find((b) => b.n === 8);

  for (const id of off) {
    const ball = balls.find((b) => b.id === id);
    if (ball && ball.n !== 8) respot(balls, ball);
  }
  if (off.includes('b8') || (eight && eight.pocketed && off.includes(eight.id))) {
    if (!breaking) {
      endRack(match, 1 - me, 'A 8 saiu da mesa.');
      return;
    }
    respot(balls, eight);
  }

  const eightDown = potted.includes('b8') || (eight && eight.pocketed && potted.includes(eight.id));
  if (breaking && eightDown) {
    respot(balls, eight);
    match.text = 'A 8 na saída volta ao pé da mesa.';
  }

  const stayedDown = potted.filter((id) => balls.find((b) => b.id === id)?.pocketed);
  const fell = stayedDown.filter((id) => id !== 'b8');
  const railBalls = report.railBalls || 0;
  const noRail = !!(report.firstId && !report.railAfter && !stayedDown.length);

  if (breaking) {
    const legalBreak = fell.length > 0 || railBalls >= 2;
    if (!firstOk || cueDown || !legalBreak) {
      pass(match);
      giveHand(match, balls, 'kitchen');
      match.open = true;
      match.text = (match.text ? match.text + ' ' : '') + 'Saída falhou. Branca na cozinha.';
      return;
    }
    match.inHand = false;
    if (!fell.length) {
      pass(match);
      match.text = (match.text ? match.text + ' ' : '') + 'Mesa aberta.';
      return;
    }
    match.text = (match.text ? match.text + ' ' : '') + 'Mesa aberta. Pode continuar.';
    return;
  }

  if (!breaking && eightDown) {
    const mine = match.groups[me];
    const left = onTable(balls).filter((b) => b.group === mine);
    const clean = !!mine && !left.length && firstOk && !cueDown && !off.length && !noRail;
    if (clean) {
      endRack(match, me, sideLabel(match, me) + ' derrubou a 8.');
      return;
    }
    endRack(match, 1 - me, cueDown ? 'A 8 caiu junto com a branca.' : 'A 8 caiu fora de hora.');
    return;
  }

  const wrongPot = fell.some((id) => {
    const ball = balls.find((b) => b.id === id);
    if (!ball || match.open) return false;
    return ball.group !== match.groups[me];
  });
  const foul = !firstOk || cueDown || off.length > 0 || noRail || wrongPot;
  if (foul) {
    pass(match);
    giveHand(match, balls, 'table');
    const why = !firstOk ? 'não encostou na bola certa' : cueDown ? 'branca na caçapa' : off.length ? 'bola fora' : wrongPot ? 'bola do outro' : 'nada foi à tabela';
    match.text = 'Falta. ' + why + '.';
    return;
  }

  if (match.open && fell.length) {
    const kinds = new Set(fell.map((id) => balls.find((b) => b.id === id)?.group).filter((g) => g === 'lisa' || g === 'listra'));
    if (kinds.size === 1) {
      const g = [...kinds][0];
      match.groups[me] = g;
      match.groups[1 - me] = g === 'lisa' ? 'listra' : 'lisa';
      match.open = false;
      match.text = g === 'lisa' ? 'Lisas para ' + match.seats[match.turn].name + '.' : 'Listradas para ' + match.seats[match.turn].name + '.';
    } else if (kinds.size > 1) {
      match.pending = { type: 'grupo' };
      match.text = 'Caiu lisa e listrada. Escolha o grupo.';
    }
    return;
  }

  if (!fell.length) {
    pass(match);
    match.text = 'Passou a vez.';
    return;
  }
  match.text = 'Bola sua. Continua.';
}

function applyBolinho(match, balls, report) {
  const me = teamOf(match);
  const them = 1 - me;
  const potted = (report.potted || []).filter((id) => id !== 'cue');
  const off = (report.off || []).filter((id) => id !== 'cue');
  const cueDown = !!(report.cuePotted || (report.off || []).includes('cue'));
  const foul = !report.firstId || cueDown || off.length > 0;
  if (foul) {
    match.bolinhos[them] += 1;
    match.text = cueDown ? 'Branca na caçapa.' : !report.firstId ? 'Não encostou.' : 'Bola fora.';
    return nextBolinho(match, balls, them);
  }
  for (const id of potted) bury(balls.find((b) => b.id === id));
  if (!onTable(balls).length) {
    match.bolinhos[me] += 1;
    match.text = 'Última bola.';
    return nextBolinho(match, balls, me);
  }
  if (!potted.length) {
    pass(match);
    match.text = 'Passou a vez.';
    return;
  }
  match.text = 'Bola encaçapada. Continua.';
}

function nextBolinho(match, balls, winner) {
  if (match.bolinhos[winner] >= match.race) {
    match.matchOver = true;
    match.winner = winner;
    match.frameOver = true;
    match.text = sideLabel(match, winner) + ' fecha em ' + match.bolinhos[winner] + '.';
    return;
  }
  const fresh = rackBalls('bolinho');
  for (const b of balls) {
    const n = fresh.find((f) => f.id === b.id);
    if (!n) continue;
    b.x = n.x; b.z = n.z; b.pocketed = false; b.vx = b.vz = b.sx = b.sz = 0;
  }
  match.turn = match.seats.findIndex((s) => s.team === winner);
  bury(cue(balls));
  match.inHand = 'kitchen';
  match.breakShot = false;
}

export function resolveChoice(match, balls, choice) {
  const pending = match.pending;
  if (!pending) return;
  match.pending = null;
  if (pending.type === 'grupo') {
    const me = teamOf(match);
    match.groups[me] = choice;
    match.groups[1 - me] = choice === 'lisa' ? 'listra' : 'lisa';
    match.open = false;
    match.text = choice === 'lisa' ? 'Ficou com as lisas.' : 'Ficou com as listradas.';
  }
}

export function placeCue(balls, x, z) {
  const c = cue(balls);
  c.x = x; c.z = z; c.pocketed = false; c.vx = c.vz = c.sx = c.sz = 0;
}

export function cueInHand(match) { return !!match.inHand && !match.frameOver && !match.matchOver; }

export function handOk(match, x, z) {
  if (match.inHand === 'kitchen') return inKitchen(x, z);
  if (match.inHand === 'table') return onCloth(x, z);
  return false;
}

export function callBall(match, balls) {
  if (match.mode === 'bolinho') return 'qualquer uma das três';
  if (match.pending?.type === 'grupo') return 'escolha o grupo';
  if (match.open || !match.groups[teamOf(match)]) return 'mesa aberta';
  const mine = match.groups[teamOf(match)];
  const left = onTable(balls).some((b) => b.group === mine);
  if (!left) return 'a 8';
  return mine === 'lisa' ? 'lisas' : 'listradas';
}

export function handPhrase(match) {
  if (match.inHand === 'kitchen') return 'coloca a branca na cozinha';
  if (match.inHand === 'table') return 'põe a branca na mesa';
  return '';
}

export function startBreak(match, balls) {
  match.frameOver = false;
  match.pending = null;
  match.breakShot = match.mode === 'bola8';
  match.open = true;
  match.groups = [null, null];
  match.inHand = 'kitchen';
  match.text = 'Saída de ' + match.seats[match.turn].name + '.';
  const fresh = rackBalls(match.mode);
  if (!balls.length) balls.push(...fresh);
  else balls.splice(0, balls.length, ...fresh);
  bury(cue(balls));
}

export function nextFrame(match, balls) {
  if (match.matchOver) return;
  match.breakSeat = (match.breakSeat + 1) % match.seats.length;
  match.turn = match.breakSeat;
  startBreak(match, balls);
}

export { FOOT, HEAD, HUE, W };
