// ============================================================
//  Lança-Milho: grão com gravidade leve; estoura em pipoca ao bater (parede, chão, Docão) ou após CORN.fuse.
//  Cada grão vira CORN.pops estouros em sequência (pipoca pulando). Sorteios com semente = id do grão: mesma conta no cliente e no servidor.
//  Dano de cada estouro: explosionHits (shared/combat.js) com popOpts().
// ============================================================
import { rayCapsule } from './combat.js';
export const CORN = { grains: 3, spread: 0.07, speed: 26, grav: -9, r: 0.06, fuse: 0.5, pad: 0.1, pops: 3, gap: 0.12, hop: 0.9, radius: 2.0, maxDmg: 18, selfMul: 0.3, knock: 3.5, lift: 2.5 };
export const popOpts = (wIdx) => ({ radius: CORN.radius, maxDmg: CORN.maxDmg, selfMul: CORN.selfMul, knock: CORN.knock, lift: CORN.lift, wIdx, kind: 'c', fx: 'pop' });
export function seeded(s) { let a = (s >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const nrm = (x, y, z) => { const L = Math.hypot(x, y, z) || 1; return { x: x / L, y: y / L, z: z / L }; };
// leque: o 1º grão sai reto, os outros abrem (semente = id do 1º grão)
export function cornDirs(d, seed) { const r = seeded(seed), s = CORN.spread, out = [nrm(d.x, d.y, d.z)]; for (let i = 1; i < CORN.grains; i++) out.push(nrm(d.x + (r() * 2 - 1) * s, d.y + (r() * 2 - 1) * s * 0.6, d.z + (r() * 2 - 1) * s)); return out; }
// mira de bot com queda: sobe 0,5·g·T² (T = distância horizontal / velocidade)
export function cornAim(o, at) { const dx = at.x - o.x, dz = at.z - o.z, T = Math.hypot(dx, dz) / CORN.speed; return nrm(dx, at.y - o.y - 0.5 * CORN.grav * T * T, dz); }
// grão = { pos, vel, t, dead }; ents = quem pode levar o grão no corpo; skip(e) = ignora (dono no começo, amigos).
// Devolve null (segue voando) ou { pos, n (normal da parede ou null), e (Docão atingido ou null) }
export function stepCorn(P, g, dt, ents = [], skip = () => false) {
  g.t += dt; g.vel.y += CORN.grav * dt;
  const sp = Math.hypot(g.vel.x, g.vel.y, g.vel.z) || 1, d = { x: g.vel.x / sp, y: g.vel.y / sp, z: g.vel.z / sp }, step = sp * dt;
  const w = P.rayWorldN(g.pos, d, step + CORN.r); let best = w && w.t - CORN.r <= step ? { t: Math.max(0, w.t - CORN.r), n: w.n, e: null } : null;
  for (const e of ents) { if (!e.alive || skip(e)) continue; const t = rayCapsule(g.pos, d, step, e.pos, CORN.pad); if (t !== null && (!best || t < best.t)) best = { t, n: null, e }; }
  const go = best ? best.t : step; g.pos.x += d.x * go; g.pos.y += d.y * go; g.pos.z += d.z * go;
  if (best || g.t >= CORN.fuse) { g.dead = true; return { pos: { x: g.pos.x, y: g.pos.y, z: g.pos.z }, n: best ? best.n : null, e: best ? best.e : null }; }
  return null;
}
// pipoca pulando: CORN.pops pontos (o 1º no estouro, desgrudado da parede pela normal); parede corta o pulo
export function popChain(P, at, n, seed) {
  const r = seeded(seed * 7 + 3); let p = { x: at.x + (n ? n.x * 0.15 : 0), y: at.y + (n ? n.y * 0.15 : 0), z: at.z + (n ? n.z * 0.15 : 0) }; const pts = [{ ...p }];
  for (let k = 1; k < CORN.pops; k++) { const a = r() * Math.PI * 2, d = nrm(Math.cos(a), 0.25 + r() * 0.35, Math.sin(a)), hit = P.rayWorld(p, d, CORN.hop), t = hit === null ? CORN.hop : Math.max(0, hit - 0.15); p = { x: p.x + d.x * t, y: p.y + d.y * t, z: p.z + d.z * t }; pts.push({ ...p }); }
  return pts;
}
