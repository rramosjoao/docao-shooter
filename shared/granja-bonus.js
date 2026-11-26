// Alvo de bônus da Granja. Disco no campo, de frente pra sacada.
// Miolo tira 2 s; o anel soma 2 s. Só o primeiro acerto vale, e só a Carabina.
// O plano é x = constante (a sacada atira para +x). Sem DOM e sem Three.js.
export const BONUS_CUT = 2;
export const BONUS_CENTER = -BONUS_CUT;
export const BONUS_RING = BONUS_CUT;

// ~110 m da sacada (x = -132). O miolo de 0,38 m é ~0,20° — tiro de luneta, no espírito do disco da Pocilga.
export const BONUS = {
  id: 'bonus',
  x: -22,
  y: 5.5,
  z: 36,
  yaw: Math.PI / 2,
  inner: 0.38,
  outer: 1.7,
  from: { minX: -140, maxX: -124, minY: 0.3, maxY: 3.4, minZ: 16, maxZ: 42 },
};

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

export function bonusLine(zone) {
  if (zone === 'center') return '-2s';
  if (zone === 'ring') return '+2s';
  return '—';
}

export function freshBonus() {
  return { locked: false, zone: null, delta: 0, text: '' };
}

export function acceptBonus(state, hit) {
  const cur = state || freshBonus();
  if (!hit || cur.locked) return { ...cur, accepted: false };
  const text = bonusLine(hit.zone);
  return { locked: true, zone: hit.zone, delta: hit.delta, text, accepted: true };
}

export function shotFields(e) {
  return !!(e && [e.ox, e.oy, e.oz, e.dx, e.dy, e.dz, e.w].every(finite));
}

export function bonusShape(e) {
  return !!(e && e.k === 'bonus' && shotFields(e));
}

// Raio contra o disco no plano x. A direção é normalizada aqui.
export function traceBonus(ox, oy, oz, dx, dy, dz, maxT = 180) {
  if (![ox, oy, oz, dx, dy, dz, maxT].every(finite)) return null;
  const len = Math.hypot(dx, dy, dz);
  if (!(len > 1e-8)) return null;
  const ux = dx / len, uy = dy / len, uz = dz / len;
  if (!(ux > 1e-4)) return null;
  const t = (BONUS.x - ox) / ux;
  if (!(t >= 0) || t > maxT) return null;
  const y = oy + uy * t, z = oz + uz * t;
  const dist = Math.hypot(y - BONUS.y, z - BONUS.z);
  if (dist > BONUS.outer + 1e-6) return null;
  const zone = dist <= BONUS.inner + 1e-9 ? 'center' : 'ring';
  const delta = zone === 'center' ? BONUS_CENTER : BONUS_RING;
  return { t, x: BONUS.x, y, z, dist, zone, delta, ox, oy, oz, dx: ux, dy: uy, dz: uz };
}

function inMouth(e) {
  const b = BONUS.from;
  return e.ox >= b.minX && e.ox <= b.maxX && e.oy >= b.minY && e.oy <= b.maxY && e.oz >= b.minZ && e.oz <= b.maxZ;
}

export function scoreShot(e, weapon) {
  if (!shotFields(e) || (e.k != null && e.k !== 'bonus') || e.w !== weapon || !inMouth(e)) return null;
  return traceBonus(e.ox, e.oy, e.oz, e.dx, e.dy, e.dz, 180);
}

export function aimAt(ox, oy, oz, x, y, z = BONUS.z) {
  const dx = x - ox, dy = y - oy, dz = z - oz;
  const len = Math.hypot(dx, dy, dz) || 1;
  return { ox, oy, oz, dx: dx / len, dy: dy / len, dz: dz / len };
}

export function readBonus(events, weapon) {
  const none = { zone: null, delta: 0, dist: null };
  if (!Array.isArray(events)) return none;
  let started = false, finished = false;
  for (const e of events) {
    if (!e) continue;
    if (e.k === 'start') { started = true; continue; }
    if (e.k === 'finish') { finished = true; continue; }
    if (e.k !== 'bonus' || !started || finished) continue;
    const hit = scoreShot(e, weapon);
    if (!hit) continue;
    return { zone: hit.zone, delta: hit.delta, dist: hit.dist };
  }
  return none;
}
