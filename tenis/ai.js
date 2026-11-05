import { sideOf } from './rules.js';

const LEVEL = {
  facil: { delay: 0.42, err: 1.5, miss: 0.22, speed: 5.2, kinds: ['reto', 'reto', 'liftado'] },
  medio: { delay: 0.2, err: 0.65, miss: 0.08, speed: 6.6, kinds: ['liftado', 'liftado', 'reto', 'cortado'] },
  dificil: { delay: 0.1, err: 0.28, miss: 0.03, speed: 7.4, kinds: ['liftado', 'reto', 'cortado', 'lob'] },
};

export function levelOf(name) {
  return LEVEL[name] || LEVEL.medio;
}

export function botAim(match, player, levelName, rng = Math.random) {
  const lv = levelOf(levelName);
  const side = sideOf(match, player.team);
  const far = -side;
  let x = (rng() * 2 - 1) * 3.2;
  let z = far * (7.2 + rng() * 3.4);
  if (rng() < lv.miss) x = Math.sign(x || 1) * (4.6 + rng() * 0.8);
  x += (rng() - 0.5) * lv.err;
  z += (rng() - 0.5) * lv.err;
  const kind = lv.kinds[Math.floor(rng() * lv.kinds.length)];
  return { x, z, kind };
}

export function botServeAim(match, spot, levelName, second, rng = Math.random) {
  const lv = levelOf(levelName);
  const xSign = spot.deuce ? -spot.side : spot.side;
  let x = xSign * (0.8 + rng() * 2.2);
  let z = -spot.side * (2.6 + rng() * 2.4);
  const loose = second ? lv.miss * 0.35 : lv.miss + 0.12;
  if (rng() < loose) z = -spot.side * (6.8 + rng());
  x += (rng() - 0.5) * lv.err * 0.4;
  return { x, z, kind: second ? 'saque2' : 'saque' };
}
