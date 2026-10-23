// Auditoria de z-fighting (sem navegador): faces de caixas do mapa no MESMO plano, mesma direção, com área sobreposta.
// Uso: node tools/coplanar-audit.mjs [ids]  (VERBOSE=1 lista os pares)
import { MAPS, getMap } from '../maps.js';
import { visualOffsets } from '../world-offsets.js';
const ids = process.argv.slice(2), EPS = 1e-4;
const ov = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
export function coplanarPairs(boxes, off = null) {
  const B = boxes.map((o, i) => { const [x0, y0, z0, x1, y1, z1] = o.b; const d = off ? off[i] : [0, 0, 0, 0, 0, 0];
    return { i, ramp: o.ramp, c: o.c, min: [x0 - d[0], y0 - d[1], z0 - d[2]], max: [x1 + d[3], y1 + d[4], z1 + d[5]] }; });
  const pairs = [];
  for (let a = 0; a < B.length; a++) for (let b = a + 1; b < B.length; b++) {
    const A = B[a], C = B[b];
    for (let ax = 0; ax < 3; ax++) for (const side of ['min', 'max']) {
      if ((A.ramp || C.ramp) && ax === 1 && side === 'max') continue; // topo de rampa é inclinado
      if (Math.abs(A[side][ax] - C[side][ax]) > EPS) continue;
      const [u, v] = [0, 1, 2].filter((k) => k !== ax), du = ov(A.min[u], A.max[u], C.min[u], C.max[u]), dv = ov(A.min[v], A.max[v], C.min[v], C.max[v]), area = du * dv;
      // tiras < 1 cm (encostos de quina) ficam debaixo do contorno preto
      if (du > 0.01 && dv > 0.01) pairs.push({ a: A.i, b: C.i, ax: 'xyz'[ax], side, at: A[side][ax], area, same: A.c === C.c });
    }
  }
  return pairs;
}
if (process.argv[1] && process.argv[1].endsWith('coplanar-audit.mjs')) {
  let tb = 0, ta = 0;
  for (const m of MAPS) { if (ids.length && !ids.includes(m.id)) continue; const boxes = getMap(m.id).boxes.filter((o) => { const [x0, y0, z0, x1, y1, z1] = o.b; return !(x1 - x0 < 0.01 || y1 - y0 < 0.01 || z1 - z0 < 0.01); });
    const before = coplanarPairs(boxes), after = coplanarPairs(boxes, visualOffsets(boxes));
    const diff = (p) => p.filter((q) => !q.same).length; tb += diff(before); ta += diff(after);
    console.log(m.id.padEnd(20), 'pares coplanares (cores diferentes / iguais):', `${diff(before)}/${before.length - diff(before)}`, '→ depois do ajuste visual:', `${diff(after)}/${after.length - diff(after)}`);
    if (process.env.VERBOSE) for (const p of after.filter((q) => !q.same)) console.log('   DEPOIS', p.ax + p.side, p.at, 'área', p.area.toFixed(3), boxes[p.a].b.join(','), '×', boxes[p.b].b.join(','));
    if (process.env.VERBOSE > 1) for (const p of before.filter((q) => !q.same).slice(0, 12)) console.log('   ', p.ax + p.side, p.at, 'área', p.area.toFixed(2), boxes[p.a].b.join(','), '×', boxes[p.b].b.join(','));
  }
  console.log('TOTAL (cores diferentes):', tb, '→', ta);
}
