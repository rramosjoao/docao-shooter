// Repro de "fica preso na parede" (sem navegador): usa a mesma física do servidor/cliente (shared/physics.js).
// Uso: node tools/stuck-repro.mjs [ids]   → por mapa: execuções, presos (não sai pra lugar nenhum), engasgos (não desliza),
// quadros dentro de caixa (sobreposição) e quedas que "grudam" na lateral.
import { MAPS, getMap } from '../maps.js';
import { buildNav } from '../nav.js';
import { mapSolids, createPhysics } from '../shared/physics.js';
import { SPEED, JUMP, RADIUS, STEP, HEIGHT } from '../shared/rules.js';
let seed = +(process.env.SEED || 12345); const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const DT = 1 / 60, ids = process.argv.slice(2);
const clone = (e) => ({ pos: { ...e.pos }, vel: { ...e.vel }, onGround: e.onGround });
function step(P, e, wx, wz, jump) {
  const acc = e.onGround ? 14 : 4, k = Math.min(1, acc * DT);
  e.vel.x += (wx * SPEED - e.vel.x) * k; e.vel.z += (wz * SPEED - e.vel.z) * k;
  if (jump && e.onGround) { e.vel.y = JUMP; e.onGround = false; }
  P.moveEntity(e, DT);
}
function run(P, e, wx, wz, secs, jump = false) { for (let i = 0; i < secs * 60; i++) step(P, e, wx, wz, jump && i === 0); return e; }
// corpo realmente dentro de uma caixa (folga de 2 cm nos pés e na cabeça; degraus ≤ STEP não contam). Independe da versão da física.
const inside = (P, p) => P.solidsAt(p.x, p.z).some((s) => p.x + RADIUS - 0.02 > s.min.x && p.x - RADIUS + 0.02 < s.max.x && p.z + RADIUS - 0.02 > s.min.z && p.z - RADIUS + 0.02 < s.max.z
  && p.y + 0.02 < P.topAt(s, Math.max(s.min.x, Math.min(s.max.x, p.x)), Math.max(s.min.z, Math.min(s.max.z, p.z))) - STEP && p.y + HEIGHT - 0.02 > s.min.y);
