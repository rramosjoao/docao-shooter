// ============================================================
//  Estilingue de Ovo: ovo voa em arco (gravidade), quebra no 1º contato com parede/chão/rampa.
//  Mesma conta no cliente (offline e visual online) e no servidor (dano).
// ============================================================
export const EGG = { grav: -14, v0: 15, v1: 19, r: 0.07, pad: 0.06, life: 4, splat: 2, stain: 6, dmgMin: 0.7 };
const k01 = (k) => Math.max(0, Math.min(1, Number(k) || 0));
export const eggSpeed = (k) => EGG.v0 + EGG.v1 * k01(k);
export const eggDmg = (W, k, head) => W.dmg * (EGG.dmgMin + (1 - EGG.dmgMin) * k01(k)) * (head ? W.headMul : 1);
// ovo = { pos:{x,y,z}, vel:{x,y,z}, t }. Anda dt; devolve { from, wall: { pos, n } | null }; marca g.dead no contato ou no fim da vida
export function stepEgg(P, g, dt) {
  const from = { x: g.pos.x, y: g.pos.y, z: g.pos.z }; g.t += dt; g.vel.y += EGG.grav * dt;
  const sx = g.vel.x * dt, sy = g.vel.y * dt, sz = g.vel.z * dt, L = Math.hypot(sx, sy, sz);
  if (L > 1e-6) {
    const d = { x: sx / L, y: sy / L, z: sz / L }, hit = P.rayWorldN(g.pos, d, L + EGG.r);
    if (hit && hit.t - EGG.r <= L) { const go = Math.max(0, hit.t - EGG.r); g.pos.x += d.x * go; g.pos.y += d.y * go; g.pos.z += d.z * go; g.dead = true; return { from, wall: { pos: { x: g.pos.x, y: g.pos.y, z: g.pos.z }, n: hit.n } }; }
    g.pos.x += sx; g.pos.y += sy; g.pos.z += sz;
  }
  if (g.t >= EGG.life) g.dead = true;
  return { from, wall: null };
}
