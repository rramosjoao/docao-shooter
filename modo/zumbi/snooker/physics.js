// Mesa de sinuca de bar, em metros. Física 2D no pano: bolas, tabelas com vão de caçapa, bicos e efeito.
export const L = 2.1;
export const W = 1.05;
export const R = 0.027;
export const DIAM = R * 2;
const HX = L / 2;
const HZ = W / 2;

// Cozinha no lado de quem sai (−x). A linha não faz parte da cozinha. O pé fica no +x.
export const HEAD = -L / 4;
export const FOOT = L / 4;

const POCKET_R = 0.07;
export const POCKETS = [
  { id: 'bl', x: -HX - 0.012, z: -HZ - 0.012 },
  { id: 'tl', x: HX + 0.012, z: -HZ - 0.012 },
  { id: 'br', x: -HX - 0.012, z: HZ + 0.012 },
  { id: 'tr', x: HX + 0.012, z: HZ + 0.012 },
  { id: 'ml', x: 0, z: -HZ - 0.028 },
  { id: 'mr', x: 0, z: HZ + 0.028 },
];

function jaw(x, z) { return { x, z, r: 0.016 }; }
const JAWS = [
  jaw(-HX + 0.078, -HZ + 0.012), jaw(-HX + 0.012, -HZ + 0.078),
  jaw(HX - 0.078, -HZ + 0.012), jaw(HX - 0.012, -HZ + 0.078),
  jaw(-HX + 0.078, HZ - 0.012), jaw(-HX + 0.012, HZ - 0.078),
  jaw(HX - 0.078, HZ - 0.012), jaw(HX - 0.012, HZ - 0.078),
  jaw(-0.055, -HZ + 0.01), jaw(0.055, -HZ + 0.01),
  jaw(-0.055, HZ - 0.01), jaw(0.055, HZ - 0.01),
];

// Tabelas já no espaço do centro da bola (encolhidas de um raio). Vãos nas caçapas.
function rails() {
  const ix = HX - R;
  const iz = HZ - R;
  const c = 0.09;
  const s = 0.075;
  const seg = (x1, z1, x2, z2) => {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz) || 1;
    return { x1, z1, x2, z2, len, tx: dx / len, tz: dz / len, nx: -dz / len, nz: dx / len };
  };
  return [
    seg(-ix + c, iz, -s, iz), seg(s, iz, ix - c, iz),
    seg(-ix + c, -iz, -s, -iz), seg(s, -iz, ix - c, -iz),
    seg(ix, -iz + c, ix, iz - c),
    seg(-ix, -iz + c, -ix, iz - c),
  ].map((rail) => {
    // normal para dentro da mesa
    const mx = (rail.x1 + rail.x2) / 2, mz = (rail.z1 + rail.z2) / 2;
    if (rail.nx * -mx + rail.nz * -mz < 0) { rail.nx *= -1; rail.nz *= -1; }
    return rail;
  });
}
const RAILS = rails();

export function inKitchen(x, z) {
  return x < HEAD - 0.001 && x > -HX + R + 0.012 && Math.abs(z) < HZ - R - 0.012;
}

export function onCloth(x, z) {
  return Math.abs(x) < HX - R - 0.01 && Math.abs(z) < HZ - R - 0.01;
}

export function makeBall(spec) {
  return {
    id: spec.id, name: spec.name, value: spec.value || 0, color: spec.color, spot: spec.spot || null,
    n: spec.n || 0, group: spec.group || null, stripe: !!spec.stripe,
    x: spec.x, z: spec.z, vx: 0, vz: 0, sx: 0, sz: 0, pocketed: false, r: R,
  };
}

export function createWorld(balls) {
  return { balls, firstId: null, potted: [], off: [], railBalls: new Set(), railAfter: false };
}

export function beginShot(world) {
  world.firstId = null;
  world.potted = [];
  world.off = [];
  world.railBalls = new Set();
  world.railAfter = false;
}

export function snapshot(world) {
  return world.balls.map((b) => ({ id: b.id, x: b.x, z: b.z, pocketed: b.pocketed }));
}

export function restore(world, shot) {
  for (const s of shot) {
    const b = world.balls.find((ball) => ball.id === s.id);
    if (!b) continue;
    b.x = s.x; b.z = s.z; b.vx = 0; b.vz = 0; b.sx = 0; b.sz = 0; b.pocketed = s.pocketed;
  }
  beginShot(world);
}

