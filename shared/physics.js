// ============================================================
//  Física/colisão compartilhada (sem DOM, sem Three.js) — usada pelo servidor online.
//  mapSolids(map) reproduz exatamente as caixas de colisão que world.js cria no cliente
//  (o teste test-online.mjs confere que são idênticas). createPhysics() traz colisão AABB com teto,
//  chão/rampas, movimento, raio contra o mundo (caixas + rampas) e o passo físico do Copo Bomba.
// ============================================================
import { GRAV, STEP, RADIUS, HEIGHT, NADE } from './rules.js';

export const WALL_COLLIDE_H = 40;
export const FALL_FLOOR = -40; // chão fantasma do abismo; a morte acontece bem antes (map.fall.y)
// map.fall = { y: -8, margin?: metros da borda sem chão, rects?: [[x0,z0,x1,z1]] }
export function baselineY(fall, x, z, hx, hz) {
  if (!fall) return 0;
  if (fall.margin && (Math.abs(x) > hx - fall.margin || Math.abs(z) > hz - fall.margin)) return FALL_FLOOR;
  if (fall.rects) for (const r of fall.rects) if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) return FALL_FLOOR;
  return 0;
}
export function fellOff(fall, y) { return !!(fall && y < fall.y); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const box = (x0, y0, z0, x1, y1, z1, ramp = null) => ({ min: { x: x0, y: y0, z: z0 }, max: { x: x1, y: y1, z: z1 }, ramp });

export function mapSolids(map) {
  const out = [], [hx, hz] = map.size, wh = map.wallH || 4;
  const add = (x0, y0, z0, x1, y1, z1, ramp = null, top = null) => out.push(box(x0, y0, z0, x1, top ?? y1, z1, ramp));
  add(-hx - 1, 0, -hz - 1, hx + 1, wh, -hz, null, WALL_COLLIDE_H); add(-hx - 1, 0, hz, hx + 1, wh, hz + 1, null, WALL_COLLIDE_H);
  add(-hx - 1, 0, -hz, -hx, wh, hz, null, WALL_COLLIDE_H); add(hx, 0, -hz, hx + 1, wh, hz, null, WALL_COLLIDE_H);
  for (const o of map.boxes) { const [x0, y0, z0, x1, y1, z1] = o.b; if (x1 - x0 < 0.01 || y1 - y0 < 0.01 || z1 - z0 < 0.01) continue; add(x0, y0, z0, x1, y1, z1, o.ramp || null); }
  for (const p of map.props || []) {
    const y = p.y || 0;
    switch (p.t) {
      case 'keg': { const r = p.r || 0.48, h = p.h || 1.1; add(p.x - r * 0.85, y, p.z - r * 0.85, p.x + r * 0.85, y + h, p.z + r * 0.85); break; }
      case 'cup': if (!p.deco) { const s = p.s || 4; add(p.x - 0.11 * s, y, p.z - 0.11 * s, p.x + 0.11 * s, y + 0.31 * s, p.z + 0.11 * s); } break;
      case 'bus': add(p.x - 5, y, p.z - 1.4, p.x + 5, y + 3.1, p.z + 1.4); break;
      case 'truck': add(p.x - 4, y, p.z - 1.25, p.x + 2, y + 3.2, p.z + 1.25); add(p.x + 2, y, p.z - 1.2, p.x + 4.3, y + 2.6, p.z + 1.2); break;
      case 'tree': add(p.x - 0.4, y, p.z - 0.4, p.x + 0.4, y + 3, p.z + 0.4); break;
      case 'silo': { const q = p.r * 0.9; add(p.x - q, y, p.z - q, p.x + q, y + p.h, p.z + q); break; }
      case 'hay': add(p.x - 1, y, p.z - 0.6, p.x + 1, y + 1.2, p.z + 0.6); break;
      case 'stall': add(p.x - 1.2, y, p.z - 0.6, p.x + 1.2, y + 1.0, p.z + 0.6); add(p.x - 1.6, y + 2.6, p.z - 1.1, p.x + 1.6, y + 2.72, p.z + 1.1); break;
      case 'awning': add(p.x0, p.y, p.z0, p.x1, p.y + 0.12, p.z1); break;
      case 'jar': add(p.x - 0.4, y, p.z - 0.4, p.x + 0.4, y + 1.1, p.z + 0.4); break;
      case 'pine': add(p.x - 0.4, y, p.z - 0.4, p.x + 0.4, y + 3.1, p.z + 0.4); break;
      case 'dome': { const r = p.r || 2.2, h = (p.h || 1.3) + r * 0.55; add(p.x - r, y, p.z - r, p.x + r, y + h, p.z + r); break; }
      case 'tank': { const r = p.r || 1.15, h = p.h || 2.5; add(p.x - r, y, p.z - r, p.x + r, y + h, p.z + r); break; }
      default: break; // placas, neon, rua, água, estandarte, vidro: sem colisão
    }
  }
  return out;
}

export function createPhysics(solids, size, fall = null) {
  const [hx, hz] = size;
  const GRID = 4, grid = new Map(), NONE = [];
  const key = (ix, iz) => ix * 100003 + iz;
  for (const s of solids) for (let ix = Math.floor((s.min.x - 1) / GRID); ix <= Math.floor((s.max.x + 1) / GRID); ix++)
    for (let iz = Math.floor((s.min.z - 1) / GRID); iz <= Math.floor((s.max.z + 1) / GRID); iz++) { const k = key(ix, iz); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(s); }
  const solidsAt = (x, z) => grid.get(key(Math.floor(x / GRID), Math.floor(z / GRID))) || NONE;
  function topAt(s, x, z) {
    if (!s.ramp) return s.max.y;
    let t = s.ramp.axis === 'x' ? (x - s.min.x) / (s.max.x - s.min.x) : (z - s.min.z) / (s.max.z - s.min.z);
    t = clamp(t, 0, 1); if (s.ramp.dir < 0) t = 1 - t;
    return s.min.y + t * (s.max.y - s.min.y);
  }
  function collides(x, y, z) {
    for (const s of solidsAt(x, z)) if (x + RADIUS > s.min.x && x - RADIUS < s.max.x && z + RADIUS > s.min.z && z - RADIUS < s.max.z) {
      const top = topAt(s, clamp(x, s.min.x, s.max.x), clamp(z, s.min.z, s.max.z)); if (y < top - STEP && y + HEIGHT > s.min.y) return true;
    }
    return false;
  }
  function groundAt(x, z, y) {
    let g = baselineY(fall, x, z, hx, hz); const m = RADIUS * 0.6;
    for (const s of solidsAt(x, z)) if (x > s.min.x - m && x < s.max.x + m && z > s.min.z - m && z < s.max.z + m) {
      const top = topAt(s, clamp(x, s.min.x, s.max.x), clamp(z, s.min.z, s.max.z)); if (top <= y + STEP && top > g) g = top;
    }
    return g;
  }
  function ceilingAt(x, z, headY) {
    let c = Infinity; const r = RADIUS * 0.9;
    for (const s of solidsAt(x, z)) if (x + r > s.min.x && x - r < s.max.x && z + r > s.min.z && z - r < s.max.z && s.min.y >= headY - 0.25 && s.min.y < c) c = s.min.y;
    return c;
  }
  function moveEntity(e, dt) { // mesmo algoritmo do cliente (main.js)
    let blocked = false;
    const nx = e.pos.x + e.vel.x * dt; if (!collides(nx, e.pos.y, e.pos.z)) e.pos.x = nx; else { blocked = true; e.vel.x = 0; }
    const nz = e.pos.z + e.vel.z * dt; if (!collides(e.pos.x, e.pos.y, nz)) e.pos.z = nz; else { blocked = true; e.vel.z = 0; }
    e.vel.y += GRAV * dt; let ny = e.pos.y + e.vel.y * dt;
    if (e.vel.y > 0) { const c = ceilingAt(e.pos.x, e.pos.z, e.pos.y + HEIGHT); if (ny + HEIGHT > c) { ny = Math.max(e.pos.y, c - HEIGHT); e.vel.y = 0; } }
    const g = groundAt(e.pos.x, e.pos.z, e.pos.y);
    if (ny <= g) { e.pos.y = g; e.vel.y = 0; e.onGround = true; }
    else if (e.onGround && e.vel.y <= 0 && ny - g < STEP) { e.pos.y = g; e.vel.y = 0; }
    else { e.pos.y = ny; e.onGround = false; }
    e.pos.x = clamp(e.pos.x, -hx + RADIUS, hx - RADIUS); e.pos.z = clamp(e.pos.z, -hz + RADIUS, hz - RADIUS);
    return blocked;
  }
  // raio contra o mundo: chão (y=0) + caixas; rampas são cunhas (resolve a interseção com o plano inclinado)
  function rayWorld(o, d, far) {
    let best = far, hit = false;
    if (d.y < -1e-6) for (const fy of [0, FALL_FLOOR]) {
      const t = (fy - o.y) / d.y; if (t <= 0 || t >= best) continue;
      if (baselineY(fall, o.x + d.x * t, o.z + d.z * t, hx, hz) === fy) { best = t; hit = true; }
    }
    // percorre as células da grade ao longo do raio (passos de meia célula) coletando caixas candidatas
    const seen = new Set(); const n = Math.ceil(far / (GRID * 0.5)) + 1;
    for (let i = 0; i <= n; i++) {
      const t = Math.min(far, i * GRID * 0.5); if (t > best + GRID) break;
      for (const s of solidsAt(o.x + d.x * t, o.z + d.z * t)) {
        if (seen.has(s)) continue; seen.add(s);
        const r = rayBox(o, d, s); if (r !== null && r < best) { best = r; hit = true; }
      }
    }
    return hit ? best : null;
  }
  function rayBox(o, d, s) {
    let t0 = 0, t1 = Infinity;
    for (const ax of ['x', 'y', 'z']) {
      if (Math.abs(d[ax]) < 1e-9) { if (o[ax] < s.min[ax] || o[ax] > s.max[ax]) return null; continue; }
      let a = (s.min[ax] - o[ax]) / d[ax], b = (s.max[ax] - o[ax]) / d[ax]; if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null;
    }
    if (!s.ramp) return t0;
    const f = (t) => (o.y + d.y * t) - topAt(s, o.x + d.x * t, o.z + d.z * t); // >0 acima da cunha
    const f0 = f(t0), f1 = f(t1);
    if (f0 <= 1e-4) return t0; if (f1 > 0) return null;
    return t0 + (f0 / (f0 - f1)) * (t1 - t0);
  }
  const losClear = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dy, dz); if (L < 1e-6) return true; return rayWorld(a, { x: dx / L, y: dy / L, z: dz / L }, L - 0.3) === null; };
  function nadeBlocked(x, y, z) {
    for (const sd of solidsAt(x, z)) if (x > sd.min.x - NADE.r && x < sd.max.x + NADE.r && z > sd.min.z - NADE.r && z < sd.max.z + NADE.r && y > sd.min.y - NADE.r) {
      const top = topAt(sd, clamp(x, sd.min.x, sd.max.x), clamp(z, sd.min.z, sd.max.z)); if (y < top - 0.05) return true;
    }
    return false;
  }
  function stepNade(pos, vel, dt) { // igual ao cliente
    vel.y += NADE.grav * dt;
    const nx = pos.x + vel.x * dt; if (nadeBlocked(nx, pos.y, pos.z)) vel.x *= -0.45; else pos.x = nx;
    const nz = pos.z + vel.z * dt; if (nadeBlocked(pos.x, pos.y, nz)) vel.z *= -0.45; else pos.z = nz;
    if (vel.y > 0 && nadeBlocked(pos.x, pos.y + vel.y * dt + NADE.r, pos.z)) vel.y = -vel.y * 0.35;
    const ny = pos.y + vel.y * dt; const g = groundAt(pos.x, pos.z, pos.y - NADE.r + 0.3) + NADE.r;
    if (ny <= g) { pos.y = g; vel.y = Math.abs(vel.y) > 1.2 ? -vel.y * 0.42 : 0; vel.x *= 0.72; vel.z *= 0.72; return true; }
    pos.y = ny; return false;
  }
  return { solids, solidsAt, topAt, collides, groundAt, ceilingAt, moveEntity, rayWorld, losClear, nadeBlocked, stepNade };
}

export function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r, h = b * b - cc;
  if (h < 0) return -1; const sq = Math.sqrt(h); let t = -b - sq; if (t < 0) t = -b + sq; return t;
}
// esferas de acerto do Docão (iguais ao cliente): cabeça e corpo, relativas aos pés
export const HITBOXES = [[1.5, 0.5, true], [0.8, 0.58, false]];
