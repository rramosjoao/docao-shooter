// Bot de bar: mira uma caçapa da bola que é dele. Se não tiver, joga curto.
import { DIAM, FOOT, HEAD, POCKETS, R, ghostToPocket, inKitchen, onCloth, pathBlocked } from './physics.js';
import { ballOnIds } from './rules.js';

const LEVEL = {
  facil: { cut: 0.55, err: 0.09 },
  medio: { cut: 0.28, err: 0.045 },
  dificil: { cut: 0.12, err: 0.018 },
};

function cueOf(balls) { return balls.find((b) => b.id === 'cue' && !b.pocketed); }

export function chooseShot(match, balls, levelName) {
  const level = LEVEL[levelName] || LEVEL.medio;
  if (match.pending?.type === 'grupo') {
    const lisas = balls.filter((b) => !b.pocketed && b.group === 'lisa').length;
    return { grupo: lisas >= 4 ? 'listra' : 'lisa' };
  }
  const cue = cueOf(balls);
  if (match.inHand || !cue) {
    const spot = pickPlace(match, balls);
    return { place: spot, ...chooseShot({ ...match, inHand: false }, placed(balls, spot), levelName) };
  }
  const legal = new Set(ballOnIds(match, balls));
  const targets = balls.filter((b) => legal.has(b.id) && !b.pocketed);
  let best = null;
  for (const ball of targets) {
    for (const pocket of POCKETS) {
      const ghost = ghostToPocket(ball, pocket);
      if (pathBlocked(balls, cue.x, cue.z, ghost.x, ghost.z, new Set([cue.id, ball.id]))) continue;
      if (pathBlocked(balls, ball.x, ball.z, pocket.x, pocket.z, new Set([cue.id, ball.id]))) continue;
      const aim = Math.atan2(ghost.z - cue.z, ghost.x - cue.x);
      const toObj = Math.atan2(ball.z - ghost.z, ball.x - ghost.x);
      const cut = Math.abs(Math.atan2(Math.sin(aim - toObj), Math.cos(aim - toObj)));
      if (cut > 1.15) continue;
      const dist = Math.hypot(cue.x - ghost.x, cue.z - ghost.z) + Math.hypot(ball.x - pocket.x, ball.z - pocket.z);
      const score = (1.2 - cut) * 4 - dist * 0.45 + (ball.n === 8 ? 0.4 : 0);
      if (!best || score > best.score) best = { score, aim, cut, dist };
    }
  }
  if (best && best.cut < level.cut + 0.5 && best.score > (levelName === 'facil' ? 1.1 : 0.05)) {
    const wobble = (Math.random() - 0.5) * level.err * (1 + best.cut * 2);
    const power = Math.max(0.2, Math.min(0.78, 0.24 + best.dist * 0.16));
    return { angle: best.aim + wobble, power, spinX: 0, spinY: best.dist > 1.2 ? 0.2 : 0 };
  }
  const ball = targets[0];
  if (!ball) return { angle: 0, power: 0.35, spinX: 0, spinY: 0 };
  const aim = Math.atan2(ball.z - cue.z, ball.x - cue.x) + (Math.random() - 0.5) * level.err;
  return { angle: aim, power: 0.22 + Math.random() * 0.1, spinX: 0, spinY: -0.4 };
}

function pickPlace(match, balls) {
  const kitchen = match.inHand !== 'table';
  let best = kitchen ? { x: HEAD - 0.16, z: 0.06 } : { x: 0, z: 0 };
  let bestScore = -1e9;
  for (let i = 0; i < 16; i++) {
    const x = kitchen ? HEAD - 0.06 - Math.random() * 0.28 : (Math.random() - 0.5) * (FOOT * 1.4);
    const z = (Math.random() - 0.5) * (kitchen ? 0.55 : 0.7);
    if (kitchen ? !inKitchen(x, z) : !onCloth(x, z)) continue;
    if (balls.some((b) => !b.pocketed && b.id !== 'cue' && Math.hypot(b.x - x, b.z - z) < DIAM + 0.01)) continue;
    const fake = placed(balls, { x, z });
    const cue = fake.find((b) => b.id === 'cue');
    let score = 0;
    for (const id of ballOnIds(match, fake)) {
      const b = fake.find((ball) => ball.id === id);
      if (!b) continue;
      if (!pathBlocked(fake, cue.x, cue.z, b.x, b.z, new Set(['cue', id]))) score += 3;
      score -= Math.hypot(cue.x - b.x, cue.z - b.z) * 0.25;
    }
    if (kitchen) score -= Math.abs(z) * 0.2;
    if (score > bestScore) { bestScore = score; best = { x, z }; }
  }
  return best;
}

function placed(balls, spot) {
  return balls.map((b) => b.id === 'cue' ? { ...b, x: spot.x, z: spot.z, pocketed: false } : b);
}

export function botLevel(seat) { return seat.bot || 'medio'; }