export function strike(world, { angle, power, spinX = 0, spinY = 0 }) {
  const cue = world.balls.find((b) => b.id === 'cue' && !b.pocketed);
  if (!cue) return;
  const speed = 1.05 + Math.pow(Math.max(0, Math.min(1, power)), 1.35) * 8.4;
  const dx = Math.cos(angle), dz = Math.sin(angle);
  cue.vx = dx * speed;
  cue.vz = dz * speed;
  const follow = Math.max(-1, Math.min(1, spinY));
  const side = Math.max(-1, Math.min(1, spinX));
  cue.sx = dx * speed * (0.25 + follow * 1.05) - dz * speed * side * 0.85;
  cue.sz = dz * speed * (0.25 + follow * 1.05) + dx * speed * side * 0.85;
}

function alive(b) {
  return !b.pocketed && (b.vx * b.vx + b.vz * b.vz > 0.0004 || b.sx * b.sx + b.sz * b.sz > 0.0008);
}

export function moving(world) {
  return world.balls.some(alive);
}

function cloth(b, dt) {
  if (b.pocketed) return;
  const grip = Math.min(1, 4.2 * dt);
  b.vx += (b.sx - b.vx) * grip;
  b.vz += (b.sz - b.vz) * grip;
  b.sx += (b.vx - b.sx) * grip * 0.55;
  b.sz += (b.vz - b.sz) * grip * 0.55;
  const drag = Math.exp(-0.62 * dt);
  b.vx *= drag; b.vz *= drag; b.sx *= drag; b.sz *= drag;
  const sp = Math.hypot(b.vx, b.vz);
  if (sp < 0.018) { b.vx = 0; b.vz = 0; b.sx = 0; b.sz = 0; }
}

function separatePair(a, b, nx, nz, overlap) {
  const push = overlap / 2 + 0.00001;
  a.x -= nx * push; a.z -= nz * push;
  b.x += nx * push; b.z += nz * push;
}

function hitBalls(world, a, b) {
  if (a.pocketed || b.pocketed) return;
  const dx = b.x - a.x, dz = b.z - a.z;
  const min = a.r + b.r;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min || d2 < 1e-10) return;
  const d = Math.sqrt(d2);
  const nx = dx / d, nz = dz / d;
  separatePair(a, b, nx, nz, min - d);
  const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (rel >= 0) return;
  const e = 0.95;
  const j = -(1 + e) * rel / 2;
  a.vx -= j * nx; a.vz -= j * nz;
  b.vx += j * nx; b.vz += j * nz;
  // efeito lateral joga a bola alvo um pouco para o lado (throw)
  const tx = -nz, tz = nx;
  const throwSpin = ((a.id === 'cue' ? a : b).sx * tx + (a.id === 'cue' ? a : b).sz * tz) * 0.06;
  if (a.id === 'cue') { b.vx += tx * throwSpin; b.vz += tz * throwSpin; }
  if (b.id === 'cue') { a.vx -= tx * throwSpin; a.vz -= tz * throwSpin; }
  const cue = a.id === 'cue' ? a : b.id === 'cue' ? b : null;
  const other = cue === a ? b : cue === b ? a : null;
  if (cue && other && !world.firstId) world.firstId = other.id;
  // o choque come parte do spin da branca
  if (cue) { cue.sx *= 0.45; cue.sz *= 0.45; }
}

function hitRail(b, rail, world) {
  if (b.pocketed) return;
  const vx = b.x - rail.x1, vz = b.z - rail.z1;
  let t = vx * rail.tx + vz * rail.tz;
  t = Math.max(0, Math.min(rail.len, t));
  const px = rail.x1 + rail.tx * t;
  const pz = rail.z1 + rail.tz * t;
  const dx = b.x - px, dz = b.z - pz;
  const d2 = dx * dx + dz * dz;
  if (d2 > R * R || d2 < 1e-12) return;
  const d = Math.sqrt(d2);
  const nx = dx / d, nz = dz / d;
  // só a face de dentro
  if (nx * rail.nx + nz * rail.nz < 0.2) return;
  b.x += nx * (R - d);
  b.z += nz * (R - d);
  const vn = b.vx * nx + b.vz * nz;
  if (vn >= 0) return;
  const tx = -nz, tz = nx;
  const vt = b.vx * tx + b.vz * tz;
  const spinT = b.sx * tx + b.sz * tz;
  const bounceT = vt * 0.62 + (spinT - vt) * 0.42;
  const e = 0.8;
  b.vx = vn * -e * nx + bounceT * tx;
  b.vz = vn * -e * nz + bounceT * tz;
  b.sx *= 0.35; b.sz *= 0.35;
  if (world) {
    world.railBalls.add(b.id);
    if (world.firstId) world.railAfter = true;
  }
}

