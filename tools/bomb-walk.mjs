// Modo Bomba: distância e tempo de caminhada (grafo dos bots, A*) de cada spawn do Ataque/Defesa até os sites A e B.
// Uso: node tools/bomb-walk.mjs [ids]   (tempo = distância / SPEED do jogador; entre parênteses, na velocidade dos bots)
import { MAPS } from '../maps.js';
import { buildNav } from '../nav.js';
import { mapSolids, createPhysics } from '../shared/physics.js';
import { bombLayout, BOMB } from '../shared/bomb.js';
import { SPEED, BOT_SPEED } from '../shared/rules.js';
const ids = process.argv.slice(2), fails = [];
const h = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) + Math.abs(a.y - b.y);
const rows = [];
for (const map of MAPS) {
  if (ids.length && !ids.includes(map.id)) continue;
  const solids = mapSolids(map), P = createPhysics(solids, map.size);
  const spawns = map.spawns.map(([x, z, y = 0]) => ({ x, y: P.groundAt(x, z, y + 0.3), z }));
  const nav = buildNav({ hx: map.size[0], hz: map.size[1], spacing: map.navSpacing || 2, collides: P.collides, groundAt: P.groundAt, solids, topAt: P.topAt, seeds: spawns.map((s) => [s.x, s.y, s.z]), extra: map.waypoints || [] });
  const L = bombLayout(nav, spawns, map, P.groundAt), src = L.pts || spawns;
  const len = (a, b) => { const p = nav.path(a, b); if (!p) return Infinity; let d = h(a, p[0]); for (let i = 1; i < p.length; i++) d += h(p[i - 1], p[i]); return d + h(p[p.length - 1], b); };
  console.log(`\n=== ${map.id} (${map.name})${map.bomb ? ' · layout à mão' : ' · layout automático'}`);
  L.sites.forEach((s) => { const fl = nav.good.filter((n) => Math.abs(n.y - s.y) < 0.4 && Math.hypot(n.x - s.x, n.z - s.z) <= BOMB.SITE_R).length;
    console.log(`  site ${s.name} (${s.x.toFixed(1)}, ${s.y.toFixed(1)}, ${s.z.toFixed(1)}) · ${fl} nós andáveis dentro do raio`); if (fl < 6) fails.push(`${map.id}: site ${s.name} com pouco chão (${fl})`); });
  for (const [side, idx] of [['Ataque', L.atk], ['Defesa', L.def]]) for (const i of idx) { const q = src[i], n = nav.nearest(q.x, q.y, q.z);
    if (P.collides(q.x, q.y, q.z) || !n || Math.hypot(n.x - q.x, n.z - q.z) > 2.2 || Math.abs(n.y - q.y) > 0.5) fails.push(`${map.id}: spawn do ${side} inválido em (${q.x}, ${q.y.toFixed(1)}, ${q.z})`);
    for (const s of L.sites) if (Math.hypot(q.x - s.x, q.z - s.z) < BOMB.SITE_R + 2) fails.push(`${map.id}: spawn do ${side} em cima do site ${s.name}`); }
  const out = {};
  for (const [side, idx] of [['Ataque', L.atk], ['Defesa', L.def]]) for (const s of L.sites) {
    const d = idx.map((i) => len(src[i], s)).filter(Number.isFinite); if (d.length < idx.length) fails.push(`${map.id}: ${side} sem caminho até ${s.name} (${idx.length - d.length})`);
    if (process.env.VERBOSE) console.log(`    ${side}→${s.name} por spawn:`, idx.map((i) => `(${src[i].x},${src[i].z}) ${len(src[i], s).toFixed(0)}`).join(' · '));
    const mn = Math.min(...d), avg = d.reduce((a, b) => a + b, 0) / d.length; out[side + s.name] = { mn, avg };
    console.log(`  ${side.padEnd(6)} → ${s.name}: ${avg.toFixed(0)} m em média (mín ${mn.toFixed(0)}) · ${(avg / SPEED).toFixed(1)} s andando (mín ${(mn / SPEED).toFixed(1)} s; bots ${(avg / BOT_SPEED).toFixed(1)} s)`);
  }
  console.log(`  spawns: Ataque ${L.atk.length}, Defesa ${L.def.length} · separação A–B ${Math.hypot(L.sites[0].x - L.sites[1].x, L.sites[0].z - L.sites[1].z).toFixed(0)} m`);
  rows.push([map.id, out]);
}
console.log('\nmapa'.padEnd(22), 'Atq→A   Atq→B   Def→A   Def→B   (média, s a pé)');
for (const [id, o] of rows) console.log(id.padEnd(21), ['AtaqueA', 'AtaqueB', 'DefesaA', 'DefesaB'].map((k) => `${(o[k].avg / SPEED).toFixed(1).padStart(5)} s`).join('  '));
if (fails.length) console.log('\nPROBLEMAS:\n ' + fails.join('\n '));