const DIRS = [...Array(8)].map((_, i) => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]);
const total = { runs: 0, trapped: 0, snag: 0, embed: 0, frames: 0 };
console.log('mapa'.padEnd(22), 'execuções  presos  engasgos  quadros-dentro-da-caixa');
for (const m of MAPS) {
  if (ids.length && !ids.includes(m.id)) continue;
  const map = getMap(m.id), solids = mapSolids(map), P = createPhysics(solids, map.size);
  const spawns = map.spawns.map(([x, z, y = 0]) => ({ x, y: P.groundAt(x, z, y + 0.3), z }));
  const nav = buildNav({ hx: map.size[0], hz: map.size[1], spacing: map.navSpacing || 2, collides: P.collides, groundAt: P.groundAt, solids, topAt: P.topAt, seeds: spawns.map((s) => [s.x, s.y, s.z]), extra: map.waypoints || [] });
  const nodes = nav.nodes; const N = Math.min(140, nodes.length); const pick = [...Array(N)].map(() => nodes[Math.floor(rnd() * nodes.length)]);
  const r = { runs: 0, trapped: 0, snag: 0, embed: 0, frames: 0 };
  for (const n of pick) for (const [dx, dz] of DIRS) {
    // anda 3 s numa direção (às vezes pulando no meio, às vezes girando 45°), bate em parede, quina, porta, borda, escada
    const a = rnd() * 0.6 - 0.3, wx0 = dx * Math.cos(a) - dz * Math.sin(a), wz0 = dx * Math.sin(a) + dz * Math.cos(a);
    const e = { pos: { x: n.x, y: n.y, z: n.z }, vel: { x: 0, y: 0, z: 0 }, onGround: true }; r.runs++;
    const jumpAt = rnd() < 0.35 ? Math.floor(rnd() * 150) : -1, turn = rnd() < 0.3;
    let trapped = false, snag = false, last = { ...e.pos }, emb = 0;
    for (let i = 0; i < 180; i++) {
      const t = turn && i > 90 ? Math.PI / 4 : 0, wx = wx0 * Math.cos(t) - wz0 * Math.sin(t), wz = wx0 * Math.sin(t) + wz0 * Math.cos(t);
      step(P, e, wx, wz, i === jumpAt); r.frames++;
      if (inside(P, e.pos)) { emb++; if (process.env.DEBUG2 && emb === 1 && r.embed < 400) { const ov = P.solidsAt(e.pos.x, e.pos.z).filter((b) => e.pos.x + 0.42 > b.min.x && e.pos.x - 0.42 < b.max.x && e.pos.z + 0.42 > b.min.z && e.pos.z - 0.42 < b.max.z).map((b) => [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z, b.ramp ? 'ramp' : ''].map((v) => (typeof v === 'number' ? +v.toFixed(2) : v)).join(',')); console.log('  DENTRO', m.id, i, [e.pos.x, e.pos.y, e.pos.z].map((v) => v.toFixed(2)).join(','), 'vy', e.vel.y.toFixed(2), '|', ov.join(' | ')); } }
      if (i % 30 === 29) { // janela de 0,5 s
        const mx = e.pos.x - last.x, mz = e.pos.z - last.z; last = { ...e.pos };
        if (Math.hypot(mx, mz) < 0.05 && !trapped) {
          // preso: nenhuma das 8 direções (nem pulando) tira o Docão do lugar
          let best = 0; for (const [ax, az] of DIRS) for (const j of [false, true]) { const c = run(P, clone(e), ax, az, 0.5, j); best = Math.max(best, Math.hypot(c.pos.x - e.pos.x, c.pos.z - e.pos.z)); }
          if (best < 0.1) { trapped = true; if (process.env.DEBUG && r.trapped < 3) { const ov = P.solidsAt(e.pos.x, e.pos.z).filter((b) => e.pos.x + 0.42 > b.min.x && e.pos.x - 0.42 < b.max.x && e.pos.z + 0.42 > b.min.z && e.pos.z - 0.42 < b.max.z).map((b) => [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z, b.ramp ? 'ramp' : ''].map((v) => (typeof v === 'number' ? +v.toFixed(2) : v)).join(',')); console.log('  PRESO', m.id, 'pos', [e.pos.x, e.pos.y, e.pos.z].map((v) => v.toFixed(2)).join(','), 'vy', e.vel.y.toFixed(2), 'g', e.onGround, 'ground', P.groundAt(e.pos.x, e.pos.z, e.pos.y).toFixed(2), '| caixas:', ov.join(' | ')); } }
          // engasgo: apertando na diagonal continua sem andar (mais 0,5 s), mas só o componente x (ou z) da mesma direção anda → não está deslizando
          else if (Math.abs(wx) > 0.3 && Math.abs(wz) > 0.3 && (() => { const c = run(P, clone(e), wx, wz, 0.5); return Math.hypot(c.pos.x - e.pos.x, c.pos.z - e.pos.z) < 0.05; })()) for (const [ax, az] of [[Math.sign(wx), 0], [0, Math.sign(wz)]]) { const c = run(P, clone(e), ax, az, 0.5); if ((c.pos.x - e.pos.x) * ax + (c.pos.z - e.pos.z) * az > 0.4) { snag = true; if (process.env.DEBUG) console.log('  ENGASGO', m.id, [e.pos.x, e.pos.y, e.pos.z].map((v) => v.toFixed(2)).join(','), 'wish', wx.toFixed(2), wz.toFixed(2), 'eixo', ax, az, 'vy', e.vel.y.toFixed(2), 'g', e.onGround, 'v', e.vel.x.toFixed(2), e.vel.z.toFixed(2), 'cx', P.collides(e.pos.x + Math.sign(wx) * 0.05, e.pos.y, e.pos.z), 'cz', P.collides(e.pos.x, e.pos.y, e.pos.z + Math.sign(wz) * 0.05), 'i', i); } }
        }
      }
    }
    if (trapped) r.trapped++; if (snag) r.snag++; r.embed += emb;
  }
  for (const k in total) total[k] += r[k];
  console.log(m.id.padEnd(22), String(r.runs).padStart(9), String(r.trapped).padStart(7), String(r.snag).padStart(9), String(r.embed).padStart(10), `(${(100 * r.embed / r.frames).toFixed(2)}%)`);
}
console.log('TOTAL'.padEnd(22), String(total.runs).padStart(9), String(total.trapped).padStart(7), String(total.snag).padStart(9), String(total.embed).padStart(10), `(${(100 * total.embed / total.frames).toFixed(2)}%)`);
