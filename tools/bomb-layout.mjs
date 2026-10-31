// Mostra os bomb sites A/B e os lados (spawns) calculados em cada mapa. Uso: node tools/bomb-layout.mjs
import { MAPS } from '../maps.js';
import { buildNav } from '../nav.js';
import { mapSolids, createPhysics } from '../shared/physics.js';
import { bombLayout } from '../shared/bomb.js';
for (const map of MAPS) {
  const solids = mapSolids(map), P = createPhysics(solids, map.size);
  const spawns = map.spawns.map(([x, z, y = 0]) => ({ x, y: P.groundAt(x, z, y + 0.3), z }));
  const t0 = Date.now();
  const nav = buildNav({ hx: map.size[0], hz: map.size[1], spacing: map.navSpacing || 2, collides: P.collides, groundAt: P.groundAt, solids, topAt: P.topAt, seeds: spawns.map((s) => [s.x, s.y, s.z]), extra: map.waypoints || [] });
  const t1 = Date.now(); const L = bombLayout(nav, spawns, map); const t2 = Date.now();
  const f = (p) => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`;
  const [A, B] = L.sites;
  console.log(`${map.id.padEnd(12)} A ${f(A)} B ${f(B)} sep ${Math.hypot(A.x - B.x, A.z - B.z).toFixed(1)} m | atk ${f(L.atkC)} def ${f(L.defC)} | spawns atk ${L.atk.length} def ${L.def.length} | dA-atk ${Math.hypot(A.x - L.atkC.x, A.z - L.atkC.z).toFixed(0)} dB-atk ${Math.hypot(B.x - L.atkC.x, B.z - L.atkC.z).toFixed(0)} | nav ${t1 - t0} ms layout ${t2 - t1} ms`);
}
