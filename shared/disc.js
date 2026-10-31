// ============================================================
//  Disco Voador: projétil que voa reto e quica nas paredes, no chão e nas rampas (reflete na normal da superfície).
//  Quica DISC.bounces vezes; no contato seguinte é destruído. Acertar alguém também destrói.
//  Mesma conta no cliente (offline e visual online) e no servidor (dano).
// ============================================================
export const DISC = { speed: 22, r: 0.24, bounces: 3, life: 5, hitR: 0.32 };

// disco = { pos: {x,y,z}, dir: {x,y,z} (unitário), bounces, t }. Devolve a lista de contatos do passo:
// [{ pos, n, dead }]; dead = true quando passou do limite de quiques (o disco acaba ali).
export function stepDisc(P, d, dt) {
  const out = []; let left = DISC.speed * dt;
  d.t += dt;
  for (let i = 0; i < 4 && left > 1e-5; i++) {
    const hit = P.rayWorldN(d.pos, d.dir, left + DISC.r);
    if (!hit || hit.t - DISC.r > left) { d.pos.x += d.dir.x * left; d.pos.y += d.dir.y * left; d.pos.z += d.dir.z * left; break; }
    const go = Math.max(0, hit.t - DISC.r);
    d.pos.x += d.dir.x * go; d.pos.y += d.dir.y * go; d.pos.z += d.dir.z * go; left -= go;
    const pos = { x: d.pos.x, y: d.pos.y, z: d.pos.z };
    if (d.bounces >= DISC.bounces) { out.push({ pos, n: hit.n, dead: true }); d.dead = true; return out; }
    const k = 2 * (d.dir.x * hit.n.x + d.dir.y * hit.n.y + d.dir.z * hit.n.z);
    d.dir.x -= k * hit.n.x; d.dir.y -= k * hit.n.y; d.dir.z -= k * hit.n.z;
    const L = Math.hypot(d.dir.x, d.dir.y, d.dir.z) || 1; d.dir.x /= L; d.dir.y /= L; d.dir.z /= L;
    d.bounces++; out.push({ pos, n: hit.n, dead: false });
    if (left < 1e-4) left = 1e-4; // empurra pra fora da superfície no mesmo passo
  }
  if (d.t >= DISC.life) d.dead = true;
  return out;
}
