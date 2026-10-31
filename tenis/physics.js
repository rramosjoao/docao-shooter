// Bola de tênis de quadra. A rede fica em z = 0; y sobe.
export const BALL_R = 0.034;
export const HALF = 11.885;
export const SINGLES = 4.115;
export const DOUBLES = 5.485;
export const SERVICE = 6.4;
export const NET_CENTER = 0.914;
export const NET_POST = 1.07;
const G = 9.81;
const DRAG = 0.016;

const SPECS = {
  reto: { speed: 24, magnus: 0.04, kick: 0.4 },
  liftado: { speed: 22, magnus: 0.28, kick: 3.2 },
  cortado: { speed: 20, magnus: -0.16, kick: -2.4 },
  lob: { speed: 15.5, magnus: 0, kick: 0, loft: 50 },
  curto: { speed: 13.5, magnus: 0.05, kick: 0.2 },
  saque: { speed: 26, magnus: 0.05, kick: 0.6 },
  saque2: { speed: 21, magnus: 0.22, kick: 2.2 },
};

export function netHeight(x, doubles) {
  const L = doubles ? 6.4 : 5.03;
  const ax = Math.abs(x);
  if (ax > L + 0.04) return null;
  return NET_CENTER + (NET_POST - NET_CENTER) * (Math.min(ax, L) / L);
}

export function makeBall(partial = {}) {
  return {
    x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0,
    magnus: 0, kick: 0, kind: 'reto',
    bounced: false, net: null, taped: false, dead: false,
    ...partial,
  };
}

export function stepBall(ball, dt, doubles = false) {
  ball.bounced = false;
  ball.net = null;
  if (ball.dead) return ball;
  const p0x = ball.x, p0y = ball.y, p0z = ball.z;
  const horiz = Math.hypot(ball.vx, ball.vz);
  const speed = Math.hypot(horiz, ball.vy);
  const drag = DRAG * speed;
  ball.vx -= drag * ball.vx * dt;
  ball.vz -= drag * ball.vz * dt;
  ball.vy += (-G - drag * ball.vy) * dt;
  ball.vy -= ball.magnus * horiz * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;
  if ((p0z < 0 && ball.z >= 0) || (p0z > 0 && ball.z <= 0)) {
    const denom = ball.z - p0z || 1e-6;
    const u = (0 - p0z) / denom;
    const x = p0x + u * (ball.x - p0x);
    const y = p0y + u * (ball.y - p0y);
    const h = netHeight(x, doubles);
    if (h != null && y <= h + BALL_R) {
      ball.net = y <= h ? 'hit' : 'tape';
      if (ball.net === 'tape') ball.taped = true;
      if (ball.net === 'hit') {
        ball.x = x;
        ball.y = Math.max(BALL_R, y);
        ball.z = Math.sign(p0z || -1) * 0.06;
        ball.vz = -Math.sign(ball.vz || 1) * Math.abs(ball.vz) * 0.15;
        ball.vy = Math.min(0, ball.vy);
        ball.dead = true;
      }
    }
  }
  if (ball.y <= BALL_R && ball.vy <= 0) {
    ball.y = BALL_R;
    const incoming = -ball.vy;
    const e = 0.78;
    ball.vy = e * incoming;
    const hsp = Math.hypot(ball.vx, ball.vz);
    if (hsp > 0.05) {
      const loss = Math.min(hsp, 0.62 * (1 + e) * incoming);
      const scale = (hsp - loss) / hsp;
      const kx = ball.vx / hsp;
      const kz = ball.vz / hsp;
      ball.vx = ball.vx * scale + kx * (ball.kick || 0);
      ball.vz = ball.vz * scale + kz * (ball.kick || 0);
    }
    if (ball.vy < 0.7 && Math.hypot(ball.vx, ball.vz) < 0.85) {
      ball.vx = ball.vy = ball.vz = 0;
      ball.dead = true;
    }
    ball.bounced = true;
  }
  return ball;
}

export function firstBounce(ball, doubles = false) {
  const b = makeBall({ ...ball, bounced: false, net: null, taped: false, dead: false });
  const dt = 1 / 90;
  for (let t = 0; t < 5; t += dt) {
    stepBall(b, dt, doubles);
    if (b.net === 'hit') return { net: 'hit', x: b.x, y: b.y, z: b.z, tape: false };
    if (b.bounced) return { net: null, x: b.x, y: b.y, z: b.z, tape: b.taped };
  }
  return null;
}

function pack(from, aim, spec, loftDeg, kind) {
  const loft = loftDeg * Math.PI / 180;
  const dx = aim.x - from.x;
  const dz = aim.z - from.z;
  const dist = Math.hypot(dx, dz) || 1;
  const c = Math.cos(loft);
  const s = Math.sin(loft);
  return {
    vx: c * spec.speed * dx / dist,
    vy: s * spec.speed,
    vz: c * spec.speed * dz / dist,
    magnus: spec.magnus,
    kick: spec.kick,
    kind,
  };
}

export function launchAt(from, aim, kind, doubles = false) {
  const spec = SPECS[kind] || SPECS.reto;
  if (spec.loft != null) return pack(from, aim, spec, spec.loft, kind);
  let best = null;
  let bestScore = Infinity;
  for (let i = 0; i < 20; i++) {
    const loft = -2 + i * 2.6;
    const shot = pack(from, aim, spec, loft, kind);
    const land = firstBounce(makeBall({ x: from.x, y: from.y, z: from.z, ...shot }), doubles);
    if (!land || land.net === 'hit') continue;
    const dx = land.x - aim.x;
    const dz = land.z - aim.z;
    const score = dx * dx + dz * dz;
    if (score < bestScore) {
      bestScore = score;
      best = shot;
    }
  }
  return best || pack(from, aim, spec, 14, kind);
}

export function flightPlan(ball, doubles = false) {
  const b = makeBall({ ...ball, bounced: false, net: null, taped: false, dead: false });
  const dt = 1 / 90;
  let bounce = null;
  let strike = null;
  let when = null;
  for (let t = 0; t < 4.5; t += dt) {
    stepBall(b, dt, doubles);
    if (b.net === 'hit') return { bounce, strike, net: true, t: when };
    if (b.bounced && !bounce) bounce = { x: b.x, z: b.z, tape: b.taped };
    if (bounce && !strike && b.y > 0.55 && b.y < 1.55) {
      strike = { x: b.x, z: b.z };
      when = t;
      break;
    }
    if (b.dead && bounce) break;
  }
  return { bounce, strike: strike || bounce, net: false, t: when };
}

export function inPlay(x, z, doubles) {
  const w = doubles ? DOUBLES : SINGLES;
  return Math.abs(x) <= w + BALL_R && Math.abs(z) <= HALF + BALL_R && Math.abs(z) > 0.2;
}

export function inServeBox(x, z, side, deuce) {
  const xSign = deuce ? -side : side;
  const zSign = -side;
  if (Math.abs(z) < 0.2 || Math.abs(z) > SERVICE + BALL_R) return false;
  if (Math.sign(z) !== zSign) return false;
  if (Math.abs(x) > SINGLES + BALL_R) return false;
  if (Math.abs(x) > 0.08 && Math.sign(x) !== xSign) return false;
  return true;
}