function hitJaw(b, jawPost) {
  if (b.pocketed) return;
  const dx = b.x - jawPost.x, dz = b.z - jawPost.z;
  const min = b.r + jawPost.r;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min || d2 < 1e-12) return;
  const d = Math.sqrt(d2);
  const nx = dx / d, nz = dz / d;
  b.x += nx * (min - d);
  b.z += nz * (min - d);
  const vn = b.vx * nx + b.vz * nz;
  if (vn >= 0) return;
  const e = 0.55;
  b.vx -= (1 + e) * vn * nx;
  b.vz -= (1 + e) * vn * nz;
  b.sx *= 0.5; b.sz *= 0.5;
}

function nearPocket(b) {
  for (const p of POCKETS) {
    const dx = b.x - p.x, dz = b.z - p.z;
    if (dx * dx + dz * dz < POCKET_R * POCKET_R) return p;
  }
  return null;
}

function pocketTest(world, b) {
  if (b.pocketed) return;
  const p = nearPocket(b);
  if (!p) {
    if (Math.abs(b.x) > HX + 0.14 || Math.abs(b.z) > HZ + 0.14) {
      b.pocketed = true; b.vx = b.vz = b.sx = b.sz = 0;
      world.off.push(b.id);
    }
    return;
  }
  const into = Math.abs(b.x) > HX - 0.03 || Math.abs(b.z) > HZ - 0.03;
  if (!into && Math.hypot(b.vx, b.vz) > 0.35) return;
  b.pocketed = true; b.vx = b.vz = b.sx = b.sz = 0;
  world.potted.push(b.id);
}

export function step(world, dt) {
  const balls = world.balls.filter((b) => !b.pocketed);
  let maxV = 0;
  for (const b of balls) maxV = Math.max(maxV, Math.hypot(b.vx, b.vz));
  const n = Math.max(4, Math.min(24, Math.ceil((maxV * dt) / (R * 0.45))));
  const h = dt / n;
  for (let s = 0; s < n; s++) {
    for (const b of balls) {
      if (b.pocketed) continue;
      cloth(b, h);
      b.x += b.vx * h;
      b.z += b.vz * h;
    }
    for (let i = 0; i < balls.length; i++) for (let k = i + 1; k < balls.length; k++) hitBalls(world, balls[i], balls[k]);
    for (const b of balls) {
      if (b.pocketed) continue;
      if (nearPocket(b)) continue;
      for (const rail of RAILS) hitRail(b, rail, world);
      for (const post of JAWS) hitJaw(b, post);
    }
    for (const b of balls) pocketTest(world, b);
  }
  return moving(world);
}

export function pathBlocked(balls, x1, z1, x2, z2, ignore) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return false;
  const nx = dx / len, nz = dz / len;
  for (const b of balls) {
    if (b.pocketed || ignore.has(b.id)) continue;
    const fx = b.x - x1, fz = b.z - z1;
    const t = fx * nx + fz * nz;
    if (t <= R || t >= len - R) continue;
    const perp = Math.abs(fx * nz - fz * nx);
    if (perp < DIAM - 0.001) return true;
  }
  return false;
}

// Consegue tocar algum ponto da bola alvo em linha reta.
export function canHit(balls, cue, target) {
  if (!cue || !target || cue.pocketed || target.pocketed) return false;
  const samples = 8;
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const px = target.x + Math.cos(a) * (target.r - 0.002);
    const pz = target.z + Math.sin(a) * (target.r - 0.002);
    if (!pathBlocked(balls, cue.x, cue.z, px, pz, new Set([cue.id, target.id]))) return true;
  }
  return false;
}

