// Ajuste VISUAL contra z-fighting: faces de caixas diferentes no mesmo plano (mesma direção, área sobreposta) piscam.
// Cada face em conflito recebe um "nível" (0, 1, 2…) por coloração gulosa — a face maior fica no nível 0 e as menores
// (detalhes, faixas, tapetes, pisos encaixados) saem STEP_MM pra fora por nível. Só a malha muda; a colisão continua exata.
export const Z_STEP = 0.006; // 6 mm por nível
const EPS = 1e-4;
// devolve, por caixa, [dx0, dy0, dz0, dx1, dy1, dz1] = quanto cada face (min x/y/z, max x/y/z) vai pra fora
export function visualOffsets(boxes) {
  const n = boxes.length, off = boxes.map(() => [0, 0, 0, 0, 0, 0]);
  const ext = boxes.map((o) => { const [x0, y0, z0, x1, y1, z1] = o.b; return { min: [x0, y0, z0], max: [x1, y1, z1], ramp: !!o.ramp }; });
  const ov = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
  for (let ax = 0; ax < 3; ax++) for (const [si, side] of [[0, 'min'], [1, 'max']]) {
    const [u, v] = [0, 1, 2].filter((k) => k !== ax), slot = si * 3 + ax;
    // agrupa por plano
    const byPlane = new Map();
    for (let i = 0; i < n; i++) { const e = ext[i]; if (e.ramp && ax === 1 && side === 'max') continue; const k = Math.round(e[side][ax] / EPS); if (!byPlane.has(k)) byPlane.set(k, []); byPlane.get(k).push(i); }
    for (const list of byPlane.values()) {
      if (list.length < 2) continue;
      const area = (i) => (ext[i].max[u] - ext[i].min[u]) * (ext[i].max[v] - ext[i].min[v]);
      list.sort((a, b) => area(b) - area(a) || a - b);
      const level = new Map();
      for (const i of list) {
        const used = new Set();
        for (const [j, l] of level) if (ov(ext[i].min[u], ext[i].max[u], ext[j].min[u], ext[j].max[u]) > 1e-3 && ov(ext[i].min[v], ext[i].max[v], ext[j].min[v], ext[j].max[v]) > 1e-3) used.add(l);
        let l = 0; while (used.has(l)) l++; level.set(i, l); off[i][slot] = l * Z_STEP;
      }
    }
  }
  return off;
}