export function aimAt(balls, cue, angle) {
  if (!cue || cue.pocketed) return null;
  const dx = Math.cos(angle), dz = Math.sin(angle);
  let best = null, bestT = Infinity;
  for (const b of balls) {
    if (b.pocketed || b.id === 'cue') continue;
    const fx = b.x - cue.x, fz = b.z - cue.z;
    const t = fx * dx + fz * dz;
    if (t <= 0) continue;
    const perp2 = fx * fx + fz * fz - t * t;
    const rad = DIAM;
    if (perp2 > rad * rad) continue;
    const hit = t - Math.sqrt(Math.max(0, rad * rad - perp2));
    if (hit < bestT && hit > 0.001) { bestT = hit; best = b; }
  }
  if (!best) {
    // uma tabela, traço curto
    let tHit = 8;
    let nx = 0, nz = 0;
    const ix = HX - R, iz = HZ - R;
    if (dx > 0.001) tHit = Math.min(tHit, (ix - cue.x) / dx);
    if (dx < -0.001) { const t = (-ix - cue.x) / dx; if (t < tHit) { tHit = t; nx = 1; } }
    if (dz > 0.001) { const t = (iz - cue.z) / dz; if (t < tHit) { tHit = t; nx = 0; nz = -1; } }
    if (dz < -0.001) { const t = (-iz - cue.z) / dz; if (t < tHit) { tHit = t; nx = 0; nz = 1; } }
    if (dx > 0.001 && (ix - cue.x) / dx === tHit) { nx = -1; nz = 0; }
    const px = cue.x + dx * tHit, pz = cue.z + dz * tHit;
    const rx = dx - 2 * (dx * nx + dz * nz) * nx;
    const rz = dz - 2 * (dx * nx + dz * nz) * nz;
    return { ball: null, cushion: { x: px, z: pz, rx, rz } };
  }
  const gx = cue.x + dx * bestT, gz = cue.z + dz * bestT;
  const ox = best.x - gx, oz = best.z - gz;
  const ol = Math.hypot(ox, oz) || 1;
  return { ball: best, ghost: { x: gx, z: gz }, objectDir: { x: ox / ol, z: oz / ol } };
}

function castBall(x, z, dx, dz) {
  const ix = HX - R;
  const iz = HZ - R;
  let tHit = 6;
  const clip = (t) => { if (t > 0.02 && t < tHit) tHit = t; };
  if (Math.abs(dx) > 0.001) clip((Math.sign(dx) * ix - x) / dx);
  if (Math.abs(dz) > 0.001) clip((Math.sign(dz) * iz - z) / dz);
  tHit = Math.max(0.04, tHit);
  let pocket = null;
  let endT = tHit;
  for (let i = 1; i <= 28; i++) {
    const t = (tHit * i) / 28;
    const px = x + dx * t;
    const pz = z + dz * t;
    for (const p of POCKETS) {
      if (Math.hypot(px - p.x, pz - p.z) < POCKET_R) {
        pocket = p;
        endT = t;
        i = 29;
        break;
      }
    }
  }
  return { point: { x: x + dx * endT, z: z + dz * endT }, pocket };
}

// Onde a branca e a bola alvo vão parar nesta mira. Uma tabela, sem piloto automático.
export function previewShot(balls, cue, angle) {
  const hit = aimAt(balls, cue, angle);
  if (!hit) return null;
  if (!hit.ball) {
    const c = hit.cushion;
    return {
      ball: null,
      cushion: c,
      reflect: c ? { x: c.x + c.rx * 0.45, z: c.z + c.rz * 0.45 } : null,
    };
  }
  const dir = hit.objectDir;
  const cast = castBall(hit.ball.x, hit.ball.z, dir.x, dir.z);
  const aimx = Math.cos(angle);
  const aimz = Math.sin(angle);
  const align = aimx * dir.x + aimz * dir.z;
  let deflect;
  if (align > 0.98) deflect = { x: aimx, z: aimz, len: 0.12 };
  else {
    let tx = -dir.z;
    let tz = dir.x;
    if (aimx * tx + aimz * tz < 0) { tx = -tx; tz = -tz; }
    deflect = { x: tx, z: tz, len: 0.2 };
  }
  return { ball: hit.ball, ghost: hit.ghost, objectEnd: cast.point, pocket: cast.pocket, deflect };
}

export function ghostToPocket(ball, pocket) {
  const dx = ball.x - pocket.x, dz = ball.z - pocket.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: ball.x + (dx / len) * DIAM, z: ball.z + (dz / len) * DIAM };
}
