// ============================================================
//  MAPAS DO DOCÃO SHOOTER: só dados (geometria original).
//  Cada mapa: id, name (pt-BR), desc, size [meia-largura X, meia-profundidade Z], wallH (muro do limite),
//  palette (céu/neblina/luz/chão), boxes (caixas/rampas), props (objetos decorativos/cobertura),
//  spawns [[x, z, y]], pickups [[tipo, x, z, y]] (health | ammo | grenade), waypoints extras [[x, y, z]],
//  showcase [x, y, z] (onde o Docão fica no menu), view [x, y, z, yaw, pitch] (câmera de screenshot),
//  test (pontos usados pelo teste automático de escadas/andares).
//  O grafo de navegação dos bots é gerado automaticamente a partir da geometria (nav.js) + waypoints extras.
// ============================================================

// ---------- mini kit de montagem ----------
// caixa: B(x0, z0, x1, z1, altura, cor, y0)
export const B = (x0, z0, x1, z1, h, c, y0 = 0) => ({ b: [Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y0 + h, Math.max(z0, z1)], c });
// rampa (cunha): sobe de y0 a y1 ao longo do eixo 'x' ou 'z' no sentido dir (+1 / -1)
export const R = (x0, z0, x1, z1, y0, y1, axis, dir, c) => ({ b: [Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y1, Math.max(z0, z1)], c, ramp: { axis, dir } });
export const door = (a, b, h = 2.8) => ({ a, b, y0: 0, y1: h });
export const win = (a, b, lo = 1.0, hi = 2.2) => ({ a, b, y0: lo, y1: hi });
// parede ao longo de X (na linha z) / ao longo de Z (na linha x), com aberturas (portas/janelas)
function wallAlong(axis, s0, s1, line, t, h, c, openings = [], y0 = 0) {
  const out = []; let cur = s0;
  const box = (a, b, ya, yb) => {
    if (b - a < 0.01 || yb - ya < 0.01) return;
    out.push(axis === 'x' ? { b: [a, y0 + ya, line - t / 2, b, y0 + yb, line + t / 2], c } : { b: [line - t / 2, y0 + ya, a, line + t / 2, y0 + yb, b], c });
  };
  for (const o of [...openings].sort((p, q) => p.a - q.a)) {
    box(cur, o.a, 0, h); if (o.y0 > 0) box(o.a, o.b, 0, o.y0); if (o.y1 < h) box(o.a, o.b, o.y1, h); cur = o.b;
  }
  box(cur, s1, 0, h); return out;
}
export const wallX = (x0, x1, z, t, h, c, op, y0) => wallAlong('x', x0, x1, z, t, h, c, op, y0);
export const wallZ = (z0, z1, x, t, h, c, op, y0) => wallAlong('z', z0, z1, x, t, h, c, op, y0);
// transformações de grupos de caixas (para espelhar bases/casas)
export function rot180(list, cx, cz) {
  return list.map((o) => { if (o.wp) return { wp: [2 * cx - o.wp[0], o.wp[1], 2 * cz - o.wp[2]] }; const [x0, y0, z0, x1, y1, z1] = o.b; return { ...o, b: [2 * cx - x1, y0, 2 * cz - z1, 2 * cx - x0, y1, 2 * cz - z0], ramp: o.ramp ? { ...o.ramp, dir: -o.ramp.dir } : undefined }; });
}
export function mirrorZ(list) {
  return list.map((o) => { if (o.wp) return { wp: [o.wp[0], o.wp[1], -o.wp[2]] }; const [x0, y0, z0, x1, y1, z1] = o.b; return { ...o, b: [x0, y0, -z1, x1, y1, -z0], ramp: o.ramp ? { ...o.ramp, dir: o.ramp.axis === 'z' ? -o.ramp.dir : o.ramp.dir } : undefined }; });
}
// casa de 2 andares (frente pro +z), escada interna junto da parede de trás, laje do 2º andar com vão da escada
export function house(x0, z0, x1, z1, col) {
  const t = 0.6, H1 = 3.2, cx = (x0 + x1) / 2, out = [];
  const { wall, floor, roof, stair, trim } = col;
  out.push(...wallX(x0, x1, z0 + t / 2, t, H1, wall, [win(x1 - 3.4, x1 - 1.4)]));
  out.push(...wallX(x0, x1, z1 - t / 2, t, H1, wall, [win(x0 + 1.6, x0 + 4.2), door(cx - 1.3, cx + 1.3, 2.6), win(x1 - 4.2, x1 - 1.6)]));
  out.push(...wallZ(z0 + t, z1 - t, x0 + t / 2, t, H1, wall, [win(z0 + 4.6, z0 + 7.0)]));
  out.push(...wallZ(z0 + t, z1 - t, x1 - t / 2, t, H1, wall, [door(z0 + 5.2, z0 + 7.4, 2.6)]));
  const rs = x0 + 1.0, re = rs + 9.6, s0 = z0 + t, s1 = s0 + 2.8;
  out.push(R(rs, s0, re, s1, 0, 3.5, 'x', 1, stair));
  out.push(B(x0, s1, x1, z1, 0.3, floor, 3.2), B(re, z0, x1, s1, 0.3, floor, 3.2), B(x0, z0, rs, s1, 0.3, floor, 3.2));
  const U = 3.5, H2 = 2.6;
  out.push(...wallX(x0, x1, z0 + t / 2, t, H2, wall, [win(x0 + 2, x0 + 4, 0.9, 2.0), win(x1 - 4, x1 - 2, 0.9, 2.0)], U));
  out.push(...wallX(x0, x1, z1 - t / 2, t, H2, wall, [win(x0 + 1.5, x0 + 5.5, 0.8, 2.0), win(x1 - 5.5, x1 - 1.5, 0.8, 2.0)], U));
  out.push(...wallZ(z0 + t, z1 - t, x0 + t / 2, t, H2, wall, [win(z0 + 3.5, z0 + 6.5, 0.8, 2.0)], U));
  out.push(...wallZ(z0 + t, z1 - t, x1 - t / 2, t, H2, wall, [win(z0 + 3.5, z0 + 6.5, 0.8, 2.0)], U));
  out.push(B(x0 - 0.5, z0 - 0.5, x1 + 0.5, z1 + 0.5, 0.35, roof, U + H2));
  out.push(B(x0 - 0.2, z1, x1 + 0.2, z1 + 0.25, 0.25, trim, H1)); // friso entre andares
  return out;
}

// ---------- kit v2: prédios de vários andares ----------
// retângulo menos buracos (para lajes com vão de escada)
export function slab(x0, z0, x1, z1, y, th, c, holes = []) {
  let rects = [[x0, z0, x1, z1]];
  for (const [hx0, hz0, hx1, hz1] of holes) {
    const next = [];
    for (const [a0, b0, a1, b1] of rects) {
      if (hx1 <= a0 || hx0 >= a1 || hz1 <= b0 || hz0 >= b1) { next.push([a0, b0, a1, b1]); continue; }
      const cx0 = Math.max(a0, hx0), cx1 = Math.min(a1, hx1);
      if (hz0 > b0) next.push([a0, b0, a1, hz0]); if (hz1 < b1) next.push([a0, hz1, a1, b1]);
      if (cx0 > a0) next.push([a0, Math.max(b0, hz0), cx0, Math.min(b1, hz1)]); if (cx1 < a1) next.push([cx1, Math.max(b0, hz0), a1, Math.min(b1, hz1)]);
    }
    rects = next;
  }
  return rects.filter(([a0, b0, a1, b1]) => a1 - a0 > 0.05 && b1 - b0 > 0.05).map(([a0, b0, a1, b1]) => B(a0, b0, a1, b1, th, c, y - th));
}
// prédio: x0..x1 × z0..z1, `floors` andares de altura H (piso do andar f em y = f·H, laje de 0,3 por baixo).
//  ops: lista de aberturas { s: 'n'|'s'|'w'|'e' (n = lado z0, s = z1, w = x0, e = x1), a, b (ao longo da parede), f (andar), k: 'door'|'win'|'wide', lo, hi }
//  stairs: [{ f, r: [x0, z0, x1, z1], axis, dir }] rampa do andar f pro f+1 (abre vão na laje de cima)
//  roof: true = laje no topo (y = floors·H) com mureta; roofHoles/roofGaps: vãos na laje/mureta (escada pro telhado)
//  inner: paredes internas [{ axis: 'x'|'z', s0, s1, line, f, ops: [{ a, b, k }] }]
export function building(x0, z0, x1, z1, o) {
  const { col, floors = 2, H = 3.5, t = 0.5, ops = [], stairs = [], roof = true, parapet = 1.0, roofGaps = [], inner = [], noWall = [], floorHoles = {}, y0 = 0 } = o, out = [];
  const opening = (op, f) => {
    if (op.k === 'win') return win(op.a, op.b, op.lo ?? 1.0, op.hi ?? 2.2);
    if (op.k === 'wide') return { a: op.a, b: op.b, y0: 0, y1: H - 0.3 };
    return door(op.a, op.b, op.hi ?? 2.6);
  };
  const doorWp = (axis, line, a, b, y) => { const c = (a + b) / 2; for (const d of [-1.0, 0, 1.0]) out.push({ wp: axis === 'x' ? [c, y, line + d] : [line + d, y, c] }); };
  for (const q of ops) if (q.k !== 'win') { const y = y0 + (q.f ?? 0) * H; if (q.s === 'n') doorWp('x', z0 + t / 2, q.a, q.b, y); if (q.s === 's') doorWp('x', z1 - t / 2, q.a, q.b, y); if (q.s === 'w') doorWp('z', x0 + t / 2, q.a, q.b, y); if (q.s === 'e') doorWp('z', x1 - t / 2, q.a, q.b, y); }
  for (const w of inner) for (const q of w.ops || []) if (q.k !== 'win') doorWp(w.axis, w.line, q.a, q.b, y0 + (w.f ?? 0) * H);
  for (let f = 0; f < floors; f++) {
    const y = y0 + f * H, h = H, of = (side) => ops.filter((q) => q.s === side && (q.f ?? 0) === f).map((q) => opening(q, f));
    if (!noWall.includes('n' + f)) out.push(...wallX(x0, x1, z0 + t / 2, t, h, col.wall, of('n'), y));
    if (!noWall.includes('s' + f)) out.push(...wallX(x0, x1, z1 - t / 2, t, h, col.wall, of('s'), y));
    if (!noWall.includes('w' + f)) out.push(...wallZ(z0 + t, z1 - t, x0 + t / 2, t, h, col.wall2 || col.wall, of('w'), y));
    if (!noWall.includes('e' + f)) out.push(...wallZ(z0 + t, z1 - t, x1 - t / 2, t, h, col.wall2 || col.wall, of('e'), y));
    if (f > 0) out.push(...slab(x0 + t, z0 + t, x1 - t, z1 - t, y, 0.3, col.floor, [...stairs.filter((st) => st.f === f - 1).map((st) => st.r), ...(floorHoles[f] || [])]));
    if (f > 0 && col.trim) out.push(B(x0 - 0.12, z0 - 0.12, x1 + 0.12, z0 + 0.1, 0.22, col.trim, y - 0.3), B(x0 - 0.12, z1 - 0.1, x1 + 0.12, z1 + 0.12, 0.22, col.trim, y - 0.3));
  }
  for (const w of inner) { const y = y0 + (w.f ?? 0) * H, ops2 = (w.ops || []).map((q) => opening(q)); out.push(...(w.axis === 'x' ? wallX(w.s0, w.s1, w.line, 0.3, H - 0.3, col.inner || col.wall, ops2, y) : wallZ(w.s0, w.s1, w.line, 0.3, H - 0.3, col.inner || col.wall, ops2, y))); }
  for (const st of stairs) { const [a0, b0, a1, b1] = st.r; out.push(R(a0, b0, a1, b1, y0 + st.f * H, y0 + (st.f + 1) * H, st.axis, st.dir, col.stair)); }
  if (roof) {
    const Y = y0 + floors * H;
    out.push(...slab(x0, z0, x1, z1, Y, 0.35, col.roof, stairs.filter((st) => st.f === floors - 1).map((st) => st.r)));
    if (parapet > 0) {
      const g = (side) => roofGaps.filter((q) => q.s === side).map((q) => ({ a: q.a, b: q.b, y0: 0, y1: 9 }));
      out.push(...wallX(x0, x1, z0 + 0.15, 0.3, parapet, col.roof2 || col.wall, g('n'), Y), ...wallX(x0, x1, z1 - 0.15, 0.3, parapet, col.roof2 || col.wall, g('s'), Y));
      out.push(...wallZ(z0 + 0.3, z1 - 0.3, x0 + 0.15, 0.3, parapet, col.roof2 || col.wall, g('w'), Y), ...wallZ(z0 + 0.3, z1 - 0.3, x1 - 0.15, 0.3, parapet, col.roof2 || col.wall, g('e'), Y));
    }
  }
  return out;
}
// separa caixas de waypoints (portas viram nós do grafo dos bots)
export const fin = (list) => ({ boxes: list.filter((o) => o.b), waypoints: list.filter((o) => o.wp).map((o) => o.wp) });
// caixote / pilha de caixotes
export const crate = (x, z, s = 1.6, h = 1.6, c = '#9c6b3a', y0 = 0) => B(x - s / 2, z - s / 2, x + s / 2, z + s / 2, h, c, y0);
// sacada: laje externa com guarda-corpo (lado aberto = 'open' fica sem grade, encostado no prédio)
export function balcony(x0, z0, x1, z1, y, c, rail, open) {
  const out = [B(x0, z0, x1, z1, 0.25, c, y - 0.25)], r = 0.15, h = 1.0;
  if (open !== 'n') out.push(B(x0, z0, x1, z0 + r, h, rail, y)); if (open !== 's') out.push(B(x0, z1 - r, x1, z1, h, rail, y));
  if (open !== 'w') out.push(B(x0, z0, x0 + r, z1, h, rail, y)); if (open !== 'e') out.push(B(x1 - r, z0, x1, z1, h, rail, y));
  return out;
}

const DAY = (o) => ({ sky: '#8fd3ff', fog: ['#8fd3ff', 50, 130], hemi: ['#ffffff', '#6a8f4a', 1.6], sun: ['#ffffff', 2.2], clouds: true, ...o });

// =====================================================================
export const MAPS = [];

// ---------- 1) Arena da Fazendinha (3 corredores estilo Shipment/Rust: bases de 2 andares, celeiro no meio, caixa d'água) ----------
{
  const H = 3.5, boxes = [];
  const lado = (c) => { // metade oeste; a leste é a mesma girada 180°
    const o = [];
    o.push(...building(-31, -7, -22, 7, { col: c, floors: 2,
      ops: [{ s: 'e', a: -1, b: 1 }, { s: 'n', a: -27.8, b: -26 }, { s: 's', a: -27.8, b: -26 }, { s: 'e', a: -5, b: -3, k: 'win' }, { s: 'e', a: 3, b: 5, k: 'win' },
        { s: 'e', a: -5, b: -1.5, f: 1, k: 'win', lo: 0.9 }, { s: 'e', a: 1.5, b: 5, f: 1, k: 'win', lo: 0.9 }, { s: 'n', a: -30, b: -27, f: 1, k: 'win', lo: 0.9 }, { s: 's', a: -30, b: -27, f: 1, k: 'win', lo: 0.9 }],
      stairs: [{ f: 0, r: [-28.7, -6.5, -23.0, -4.6], axis: 'x', dir: 1 }, { f: 1, r: [-28.7, 4.6, -23.0, 6.5], axis: 'x', dir: 1 }],
      inner: [{ axis: 'x', s0: -30.5, s1: -22.5, line: 1.8, ops: [{ a: -25.2, b: -23.4 }] }] }));
    o.push(crate(-29.5, 0.5, 1.4, 1.0, '#b5793e'), crate(-29.5, -2.8, 1.2, 1.2, '#f2c94c', 3.5), crate(-26.5, -2, 1.2, 1.0, '#b5793e', 7), crate(-23.6, 3, 1.0, 1.0, '#f2c94c', 7));
    // galpões entre os corredores (telhado pela pilha de feno)
    for (const zc of [-11, 11]) {
      o.push(...building(-18, zc - 3, -11, zc + 3, { col: { wall: '#b5793e', wall2: '#a0682f', floor: '#c8a27a', roof: '#8b5a2b', roof2: '#6b4423' }, floors: 1, H: 3.2,
        ops: [{ s: 'w', a: zc - 1, b: zc + 0.8 }, { s: 'e', a: zc - 0.8, b: zc + 1 }, { s: zc < 0 ? 's' : 'n', a: -16.5, b: -14, k: 'win' }], roofGaps: [{ s: zc < 0 ? 'n' : 's', a: -14.5, b: -12 }] }));
      const zr = zc < 0 ? zc - 3 : zc + 3, d = zc < 0 ? -1 : 1;
      o.push(R(-14.4, Math.min(zr, zr + d * 5), -12.1, Math.max(zr, zr + d * 5), 0, 3.2, 'z', -d, '#e8c25a'));
    }
    // corredor norte: muretas de pedra e fardos | campo: cercas e caixotes
    o.push(B(-21, -20.6, -16, -19.8, 1.2, '#a8a29a'), B(-12, -24.6, -8, -23.8, 1.2, '#a8a29a'), B(-26, -16, -24.6, -14.2, 1.4, '#f2c94c'), B(-9, -18.8, -7, -16.6, 1.4, '#f2c94c'));
    o.push(B(-29, -22, -27, -20, 1.5, '#b5793e'), B(-25, 22.2, -21, 23.0, 1.1, '#b5793e'), B(-14, 19.6, -10, 20.4, 1.1, '#b5793e'), crate(-27, 18, 1.6, 1.6), crate(-18, 25, 1.4, 1.2, '#f2c94c'));
    o.push(crate(-19, -3.5, 1.6, 1.6), crate(-19, 3.5, 1.6, 1.6), B(-14.5, -0.8, -13.7, 2.8, 1.3, '#b5793e'), crate(-9.5, 6.5, 1.4, 1.2, '#f2c94c'), crate(-9.5, -7.5, 1.4, 1.2, '#f2c94c'));
    return o;
  };
  boxes.push(...lado({ wall: '#f28fb0', wall2: '#e87fa0', inner: '#f7b3c9', floor: '#c8a27a', roof: '#c0392b', roof2: '#a93226', stair: '#b5793e', trim: '#ffffff' }));
  boxes.push(...rot180(lado({ wall: '#4fb3c9', wall2: '#45a2b6', inner: '#7fd3e3', floor: '#c8a27a', roof: '#1d5f8a', roof2: '#174f74', stair: '#b5793e', trim: '#ffffff' }), 0, 0));
  // celeiro do meio: portões largos (corredor do meio passa por dentro), jirau com janelas pros dois lados
  boxes.push(...building(-7, -6, 7, 6, { col: { wall: '#9b7bd6', wall2: '#8a6bc6', floor: '#c8a27a', roof: '#6b4fa8', stair: '#b59be6', trim: '#ffffff' }, floors: 2, roof: true, parapet: 0,
    ops: [{ s: 'w', a: -2, b: 2, k: 'wide' }, { s: 'e', a: -2, b: 2, k: 'wide' }, { s: 'n', a: -1, b: 1 }, { s: 's', a: -1, b: 1 },
      ...['n', 's'].flatMap((q) => [{ s: q, a: -6, b: -3, f: 1, k: 'win', lo: 0.9 }, { s: q, a: 3, b: 6, f: 1, k: 'win', lo: 0.9 }]), ...['w', 'e'].map((q) => ({ s: q, a: -2.5, b: 2.5, f: 1, k: 'win', lo: 0.9 }))],
    stairs: [{ f: 0, r: [-5.2, -5.5, 0.8, -3.7], axis: 'x', dir: 1 }, { f: 0, r: [-0.8, 3.7, 5.2, 5.5], axis: 'x', dir: -1 }] }));
  boxes.push(B(-4, 1.5, -2.2, 3, 1.2, '#f2c94c'), B(2.2, -3, 4, -1.5, 1.2, '#f2c94c'), B(-1, -1, 1, 1, 1.2, '#f2c94c', 3.5));
  boxes.push(B(-2.2, -12.6, 2.2, -11.8, 1.3, '#a8a29a'), crate(-5.5, -14.5, 1.4, 1.2), crate(6.5, -9.5, 1.4, 1.4, '#f2c94c'), crate(-6.5, 9.5, 1.4, 1.4, '#f2c94c'), B(-2.2, 11.8, 2.2, 12.6, 1.3, '#a8a29a'));
  // galinheiro (túnel no corredor norte)
  boxes.push(...building(-5, -23, 5, -17, { col: { wall: '#f7f1e3', wall2: '#e8e0cc', floor: '#c8a27a', roof: '#e63946', roof2: '#c0303c' }, floors: 1, H: 2.9,
    ops: [{ s: 'w', a: -21, b: -19 }, { s: 'e', a: -21, b: -19 }, { s: 's', a: -3.5, b: -1.5, k: 'win' }, { s: 's', a: 1.5, b: 3.5, k: 'win' }, { s: 'n', a: -1, b: 1, k: 'win' }], parapet: 0 }));
  // caixa d'água (plataforma alta no corredor sul; dá pra passar por baixo — linha longa do Sniper)
  for (const [x, z] of [[-2.9, 16.1], [2.4, 16.1], [-2.9, 21.4], [2.4, 21.4]]) boxes.push(B(x, z, x + 0.5, z + 0.5, 4.0, '#8b5a2b'));
  boxes.push(B(-3, 16, 3, 22, 0.4, '#a0682f', 4.0), B(-1.5, 17.6, 1.5, 20.4, 2.6, '#bdc3c7', 4.4), R(3, 17.6, 9, 20.4, 0, 4.4, 'x', -1, '#b5793e'), { wp: [-2.3, 4.4, 19] }, { wp: [-2.3, 4.4, 17] }, { wp: [-2.3, 4.4, 21] });
  boxes.push(B(-3, 16, 3, 16.2, 1.0, '#8b5a2b', 4.4), B(-3, 21.8, 3, 22, 1.0, '#8b5a2b', 4.4));
  for (const sx of [-3.5, 3.5]) for (const sz of [-27.7, 27.7]) boxes.push(B(sx - 0.2, sz - 0.2, sx + 0.2, sz + 0.2, 2.8, '#8b5a2b', 4));
  MAPS.push({
    id: 'arena', name: 'Arena da Fazendinha', desc: 'Três corredores: bases de dois andares com terraço, celeiro com jirau no meio, galinheiro-túnel ao norte e caixa d\'água ao sul.',
    size: [32, 28], wallH: 4, wallColor: ['#e86a5c', '#d85a4c'],
    palette: DAY({ ground: '#7cc95a', tiles: ['#a9e07f', '#9bd972', 64, 14] }),
    ...fin(boxes), props: [{ t: 'logoSign', x: 0, y: 5.2, z: -27.98, rot: 0 }, { t: 'logoSign', x: 0, y: 5.2, z: 27.98, rot: Math.PI },
      { t: 'hay', x: -19, z: -26.5 }, { t: 'hay', x: 19, z: 26.5 }, { t: 'hay', x: -3, z: 25 }, { t: 'hay', x: 3, z: -25.5 }, { t: 'truck', x: -16, z: 21, c: '#e63946' }, { t: 'truck', x: 16, z: -21, c: '#2f80ed' },
      { t: 'tree', x: -24.5, z: -21.5 }, { t: 'tree', x: 24.5, z: 21.5 }, { t: 'tree', x: -9, z: -26 }, { t: 'tree', x: 9, z: 26 }],
    spawns: [[-28, 0], [28, 0], [-26.5, -10], [26.5, 10], [-26.5, 10], [26.5, -10], [-17, -25], [17, 25], [-21, 25], [21, -25], [-28, -3, 3.5], [28, 3, 3.5]],
    pickups: [['health', 0, 0], ['health', -26, 3], ['health', 26, -3], ['health', 0, -20], ['health', 2.4, 19, 4.4],
      ['ammo', 2, -4.5, 3.5], ['ammo', -2, 4.5, 3.5], ['ammo', -14.5, -11], ['ammo', 14.5, 11], ['ammo', -27, 3, 7], ['ammo', 27, -3, 7],
      ['grenade', -14.5, 11], ['grenade', 14.5, -11], ['grenade', -20, 0], ['grenade', 20, 0], ['grenade', -2.3, 19, 4.4]],
    showcase: [0, 0, 9], view: [-20, 0, 1.5, -1.62, 0.0], openMax: 7,
    test: { stairs: { from: [-28.4, 0, -5.5], via: [[-23.5, -5.5]], to: [-23.5, 3.5, -3.6], level: 3.5 }, roof: { from: [-28.4, 3.5, 5.5], via: [[-23.5, 5.5]], to: [-23.5, 7.0, 4.0], level: 7.0 }, under: { from: [-29, 0, -2.5], to: [-23.5, 0, -2.5], ceil: 3.2 } },
  });
}

// ---------- 2) Duas Pocilgas (estilo Dust2: túneis do B, meio com portas, catwalk pro A, longo com portões) ----------
{
  const sand = '#d8b077', wall = '#c99a5b', wall2 = '#b98b4e', cr = '#9c6b3a', cr2 = '#b07a45', boxes = [];
  const casa = { wall: '#e2c18a', wall2: '#d6b47a', inner: '#efd6a8', floor: '#c9a46a', roof: '#a0522d', roof2: '#8b4513', stair: '#9c6b3a', trim: '#fff4e0' };
  const C = (x, z, s = 2, h = 2, c = cr, y0 = 0) => boxes.push(crate(x, z, s, h, c, y0));
  // túneis do B (lado oeste, coberto, com parede no meio em zigue-zague)
  boxes.push(...building(-36, 2, -16, 18, { col: { ...casa, wall: '#b98b4e', wall2: '#a97b40', roof: '#8b6a3e' }, floors: 1, H: 3.4, parapet: 0,
    ops: [{ s: 's', a: -33, b: -30.5 }, { s: 's', a: -22, b: -19.5 }, { s: 'n', a: -33, b: -30 }, { s: 'e', a: 8, b: 10.5 }],
    inner: [{ axis: 'z', s0: 2.5, s1: 17.5, line: -26, ops: [{ a: 4, b: 6 }, { a: 13, b: 15 }] }] }));
  // túnel de baixo: corredor coberto ligando os túneis ao meio
  boxes.push(B(-16, -4, -5, 7.5, 6, wall), B(-16, 11, -5, 22, 6, wall), B(-16, 7.5, -5, 11, 0.4, wall2, 3.4), { wp: [-10, 0, 9.2] }, { wp: [-6, 0, 9.2] }, { wp: [-14, 0, 9.2] });
  // meio: portas do meio, caixote "xbox"
  boxes.push(...wallX(-5, 5, -12, 1, 6, wall2, [door(-1.8, 1.8, 3.4)]), B(-16, -12, -5, -4, 6, wall), C(0, -3, 2, 1.6, cr2), C(-3.5, 14, 1.6, 1.4));
  // casa do meio (2 andares; janelas pro meio e pro longo)
  boxes.push(...building(5, 6, 22, 22, { col: casa, floors: 2,
    ops: [{ s: 'w', a: 13, b: 15 }, { s: 'e', a: 9, b: 11 }, { s: 's', a: 9, b: 11 }, { s: 'w', a: 9, b: 12, f: 1, k: 'win', lo: 0.9 }, { s: 'e', a: 15, b: 19, f: 1, k: 'win', lo: 0.9 }, { s: 'n', a: 10, b: 14, f: 1, k: 'win', lo: 0.9 }],
    stairs: [{ f: 0, r: [7, 19, 13.5, 21.5], axis: 'x', dir: 1 }, { f: 1, r: [14, 19, 20.2, 21.5], axis: 'x', dir: 1 }],
    inner: [{ axis: 'z', s0: 6.5, s1: 18.5, line: 15, ops: [{ a: 11.5, b: 13.3 }] }] }));
  boxes.push(C(19.5, 8.5, 1.4, 1.2, cr2, 7), C(8, 8.5, 1.4, 1.2, cr, 7));
  // catwalk / curto: rampa do meio até a passarela alta que desce no A
  boxes.push(B(5, -12, 22, -6, 6, wall), R(5.5, -2, 10, 2, 0, 2.2, 'x', 1, cr2), B(10, -2.5, 19, 2.5, 2.2, wall2), B(10, -2.5, 19, -2.2, 0.9, wall, 2.2), R(19, -2.5, 22.5, 2.5, 0, 2.2, 'x', -1, cr2));
  boxes.push(B(5, 2.5, 10, 6, 2.2, wall2), B(10, 2.5, 22, 3, 2.2, wall));
  // longo: portões e muro
  boxes.push(...wallX(22, 40, 4, 1, 6, wall2, [door(28.5, 31.5, 3.4)]), B(22, 5, 23, 22, 6, wall), C(34, 8, 2, 2), C(37, 15, 2, 1.4, cr2), C(26, 18, 1.6, 1.6), B(36, -8, 40, -4, 1.6, cr));
  // A: plataforma com caixotes, casa do A (2 andares, janela pra plataforma, terraço)
  boxes.push(B(22, -26, 36, -12, 1.2, '#e0c08a'), R(28, -12, 32, -8, 0, 1.2, 'z', -1, '#e0c08a'), C(26, -18, 2, 2, cr, 1.2), C(31, -22, 2, 1.4, cr2, 1.2), C(33.5, -15, 1.6, 1.6, cr, 1.2), C(24, -14, 1.4, 1.2, cr2, 1.2));
  boxes.push(...building(22, -35, 36, -26, { col: casa, floors: 2,
    ops: [{ s: 'w', a: -31, b: -29 }, { s: 's', a: 25, b: 27, f: 0 }, { s: 's', a: 31, b: 35, f: 1, k: 'win', lo: 0.9 }, { s: 's', a: 23, b: 27, f: 1, k: 'win', lo: 0.9 }],
    stairs: [{ f: 0, r: [29, -34.5, 35, -32.6], axis: 'x', dir: 1 }, { f: 1, r: [23, -34.5, 29, -32.6], axis: 'x', dir: -1 }] }));
  // CT: casa com janela olhando o meio inteiro (linha de Sniper)
  boxes.push(...building(-5, -35, 6, -27, { col: casa, floors: 2,
    ops: [{ s: 'e', a: -32, b: -30 }, { s: 'w', a: -32, b: -30 }, { s: 's', a: -2, b: 2, f: 1, k: 'win', lo: 0.9 }],
    stairs: [{ f: 0, r: [-3.2, -34.5, 2.8, -32.6], axis: 'x', dir: 1 }] }));
  boxes.push(C(10, -18, 2, 1.6), C(14, -26, 2, 2, cr2), C(-10, -21, 1.6, 1.4), C(8, -31, 1.4, 1.2));
  // B: janela do B (prédio de 2 andares entre B e CT), caixotes e plataforma
  boxes.push(...building(-17, -31, -7, -16, { col: casa, floors: 2,
    ops: [{ s: 'w', a: -26, b: -24 }, { s: 'e', a: -21, b: -19 }, { s: 'w', a: -21, b: -17.5, f: 1, k: 'win', lo: 0.9 }, { s: 'n', a: -15, b: -11, f: 1, k: 'win', lo: 0.9 }, { s: 's', a: -13, b: -10, k: 'win' }],
    stairs: [{ f: 0, r: [-15.2, -30.5, -9.2, -28.6], axis: 'x', dir: 1 }, { f: 1, r: [-15.2, -18.4, -9.2, -16.5], axis: 'x', dir: 1 }] }));
  boxes.push(B(-34, -32, -26, -24, 1.2, '#e0c08a'), R(-26, -32, -23, -28, 0, 1.2, 'x', -1, '#e0c08a'), C(-31, -27, 2, 2, cr, 1.2), C(-28.5, -30.5, 1.6, 1.4, cr2, 1.2), C(-22, -12, 2, 2), C(-30, -14, 2, 1.6, cr2), C(-24, -4, 1.6, 1.2), C(-34, -6, 2, 2), C(-20, -24, 1.4, 1.2, cr2), B(-39, -14.4, -34, -13.6, 1.3, wall2), C(-27, -7, 1.6, 1.4, cr2), C(-19, -3, 2, 2), C(-36, 0, 1.6, 1.2), B(-30, -21, -29.2, -17, 1.3, wall2));
  // base do T: caixotes e muretas
  boxes.push(C(-26, 25, 2, 1.6), C(-12, 28, 1.6, 1.4, cr2), C(8, 26, 2, 2), C(18, 31, 1.6, 1.2, cr2), C(30, 26, 2, 1.6), C(-34, 30, 1.6, 1.6), B(-6, 30, 6, 30.8, 1.2, wall2), C(-3, 23, 1.4, 1.2), C(36, 33, 1.4, 1.4), C(-18, 25, 1.6, 1.2), C(25, 24, 1.4, 1.4, cr2), C(13, 31, 1.4, 1.2));
  MAPS.push({
    id: 'duas-pocilgas', name: 'Duas Pocilgas', desc: 'Estilo Dust2: túneis cobertos até o B, meio com portas e linha de Sniper, catwalk alto pro A, longo com portões e casas de dois andares.',
    size: [40, 36], wallH: 6, wallColor: [wall2, wall],
    palette: { sky: '#a9d6f5', fog: ['#ead9b6', 45, 120], hemi: ['#fff4e0', '#a58a5a', 1.5], sun: ['#fff0d0', 2.4], ground: sand, tiles: ['#e2c18a', '#d6b47a', 80, 20], clouds: true },
    ...fin(boxes), props: [{ t: 'sign', x: 0, y: 4.6, z: -11.45, w: 5, h: 1.2, rot: 0, text: 'MEIO', bg: '#7a4a1c', fg: '#ffe7b0' },
      { t: 'sign', x: 30, y: 4.8, z: 4.55, w: 5, h: 1.2, rot: Math.PI, text: 'LONGO', bg: '#7a4a1c', fg: '#ffe7b0' },
      { t: 'sign', x: 39.9, y: 3.2, z: -18, w: 4, h: 2, rot: -Math.PI / 2, text: 'A', bg: '#e63946', fg: '#fff' },
      { t: 'sign', x: -39.9, y: 3.2, z: -20, w: 4, h: 2, rot: Math.PI / 2, text: 'B', bg: '#e63946', fg: '#fff' },
      { t: 'keg', x: -18, z: -34 }, { t: 'keg', x: -16.8, z: -34 }, { t: 'keg', x: 16, z: 33 }],
    spawns: [[-8, 33], [0, 33.5], [8, 33], [-20, 31], [20, 29], [30, 32], [-30, 24], [-3, -24], [6, -24], [14, -31], [-22, -34], [18, -20], [-1, -30, 3.5]],
    pickups: [['health', 0, 26], ['health', 0, -22], ['health', 30, 8], ['health', -30, 10], ['health', 12, 14, 3.5],
      ['ammo', 30, -18, 1.2], ['ammo', -26, -18], ['ammo', 0, 3], ['ammo', -20, 14], ['ammo', 15, 0, 2.2], ['ammo', 30, -30, 3.5],
      ['grenade', 0, -18], ['grenade', -12, -24, 3.5], ['grenade', 32, 18], ['grenade', -10, 9.2], ['grenade', 18, 9, 7]],
    showcase: [0, 0, 30], view: [3, 0, 25, 0.1, -0.03], openMax: 7, expMax: 0.3,
    test: { stairs: { from: [7.4, 0, 20.2], to: [13.7, 3.5, 20.2], level: 3.5 }, roof: { from: [14.4, 3.5, 20.2], to: [21, 7.0, 20.2], level: 7.0 }, under: { from: [-34, 0, 16], to: [-28, 0, 16], ceil: 3.2 } },
  });
}

// ---------- 3) Celeiro Industrial (estilo Rust/Office: galpão com mezanino e escritórios, ponte pro pátio de contêineres, telhado) ----------
{
  const metal = '#7f8c8d', cont = ['#2e86c1', '#28b463', '#d68910', '#c0392b', '#7DF9FF'], boxes = [], H = 3.6;
  const col = { wall: '#c0392b', wall2: '#a93226', inner: '#e8d5b0', floor: '#b08a5a', roof: '#5d6d7e', roof2: '#4d5d6e', stair: '#7f8c8d', trim: '#f4f1ea' };
  const K = (x, z, ax, c, y0 = 0) => boxes.push(ax === 'z' ? B(x - 1.2, z - 3, x + 1.2, z + 3, 2.6, c, y0) : B(x - 3, z - 1.2, x + 3, z + 1.2, 2.6, c, y0));
  const C = (x, z, s = 1.6, h = 1.6, c = '#9c6b3a', y0 = 0) => boxes.push(crate(x, z, s, h, c, y0));
  // galpão: térreo alto com vão central, mezanino em volta, escritórios no lado oeste do mezanino
  boxes.push(...building(-22, -16, 14, 16, { col, floors: 2, H, floorHoles: { 1: [[-12, -10, 8.5, 10]] },
    ops: [{ s: 'w', a: -2, b: 2, k: 'wide' }, { s: 'e', a: -2, b: 2, k: 'wide' }, { s: 'n', a: -18, b: -16 }, { s: 'n', a: 6, b: 8 }, { s: 's', a: -18, b: -16 }, { s: 's', a: 8, b: 10 },
      { s: 'e', a: -1, b: 1, f: 1 }, { s: 'n', a: -8, b: -2, f: 1, k: 'win', lo: 0.9 }, { s: 's', a: -4, b: 2, f: 1, k: 'win', lo: 0.9 }, { s: 'w', a: -14, b: -9, f: 1, k: 'win', lo: 0.9 }, { s: 'w', a: 8, b: 13, f: 1, k: 'win', lo: 0.9 }, { s: 'w', a: -1, b: 1, f: 1, k: 'win', lo: 0.9 }],
    stairs: [{ f: 0, r: [-4, -15.4, 2, -13.4], axis: 'x', dir: 1 }, { f: 0, r: [-2, 13.4, 4, 15.4], axis: 'x', dir: -1 }, { f: 1, r: [5.5, -15.4, 11.5, -13.4], axis: 'x', dir: 1 }],
    inner: [{ axis: 'x', s0: -21.5, s1: -12, line: -5, f: 1, ops: [{ a: -14.8, b: -13 }] }, { axis: 'x', s0: -21.5, s1: -12, line: 5, f: 1, ops: [{ a: -14.8, b: -13 }] }] }));
  // guarda-corpo do vão (com uma passagem pra pular lá de cima)
  boxes.push(B(-12, -10.15, 8.5, -10, 1.0, metal, H), B(-12, 10, -2, 10.15, 1.0, metal, H), B(0.5, 10, 8.5, 10.15, 1.0, metal, H), B(8.5, -10, 8.65, 10, 1.0, metal, H));
  boxes.push(...wallZ(-10, 10, -12.1, 0.2, 1.0, metal, [{ a: -1.5, b: 1.5, y0: 0, y1: 2 }], H));
  // térreo: estantes e empilhadeira (cobertura no vão)
  boxes.push(B(-8, -6, -6.8, 0, 2.6, '#d68910'), B(3, 1, 4.2, 7, 2.6, '#d68910'), B(-10, 4, -6, 5.2, 2.6, '#d68910'), B(1, -7, 6, -5.8, 2.6, '#d68910'), C(-2, 3, 1.6, 1.2), C(5, -2, 1.4, 1.4, '#7DF9FF'));
  boxes.push(C(-19, -12, 1.4, 1.2, '#b08a5a', H), C(-19, 12, 1.4, 1.2, '#b08a5a', H), C(-14, 0, 1.2, 1.0, '#b08a5a', H), C(11, 8, 1.4, 1.2, '#7f8c8d', H), C(-2, -12.5, 1.4, 1.0, '#7f8c8d', H));
  // telhado: casas de máquina e caixas d'água
  boxes.push(B(-18, -6, -14, -2, 2.0, '#95a5a6', 2 * H), B(-6, 4, -2, 8, 1.6, '#95a5a6', 2 * H), B(4, -6, 8, -3, 1.2, '#95a5a6', 2 * H), C(0, 11, 1.6, 1.2, '#95a5a6', 2 * H), C(-14, 12, 1.6, 1.4, '#95a5a6', 2 * H), B(-8, -9, -4, -6.5, 1.5, '#bdc3c7', 2 * H), B(-1, -1, 3, 1.5, 1.5, '#bdc3c7', 2 * H), B(-11, 1, -9, 5, 1.3, '#95a5a6', 2 * H), C(6, 7, 1.6, 1.4, '#95a5a6', 2 * H), C(-20, 4, 1.4, 1.2, '#95a5a6', 2 * H), C(9, -10, 1.4, 1.2, '#95a5a6', 2 * H));
  // ponte do mezanino até a torre de contêineres do pátio leste
  boxes.push(B(14, -1, 20, 1, 0.3, metal, H - 0.3), B(14, -1.15, 20, -1, 1.0, metal, H), B(14, 1, 20, 1.15, 1.0, metal, H), B(20, -3, 26, 3, H, cont[0]), R(26, -1.5, 31, 1.5, 0, H, 'x', -1, metal), B(20, -3, 26, -2.85, 1.0, metal, H));
  // pátio de contêineres (leste): corredores, pilhas com rampa
  K(20, -12, 'z', cont[1]); K(20, 12, 'z', cont[2]); K(30, -20, 'z', cont[3]); K(30, 8, 'z', cont[4]); boxes.push(B(28.8, 5, 31.2, 8, 2.6, cont[0], 2.6)); K(36, -6, 'z', cont[2]); K(36, 34, 'z', cont[1]);
  boxes.push(R(28.8, 11, 31.2, 15.5, 0, 2.6, 'z', -1, metal));
  K(26, -34, 'x', cont[4]); K(18, 34, 'x', cont[3]); K(34, -10 + 22, 'x', cont[1]); K(22, 22, 'z', cont[0]);
  // pátio oeste: guarita de 2 andares, plataforma de carga, silos
  boxes.push(...building(-38, -36, -28, -26, { col: { ...col, wall: '#e8d5b0', wall2: '#d9c49c' }, floors: 2,
    ops: [{ s: 'e', a: -32, b: -30 }, { s: 's', a: -35, b: -33 }, { s: 'e', a: -35, b: -32, f: 1, k: 'win', lo: 0.9 }, { s: 's', a: -32, b: -29, f: 1, k: 'win', lo: 0.9 }],
    stairs: [{ f: 0, r: [-36.5, -35.5, -30.5, -33.6], axis: 'x', dir: 1 }, { f: 1, r: [-36.5, -28.4, -30.5, -26.5], axis: 'x', dir: 1 }] }));
  boxes.push(B(-30, 2, -22, 12, 1.2, '#95a5a6'), R(-34, 4, -30, 8, 0, 1.2, 'x', 1, metal), C(-27, 6, 1.6, 1.6, '#9c6b3a', 1.2), K(-34, -12, 'z', cont[3]), K(-28, -8 + 30, 'x', cont[2]), C(-36, 0, 1.6, 1.4), C(-26, -20, 1.6, 1.6));
  // norte e sul: docas, caixotes
  K(-12, -26, 'x', cont[1]); K(2, -30, 'x', cont[4]); K(12, -24, 'x', cont[2]); C(-22, -30, 2, 1.6); C(-6, -36, 1.6, 1.2); C(6, -38, 2, 2); C(-16, -22, 1.4, 1.2); C(16, -32, 1.6, 1.6); C(-30, -14, 1.4, 1.2); C(38, 24 - 50, 1.4, 1.4);
  K(-10, 26, 'x', cont[0]); K(4, 30, 'x', cont[3]); C(-20, 34, 2, 1.6); C(10, 22, 1.6, 1.4); C(-4, 37, 1.6, 1.2); C(-14, 20, 1.4, 1.2); C(0, 21, 1.4, 1.4); C(28, 38, 1.4, 1.4);
  MAPS.push({
    id: 'celeiro-industrial', name: 'Celeiro Industrial', desc: 'Estilo Rust/Office: galpão com vão central, mezanino e escritórios, ponte até a torre de contêineres, telhado com casas de máquina e guarita de dois andares.',
    size: [40, 42], wallH: 7, wallColor: ['#8e9ea0', '#7f8c8d'],
    palette: { sky: '#b9d3e8', fog: ['#c8d4dc', 45, 130], hemi: ['#ffffff', '#7a7f70', 1.7], sun: ['#fff6e6', 2.0], ground: '#8f9a8a', tiles: ['#a3aaa0', '#9aa198', 84, 14], clouds: true },
    ...fin(boxes), props: [{ t: 'silo', x: -28, z: 30, r: 4, h: 11, c: '#bdc3c7' }, { t: 'silo', x: 28, z: 25, r: 3.5, h: 12, c: '#d0d3d4' }, { t: 'silo', x: 34, z: -30, r: 3, h: 9, c: '#bdc3c7' },
      { t: 'truck', x: 14, z: 38, c: '#e63946' }, { t: 'truck', x: -6, z: -20, c: '#2f80ed' }, { t: 'sign', x: -4, y: 5.4, z: 16.05, w: 8, h: 2, rot: 0, text: 'CELEIRO C!', bg: '#7a1f17', fg: '#ffe7b0' },
      { t: 'hay', x: -34, z: 38 }, { t: 'hay', x: -36, z: 38 }, { t: 'hay', x: 38, z: 0 }],
    spawns: [[-12, 38], [8, 33], [24, 38], [-30, 40], [-24, -39], [-8, -40], [12, -36], [24, -26], [37, -20], [-37, 18], [-17, 0, H], [-34, -30, H]],
    pickups: [['health', -2, 0], ['health', -16, -10, H], ['health', 0, 34], ['health', 0, -34], ['health', 30, 9.5, 2.6],
      ['ammo', -16, 10, H], ['ammo', 23, 0, H], ['ammo', -10, 0, 2 * H], ['ammo', -26, 4, 1.2], ['ammo', 34, 0], ['ammo', -34, -32, H],
      ['grenade', 10, 0], ['grenade', 0, -13, H], ['grenade', -30, -20], ['grenade', 30, 30], ['grenade', 26, -26]],
    showcase: [2, 0, 34], view: [3, 0, 13, 0.75, 0.08], openMax: 7,
    test: { stairs: { from: [-3.6, 0, -14.4], to: [3.5, H, -14.4], level: H }, under: { from: [-18, 0, -8], to: [-18, 0, 8], ceil: 3.3 }, roof: { from: [5.8, H, -14.4], to: [12.6, 2 * H, -14.4], level: 2 * H } },
  });
}

// ---------- 4) Mercadão (estilo Mirage: palácio com sacada pro A, apartamentos pro B, sala da janela no fim do meio, conector) ----------
{
  const t1 = '#d9825b', t2 = '#e8a06a', t3 = '#c96f4a', t4 = '#f0c08a', stone = '#e6d3b3', rail = '#8b5a2b', boxes = [], H = 3.5;
  const casa = (w, w2) => ({ wall: w, wall2: w2, inner: t4, floor: '#c9a46a', roof: '#b5523b', roof2: '#9c4532', stair: rail, trim: stone });
  const C = (x, z, s = 1.6, h = 1.6, c = '#9c6b3a', y0 = 0) => boxes.push(crate(x, z, s, h, c, y0));
  // quarteirões maciços que separam os corredores
  boxes.push(B(-28, -12, -12, -4, 7, t1), B(-12, -12, 4, -4, 7, t2), B(-28, 4, 2, 8, 7, t3), B(2, 4, 5, 8.6, 7, t3), B(14, 4, 18, 14, 7, t1), B(-10, -34, 4, -28, 7, t3), B(-20, 26, 0, 34, 7, t2), B(-28, 8, -22, 22, 7, t4));
  // palácio (2 andares): entra pelo T, sai na sacada e desce a rampa pro A
  boxes.push(...building(-26, -34, -10, -20, { col: casa(t2, t1), floors: 2,
    ops: [{ s: 'w', a: -28, b: -26 }, { s: 's', a: -15, b: -13 }, { s: 'e', a: -26, b: -24, f: 1 }, { s: 's', a: -24, b: -20, f: 1, k: 'win', lo: 0.9 }, { s: 'e', a: -31, b: -29, f: 1, k: 'win', lo: 0.9 }, { s: 's', a: -22, b: -19, k: 'win' }],
    stairs: [{ f: 0, r: [-24.5, -33.5, -18.5, -31.6], axis: 'x', dir: 1 }],
    inner: [{ axis: 'z', s0: -33.5, s1: -20.5, line: -17, ops: [{ a: -25.8, b: -24 }] }, { axis: 'z', s0: -33.5, s1: -20.5, line: -17, f: 1, ops: [{ a: -25.8, b: -24 }] }] }));
  boxes.push(B(-10, -27, -6, -23, 0.25, t4, H - 0.25), B(-10, -27, -6, -26.85, 1.0, rail, H), B(-10, -23.15, -6, -23, 1.0, rail, H), R(-6, -27, -2, -23, 0, H, 'x', -1, stone), { wp: [-8, H, -25] }, { wp: [-4, 1.75, -25] });
  // rampa do A (beco) e o A
  C(-20, -15, 1.4, 1.2); C(-6, -16.5, 1.6, 1.4, '#b07a45');
  boxes.push(B(10, -28, 16, -24, 1.2, stone), R(13, -24, 16, -21, 0, 1.2, 'z', -1, stone), C(12, -27, 1.6, 1.6, '#b07a45', 1.2), C(6, -20, 2, 2), C(20, -30, 1.6, 1.6), C(26, -16, 2, 1.4, '#b07a45'), B(16, -19, 19, -18.2, 1.3, stone));
  boxes.push(...building(22, -26, 30, -20, { col: casa(t4, t2), floors: 1, H: 3.2, ops: [{ s: 'w', a: -24, b: -22 }, { s: 'e', a: -24, b: -22 }, { s: 'n', a: 25, b: 27, k: 'win' }], roofGaps: [{ s: 'n', a: 28, b: 29.8 }] }));
  boxes.push(R(28, -31, 29.8, -26, 0, 3.2, 'z', 1, '#b07a45'));
  // conector (jungle): liga A, meio e a sala da janela
  boxes.push(...building(4, -14, 18, -4, { col: casa(t3, t1), floors: 1, H: 3.4, parapet: 0, ops: [{ s: 'n', a: 8, b: 10 }, { s: 's', a: 6, b: 8 }, { s: 'e', a: -11, b: -9 }, { s: 'n', a: 13, b: 16, k: 'win' }],
    inner: [{ axis: 'z', s0: -13.5, s1: -4.5, line: 11, ops: [{ a: -8, b: -6 }] }] }));
  // sala da janela (2 andares) no fim do meio
  boxes.push(...building(18, -8, 28, 8, { col: casa(t2, t3), floors: 2,
    ops: [{ s: 'n', a: 22, b: 24 }, { s: 's', a: 22, b: 24 }, { s: 'e', a: -1, b: 1 }, { s: 'w', a: -2, b: 2, f: 1, k: 'win', lo: 0.9 }, { s: 'w', a: -6, b: -4, k: 'win' }, { s: 'n', a: 20, b: 22, f: 1, k: 'win', lo: 0.9 }, { s: 's', a: 25, b: 27, f: 1, k: 'win', lo: 0.9 }],
    stairs: [{ f: 0, r: [20, 5.6, 26, 7.5], axis: 'x', dir: -1 }] }));
  C(20.5, -1, 1.2, 1.0, '#9c6b3a', H);
  // meio: caixotes nas laterais (a linha do Sniper fica no centro)
  C(-22, 2.6, 1.6, 1.4); C(-14, -2.6, 1.6, 1.6, '#b07a45'); C(-5, 2.6, 1.6, 1.2); C(3, -2.6, 1.4, 1.4, '#b07a45'); C(10, 2.6, 1.6, 1.6); C(15, -2.6, 1.2, 1.0);
  // apartamentos (2 andares): entra pelo T, corredor de cima, sai na sacada e desce pro B
  boxes.push(...building(-22, 8, -4, 22, { col: casa(t4, t3), floors: 2,
    ops: [{ s: 'w', a: 16, b: 18 }, { s: 'e', a: 18, b: 20 }, { s: 'e', a: 10, b: 12, f: 1 }, { s: 's', a: -18, b: -14, f: 1, k: 'win', lo: 0.9 }, { s: 's', a: -10, b: -7, k: 'win' }, { s: 'n', a: -12, b: -8, f: 1, k: 'win', lo: 0.9 }],
    stairs: [{ f: 0, r: [-20.5, 8.5, -14.5, 10.4], axis: 'x', dir: 1 }],
    inner: [{ axis: 'x', s0: -21.5, s1: -4.5, line: 14, f: 1, ops: [{ a: -19, b: -17.2 }, { a: -9, b: -7.2 }] }, { axis: 'z', s0: 8.5, s1: 21.5, line: -13, ops: [{ a: 15, b: 17 }] }] }));
  boxes.push(B(-4, 9, 0, 13, 0.25, t4, H - 0.25), B(-4, 9, 0, 9.15, 1.0, rail, H), B(-4, 12.85, 0, 13, 1.0, rail, H), R(0, 9, 4, 13, 0, H, 'x', -1, stone), { wp: [-2, H, 11] }, { wp: [2, 1.75, 11] });
  // mercearia (B curto): do meio até o B
  boxes.push(...building(5, 6, 14, 13, { col: casa(t1, t3), floors: 1, H: 3.3, parapet: 0, ops: [{ s: 'n', a: 7, b: 9 }, { s: 's', a: 10, b: 12 }, { s: 'w', a: 9, b: 11, k: 'win' }] }));
  boxes.push(B(-24, 22, -22, 26, 7, t1)); // fecha o canto do beco
  // B: fonte, bancada e caixotes
  boxes.push(...wallX(14, 18, 18, 0.4, 0.9, stone), ...wallX(14, 18, 22, 0.4, 0.9, stone), ...wallZ(18, 22, 14, 0.4, 0.9, stone), ...wallZ(18, 22, 18, 0.4, 0.9, stone));
  boxes.push(B(20, 26, 28, 31, 1.2, stone), R(16.5, 27, 20, 30, 0, 1.2, 'x', 1, stone), C(25, 28.5, 1.6, 1.6, '#b07a45', 1.2), C(8, 20, 2, 2), C(10, 30, 1.6, 1.4), C(24, 16, 1.6, 1.6, '#b07a45'), C(2, 28, 1.6, 1.2), C(-6, 24, 1.4, 1.2));
  // bases: T a oeste, CT a leste
  C(-34, -12, 2, 1.6); C(-32, 12, 2, 1.6, '#b07a45'); C(-35, 26, 1.6, 1.4); C(-34, -26, 1.6, 1.4); C(-30, 0, 1.4, 1.2); C(-36, 3, 1.4, 1.4);
  C(33, -12, 2, 1.6); C(32, 14, 2, 1.6, '#b07a45'); C(34, 26, 1.6, 1.4); C(34, -28, 1.6, 1.4); C(31, 3, 1.4, 1.2); C(36, -3, 1.4, 1.4);
  MAPS.push({
    id: 'mercadao', name: 'Mercadão', desc: 'Estilo Mirage: palácio com sacada sobre a rampa do A, apartamentos de dois andares até o B, conector, mercearia e a sala da janela olhando o meio.',
    size: [38, 34], wallH: 7, wallColor: [t1, t3],
    palette: { sky: '#9fd0f0', fog: ['#f2d6b0', 45, 115], hemi: ['#fff1dc', '#b07a4a', 1.6], sun: ['#ffe2b8', 2.3], ground: '#e3c9a0', tiles: ['#e8cfa6', '#dcc094', 76, 38], clouds: true },
    ...fin(boxes), props: [...[[0, -17, '#e63946'], [14, -32, '#7DF9FF'], [-33, -18, '#f2c94c'], [30, 20, '#e63946'], [-12, 30 - 6, '#7DF9FF'], [36, -16, '#f2c94c']].map(([x, z, c]) => ({ t: 'stall', x, z, c })),
      { t: 'water', x: 16, z: 20, r: 1.5, y: 0.6 }, { t: 'jar', x: -13, z: -15 }, { t: 'jar', x: 13, z: 17 }, { t: 'jar', x: -27.5, z: 30 },
      { t: 'awning', x0: 26, z0: -12, x1: 29, z1: -10, y: 3, c: '#e63946' },
      { t: 'sign', x: -20, y: 5, z: -12.05, w: 5, h: 1.1, rot: Math.PI, text: 'MERCADÃO', bg: '#8b2f1c', fg: '#ffe7b0' },
      { t: 'sign', x: -12, y: 5, z: 8.05, w: 5, h: 1.1, rot: 0, text: 'FEIRA C!', bg: '#8b2f1c', fg: '#ffe7b0' }],
    spawns: [[-34, -5], [-34, 7], [-33, -21], [-34, 19], [-30, 30], [-30, -30], [34, -20], [34, 0], [34, 20], [30, 31], [30, -31], [23, 0, H]],
    pickups: [['health', -30, 4], ['health', 30, -4], ['health', -14, -27, H], ['health', -14, 18, H], ['health', 16, 24],
      ['ammo', 0, 0], ['ammo', 14.4, -25.2, 1.2], ['ammo', 22, 28.5, 1.2], ['ammo', 8, -9], ['ammo', 8, 9.5], ['ammo', 25, 4, H],
      ['grenade', -20, -17], ['grenade', -8, -25, H], ['grenade', -8.5, 23.5], ['grenade', 26, -23], ['grenade', -2, 11, H]],
    showcase: [0, 0, 28], view: [-30, 0, 0, -1.57, 0.0], openMax: 7,
    test: { stairs: { from: [-20.2, 0, 9.4], to: [-13.8, H, 9.4], level: H }, under: { from: [-20, 0, 17], to: [-14, 0, 17], ceil: 3.2 }, roof: { from: [26, 0, 0.5 - 31], via: [[28.9, -30.5]], to: [28.9, 3.2, -23], level: 3.2 } },
  });
}

// ---------- 5) Torres Gêmeas do Barril (mapa de Sniper em 3 corredores: torres, ruínas, planaltos com ponte, casamata) ----------
{
  const red = '#e63946', red2 = '#c0303c', cyan = '#4fd8e8', cyan2 = '#2fb5c9', rock = '#8d8070', earth = '#a58b5f', floor = '#d9c7a0';
  const tower = (wc, wc2) => {
    const o = [];
    o.push(...wallX(-8, 8, 52.4, 0.8, 4, wc, [door(-2, 2, 4)]), ...wallX(-8, 8, 63.6, 0.8, 4, wc, [door(-2, 2, 4)]));
    o.push(...wallZ(52.8, 63.2, -7.6, 0.8, 4, wc2, [door(56, 60, 4)]), ...wallZ(52.8, 63.2, 7.6, 0.8, 4, wc2, [door(56, 60, 4)]));
    o.push(B(-8, 48, 8, 64, 0.4, floor, 4), B(8, 48, 12, 52, 0.4, floor, 4), R(8, 52, 12, 64, 0, 4.4, 'z', -1, wc2));
    o.push(B(-8, 48, -1.2, 48.4, 0.9, wc, 4.4), B(1.2, 48, 8, 48.4, 0.9, wc, 4.4)); // mureta da varanda
    o.push(B(-8.3, 48, -8, 64, 1.0, wc, 4.4), B(7.6, 52, 8, 64, 1.0, wc, 4.4), B(-8, 63.6, 8, 64, 1.0, wc, 4.4), B(4.6, 60.5, 6.2, 62.1, 1.2, '#8b5a2b', 4.4), B(1.5, 50, 3.1, 51.6, 1.2, '#8b5a2b', 4.4), B(-5, 63.6, 5, 64, 1.0, wc, 8.4), B(-3.6, 56.4, -2.4, 57.6, 1.0, '#8b5a2b', 8.4));
    o.push(R(-8, 50, -5, 62, 4.4, 8.4, 'z', 1, wc2), B(-5, 54, 5, 64, 0.4, floor, 8));
    o.push(B(-5, 54, -0.5, 54.4, 0.9, wc, 8.4), B(0.5, 54, 5, 54.4, 0.9, wc, 8.4), B(4.6, 54, 5, 64, 0.9, wc, 8.4)); // mureta do topo (fresta do sniper)
    o.push(B(-1, -1, 1, 1, 0, wc)); // (marcador)
    return o.filter((b) => b.b[4] > b.b[1]);
  };
  const boxes = [...tower(red, red2), ...mirrorZ(tower(cyan, cyan2))];
  const ruin = { wall: '#b8a98f', wall2: '#a89a80', inner: '#c9bba2', floor: '#9c8a6a', stair: '#8b5a2b', trim: '#d9c7a0' };
  const half = []; // metade norte (z > 0); a sul é espelhada
  // planaltos + ponte (dá pra passar por baixo) e ruínas em cima
  half.push(B(-14, 10, 14, 22, 3, earth), R(-3, 22, 3, 31, 0, 3, 'z', -1, earth), R(14, 12, 22, 18, 0, 3, 'x', -1, earth));
  half.push(B(-11, 13, -7, 13.6, 1.3, rock, 3), B(6, 17, 10, 17.6, 1.3, rock, 3), B(-2, 19, -1.4, 21.5, 1.3, rock, 3), crate(11.5, 12.5, 1.4, 1.2, '#8b5a2b', 3));
  // corredor oeste: casa em ruínas de 2 andares (sem telhado) e trincheira
  half.push(...building(-29, 26, -15, 38, { col: ruin, floors: 2, roof: false,
    ops: [{ s: 'e', a: 30, b: 32 }, { s: 'n', a: -24, b: -21 }, { s: 's', a: -19, b: -17 }, { s: 'e', a: 34, b: 37, k: 'win' }, { s: 'n', a: -28, b: -25, f: 1, k: 'win', lo: 0.6 }, { s: 'e', a: 28, b: 33, f: 1, k: 'win', lo: 0.9 }, { s: 's', a: -26, b: -21, f: 1, k: 'win', lo: 0.9 }],
    stairs: [{ f: 0, r: [-27.2, 36, -21.2, 37.5], axis: 'x', dir: 1 }], inner: [{ axis: 'x', s0: -28.5, s1: -15.5, line: 31, ops: [{ a: -20, b: -18.2 }] }] }));
  half.push(B(-25, 6, -24.3, 19, 1.3, '#8b7d5a'), B(-19.7, 6, -19, 19, 1.3, '#8b7d5a'), B(-29, 12, -26, 12.7, 1.2, '#8b7d5a'), crate(-22, 22, 1.4, 1.2, '#8b5a2b'));
  // corredor leste: paredões de pedra
  half.push(B(15, 26, 16, 40, 2.6, rock), B(22, 30, 25, 33, 2.2, rock), B(26, 20, 30, 21, 2.6, rock), B(18, 44, 22, 45, 2.0, rock));
  // ruínas entre o meio e as torres
  half.push(...wallX(-12, -4, 38, 0.6, 2.4, ruin.wall, [door(-9, -7.4, 1.8)]), ...wallX(2, 9, 42, 0.6, 2.4, ruin.wall), B(-3, 34, -2.4, 37, 1.6, ruin.wall2), crate(5, 34, 1.6, 1.4, '#8b5a2b'), crate(-15.5, 46, 1.4, 1.2, '#8b5a2b'));
  // laterais perto das torres
  half.push(B(-26, 48, -22, 49, 2.0, rock), crate(-18, 64, 1.6, 1.6, '#8b5a2b'), crate(22, 64, 1.6, 1.4, '#8b5a2b'), B(14, 56, 15, 62, 1.6, rock), B(-28, 60, -24, 61, 1.4, rock), crate(-17, 54, 1.6, 1.4, '#8b5a2b'));
  boxes.push(...half, ...mirrorZ(half));
  boxes.push(B(-3, -10, 3, 10, 0.3, '#8b5a2b', 2.7), B(-3, -10, -2.7, 10, 1.0, '#6b4423', 3), B(2.7, -10, 3, 10, 1.0, '#6b4423', 3), B(-0.5, -0.5, 0.5, 0.5, 2.7, '#6b4423'), B(-0.5, -6.5, 0.5, -5.5, 2.7, '#6b4423'), B(-0.5, 5.5, 0.5, 6.5, 2.7, '#6b4423'));
  // casamata no meio do corredor leste (telhado pelas rampas das pontas)
  boxes.push(...building(16, -7, 28, 7, { col: { ...ruin, wall: '#7f8c6d', wall2: '#6f7c5d', roof: '#5f6c4d', roof2: '#4f5c3d' }, floors: 1, H: 3.2,
    ops: [{ s: 'w', a: -1, b: 1 }, { s: 'e', a: -1, b: 1 }, { s: 'n', a: 19, b: 21 }, { s: 's', a: 23, b: 25 }, { s: 'w', a: -5, b: -3, k: 'win', lo: 1.2, hi: 1.8 }, { s: 'w', a: 3, b: 5, k: 'win', lo: 1.2, hi: 1.8 }],
    roofGaps: [{ s: 'n', a: 24, b: 27.5 }, { s: 's', a: 16.5, b: 20 }], inner: [{ axis: 'z', s0: -6.5, s1: 6.5, line: 22, ops: [{ a: -4.5, b: -2.7 }, { a: 2.7, b: 4.5 }] }] }));
  boxes.push(R(24, -12, 27.5, -7, 0, 3.55, 'z', 1, '#7f8c6d'), R(16.5, 7, 20, 12, 0, 3.55, 'z', -1, '#7f8c6d'), crate(20, -2, 1.2, 1.0, '#8b5a2b', 3.55), crate(25, 3, 1.2, 1.0, '#8b5a2b', 3.55));
  // pedras de cobertura nas laterais
  for (const [x, z, s, h] of [[-22, 30 - 30, 3, 2], [-10, 4, 2, 1.4], [8, -4, 2, 1.4], [-27, -4, 2, 1.6], [-14, 2, 1.6, 1.2], [10, 6, 1.6, 1.2], [-6, 26, 2, 1.6], [6, -26, 2, 1.6], [-24, -18 - 6, 2.5, 1.8], [24, 18, 2.5, 1.8], [-8, 42, 2, 1.4], [8, -42, 2, 1.4], [-18, -42, 3, 2], [18, 42 - 6, 3, 2]])
    boxes.push(B(x - s / 2, z - s / 2, x + s / 2, z + s / 2, h, rock), B(x - s / 2, -z - s / 2, x + s / 2, -z + s / 2, h, rock));
  for (const wp of [[-4.2, 8.4, 61.6], [-4.2, 8.4, -61.6], [0, 8.4, 58], [0, 8.4, -58], [-6.5, 8.3, 61.7], [-6.5, 8.3, -61.7]]) boxes.push({ wp });
  const kegs = []; for (const [x, z] of [[-12, 46], [-11, 46], [-11.5, 47], [12, 44], [16, 50], [-13, 24.5], [18, 24]]) kegs.push({ t: 'keg', x, z }, { t: 'keg', x, z: -z });
  MAPS.push({
    id: 'torres-do-barril', name: 'Torres Gêmeas do Barril', desc: 'Mapa comprido de Sniper em três corredores: torres de três andares, ruínas de dois andares com trincheira, planaltos com ponte e casamata com telhado no corredor leste.',
    size: [30, 72], wallH: 5, wallColor: [rock, '#7a6e60'],
    palette: { sky: '#7ec8f2', fog: ['#b8e0f5', 70, 180], hemi: ['#ffffff', '#5a8f3a', 1.6], sun: ['#ffffff', 2.3], ground: '#6cbf4f', tiles: null, clouds: true },
    ...(() => { const F = fin(boxes); F.boxes = F.boxes.filter((b) => b.b[4] - b.b[1] > 0.05); return F; })(), props: [...kegs, { t: 'tree', x: -26, z: 0 }, { t: 'tree', x: 26, z: 4 }, { t: 'tree', x: -26, z: 50 }, { t: 'tree', x: 26, z: -50 },
      { t: 'banner', x: 0, y: 6.2, z: 47.9, c: red, rot: Math.PI }, { t: 'banner', x: 0, y: 6.2, z: -47.9, c: cyan, rot: 0 }],
    spawns: [[0, 58], [-4, 60, 4.4], [20, 60], [-20, 56], [0, -58], [4, -60, 4.4], [-20, -60], [20, -56], [-24, 0], [24, 0]],
    pickups: [['health', 1.5, 0, 3], ['health', -22, 40], ['health', 22, -40], ['health', 0, 58], ['health', 0, -58],
      ['ammo', 4, 58, 4.4], ['ammo', -4, -58, 4.4], ['ammo', 0, 60, 8.4], ['ammo', 0, -60, 8.4], ['ammo', -26, -20], ['ammo', 27, 23],
      ['grenade', -24, 0], ['grenade', 24, 0], ['grenade', 0, 16, 3], ['grenade', 0, -16, 3]],
    openMax: 7.5, // mapa de Sniper: um pouco mais aberto de propósito
    showcase: [22, 0, 36], view: [0, 4.4, 50, 0, -0.04],
    test: { stairs: { from: [10, 0, 63], to: [10, 4.4, 50], level: 4.4 }, roof: { from: [-6.5, 4.4, 50.6], via: [[-6.5, 61.6]], to: [-2.5, 8.4, 61.6], level: 8.4 }, under: { from: [-8, 0, 1.8], to: [8, 0, 1.8], ceil: 2.7 } },
  });
}

// ---------- 6) Vizinhança Cheers (inspirado em Nuketown: duas casas frente a frente, garagens, quintais) ----------
{
  // casa norte (a do sul é a mesma girada 180° em volta do centro)
  const casa = (c) => {
    const o = [];
    o.push(...building(-16, -19, -2, -8, { col: c, floors: 2,
      ops: [{ s: 's', a: -10, b: -8.2 }, { s: 's', a: -15, b: -12.5, k: 'win' }, { s: 's', a: -5.5, b: -3, k: 'win' },
        { s: 'n', a: -6.2, b: -4.4 }, { s: 'n', a: -14, b: -11, k: 'win' }, { s: 'w', a: -15, b: -13.2 }, { s: 'e', a: -16, b: -13, k: 'win' },
        { s: 's', a: -10, b: -8.2, f: 1, hi: 2.4 }, { s: 's', a: -15, b: -12, f: 1, k: 'win', lo: 0.9 }, { s: 's', a: -6, b: -3, f: 1, k: 'win', lo: 0.9 },
        { s: 'n', a: -14, b: -11, f: 1, k: 'win', lo: 0.9 }, { s: 'w', a: -14, b: -12.2, f: 1, hi: 2.4 }, { s: 'e', a: -16, b: -12, f: 1, k: 'win', lo: 0.9 }],
      stairs: [{ f: 0, r: [-8.5, -18.5, -2.5, -16.6], axis: 'x', dir: 1 }],
      inner: [{ axis: 'z', s0: -15.6, s1: -8.5, line: -11.2, ops: [{ a: -13.4, b: -11.6 }] }, { axis: 'z', s0: -15.6, s1: -8.5, line: -11.2, f: 1, ops: [{ a: -12.6, b: -10.8 }] }],
      roofGaps: [{ s: 'w', a: -18.6, b: -15.8 }] }));
    o.push(...balcony(-12, -8, -6, -6.2, 3.5, c.floor, c.trim, 'n'), B(-12, -6.6, -11.6, -6.2, 3.25, c.trim), B(-6.4, -6.6, -6, -6.2, 3.25, c.trim));
    // garagem (telhado em 3,5 m: liga na janela-porta do 2º andar; rampa no telhado leva ao telhado da casa)
    o.push(...building(-23, -18, -16, -9, { col: { ...c, wall: c.wall2 || c.wall }, floors: 1, ops: [{ s: 's', a: -22, b: -17, k: 'wide' }, { s: 'e', a: -15, b: -13.2 }, { s: 'n', a: -21, b: -19.4 }],
      roofGaps: [{ s: 'w', a: -12.4, b: -10 }, { s: 'e', a: -18, b: -15.6 }, { s: 'e', a: -14.4, b: -11.8 }] }));
    o.push(R(-22.7, -17.7, -16, -15.8, 3.5, 7, 'x', 1, c.stair)); // telhado da garagem → telhado da casa
    o.push(R(-27, -12.2, -23, -10.2, 0, 3.5, 'x', 1, c.stair)); // "escada" do beco lateral → telhado da garagem
    o.push(crate(-20, -14.5, 1.6, 1.4, '#9c6b3a'), crate(-18, -11, 1.2, 1.0, '#b07a45'), crate(-5, -13, 1.4, 0.9, '#9c6b3a'), B(-15.4, -10.6, -13, -9.4, 0.9, '#8b5a2b')); // dentro
    // galpão do quintal leste (telhado alcançável pela pilha de caixotes)
    o.push(...building(6, -19, 14, -12, { col: { wall: '#b5793e', wall2: '#a0682f', floor: '#c8a27a', roof: '#6b4423' }, floors: 1, H: 3.2, ops: [{ s: 's', a: 8.8, b: 10.6 }, { s: 'w', a: -17, b: -14, k: 'win' }, { s: 'e', a: -16.5, b: -14.7 }], roofGaps: [{ s: 's', a: 12, b: 14 }] }));
    o.push(crate(13, -10.8, 1.6, 1.0, '#9c6b3a'), crate(13, -10.8, 1.2, 1.0, '#b07a45', 1.0), B(12.2, -12, 13.8, -11.4, 2.2, '#9c6b3a'), R(12.2, -11.4, 13.8, -9.6, 2.2, 3.2, 'z', -1, '#b07a45'));
    // quintais: cercas com vãos, casinha do cachorro, caixotes
    o.push(B(-30, -20.2, -24, -19.8, 1.2, '#b5793e'), B(-21, -21.2, -12, -20.8, 1.2, '#b5793e'), B(-9, -21.2, -1, -20.8, 1.2, '#b5793e'), B(2, -21.2, 5, -20.8, 1.2, '#b5793e'), B(16, -21.2, 24, -20.8, 1.2, '#b5793e'));
    o.push(B(-1.2, -24, -0.8, -19, 1.2, '#b5793e'), crate(-16, -23.5, 2.2, 1.4, '#a0682f'), crate(-3, -24.4, 1.6, 1.6), crate(19, -23.6, 1.6, 1.6), crate(26, -15, 2, 1.6, '#b07a45'), crate(26, -12.8, 1.4, 1.0));
    o.push(B(20, -17, 22, -14.5, 1.3, '#d35400'), B(-27.5, -4.8, -25.5, -3, 1.4, '#9c6b3a'), crate(-28, 4.5, 1.6, 1.6));
    o.push(B(2.5, -9, 4.5, -7.5, 1.1, '#2f80ed'), B(-29, -17, -27, -15, 1.4, '#9c6b3a')); // caixa de correio grande / lixeira
    return o;
  };
  const cA = { wall: '#f2d16b', wall2: '#e8c25a', inner: '#f7e3a0', floor: '#c8a27a', roof: '#e63946', roof2: '#c0303c', stair: '#b5793e', trim: '#ffffff' };
  const cB = { wall: '#9be8f0', wall2: '#86d8e2', inner: '#c8f3f7', floor: '#c8a27a', roof: '#12233a', roof2: '#1d3557', stair: '#b5793e', trim: '#ffffff' };
  const boxes = [...casa(cA), ...rot180(casa(cB), 0, 0)];
  boxes.push(B(-12, -2.2, -8, 2.2, 1.5, '#2f80ed'), B(8, -2.2, 12, 2.2, 1.5, '#28b463')); // carros no meio da rua (deixam as faixas laterais abertas pro Sniper)
  boxes.push(crate(-20, 4.5, 1.6, 1.2), crate(20, -4.5, 1.6, 1.2), B(-1, -5.5, 1, -4.5, 1.0, '#e8e8e8'), B(-1, 4.5, 1, 5.5, 1.0, '#e8e8e8'));
  MAPS.push({
    id: 'vizinhanca-cheers', name: 'Vizinhança Cheers', desc: 'Estilo Nuketown: duas casas de dois andares frente a frente, garagens com telhado, sacadas, quintais e o ônibus no meio da rua.',
    size: [30, 26], wallH: 3, wallColor: ['#b5793e', '#a0682f'],
    palette: DAY({ ground: '#7cc95a', tiles: null }),
    ...fin(boxes), props: [{ t: 'street', x0: -30, z0: -7, x1: 30, z1: 7 }, { t: 'bus', x: 0, z: 0, c: '#f2c94c' }, { t: 'truck', x: 19, z: 3.6, c: '#e63946' }, { t: 'truck', x: -19, z: -3.6, c: '#2f80ed' },
      { t: 'tree', x: -27, z: -23 }, { t: 'tree', x: 27, z: 23 }, { t: 'tree', x: 27, z: -23 }, { t: 'tree', x: -27, z: 23 }, { t: 'tree', x: -9, z: -24 }, { t: 'tree', x: 9, z: 24 },
      { t: 'sign', x: -9.1, y: 6.0, z: -7.9, w: 3, h: 0.9, rot: 0, text: 'C! 1', bg: '#e63946', fg: '#fff' }, { t: 'sign', x: 9.1, y: 6.0, z: 7.9, w: 3, h: 0.9, rot: Math.PI, text: 'C! 2', bg: '#12233a', fg: '#7DF9FF' }],
    spawns: [[-20, -23.5], [-6, -23.5], [10, -23.5], [20, 23.5], [6, 23.5], [-10, 23.5], [-27.5, -8], [27.5, 8], [-12, -11.5], [12, 11.5], [27, -19], [-27, 19]],
    pickups: [['health', -12.5, -16], ['health', 12.5, 16], ['ammo', -12, -16.5, 3.5], ['ammo', 12, 16.5, 3.5], ['ammo', -27, 0], ['ammo', 27, 0],
      ['grenade', -9, -13, 7], ['grenade', 9, 13, 7], ['grenade', 10, -15.5], ['grenade', -10, 15.5], ['health', 0, -23], ['health', 0, 23]],
    showcase: [4, 0, -4], view: [22, 0, 5, 1.35, 0.02], openMax: 7,
    test: { stairs: { from: [-9.8, 0, -17.5], via: [[-3.2, -17.5]], to: [-3.2, 3.5, -15.2], level: 3.5 }, under: { from: [-15, 0, -12.5], to: [-10.2, 0, -12.5], ceil: 3.2 }, roof: { from: [-22.4, 3.5, -16.8], to: [-13, 7.0, -16.8], level: 7.0 } },
  });
}

// ---------- 7) Bar Cheers Noturno (estilo Office: salão com balcão, ala de 2 andares com cozinha/depósito e VIP, banheiros, escritório, sinuca, corredores laterais) ----------
{
  const wood = '#5a3420', dark = '#2a2238', neon = '#7DF9FF', pink = '#ff5fa2', boxes = [], H = 3.3;
  const col = { wall: '#3b2a4a', wall2: '#33243f', inner: '#4a3a5a', floor: '#4a2e1e', roof: '#231c30', roof2: '#1b1626', stair: wood, trim: neon };
  const C = (x, z, s = 1.4, h = 1.2, c = '#6b4423', y0 = 0) => boxes.push(crate(x, z, s, h, c, y0));
  // ala norte (2 andares): cozinha | corredor | depósito no térreo; VIP com janelões e sacada em cima; terraço no telhado
  boxes.push(...building(-21, -20, 21, -10, { col, floors: 2, H,
    ops: [{ s: 's', a: -15, b: -13 }, { s: 's', a: -1.5, b: 1.5 }, { s: 's', a: 12, b: 14 }, { s: 'w', a: -16, b: -14 }, { s: 'e', a: -16, b: -14 },
      { s: 's', a: -2, b: 2, f: 1 }, { s: 's', a: -18, b: -8, f: 1, k: 'win', lo: 0.9 }, { s: 's', a: 7, b: 17, f: 1, k: 'win', lo: 0.9 }, { s: 'w', a: -17, b: -13, f: 1, k: 'win', lo: 0.9 }, { s: 'e', a: -17, b: -13, f: 1, k: 'win', lo: 0.9 }],
    stairs: [{ f: 0, r: [-4.5, -19.5, 1.5, -17.6], axis: 'x', dir: 1 }, { f: 1, r: [9, -19.5, 15, -17.6], axis: 'x', dir: 1 }],
    inner: [{ axis: 'z', s0: -19.5, s1: -10.5, line: -6, ops: [{ a: -14.5, b: -12.7 }] }, { axis: 'z', s0: -19.5, s1: -10.5, line: 6, ops: [{ a: -14.5, b: -12.7 }] },
      { axis: 'z', s0: -19.5, s1: -10.5, line: -8, f: 1, ops: [{ a: -15, b: -13.2 }] }] }));
  boxes.push(B(-19, -19.5, -14, -18.5, 1.0, '#8a8a9a'), B(-12, -14, -9, -12.5, 1.0, '#8a8a9a'), C(9, -16, 1.6, 1.6), C(16, -12.5, 1.4, 1.4), C(18.5, -18, 1.4, 1.2)); // fogão, bancada, caixas do depósito
  boxes.push(B(-18, -16, -15, -14.6, 0.9, '#7a2d5a', H), B(-4, -14.5, 0, -13, 0.9, '#7a2d5a', H), B(14, -12.6, 18, -11.4, 1.0, '#1b1626', H), C(-12, -12, 1.2, 1.0, wood, 2 * H), C(4, -15, 1.4, 1.2, wood, 2 * H), C(-16, -16, 1.4, 1.2, wood, 2 * H));
  // sacada do VIP + escada pro salão
  boxes.push(B(-4, -10, 4, -7.6, 0.25, wood, H - 0.25), B(-4, -7.75, 4, -7.6, 1.0, '#1b1626', H), B(-4, -10, -3.85, -7.6, 1.0, '#1b1626', H), R(4, -10, 9.5, -7.6, 0, H, 'x', -1, wood), { wp: [0, H, -8.8] }, { wp: [6.8, 1.65, -8.8] });
  // salão: balcão em U, mesas, palco com DJ
  boxes.push(B(-7, -4, 7, -2.8, 1.2, wood), B(5.8, -4, 7, 2, 1.2, wood), B(-7, -4, -5.8, 0, 1.2, wood));
  boxes.push(B(-8, 13, 8, 19.5, 1.0, '#3a2a48'), R(8, 13, 11, 19.5, 0, 1, 'x', -1, '#3a2a48'), R(-11, 13, -8, 19.5, 0, 1, 'x', 1, '#3a2a48'));
  boxes.push(B(-2, 16.5, 2, 18, 1.2, '#1b1626', 1), B(-6.5, 17, -5, 18.6, 2.4, '#111', 1), B(5, 17, 6.5, 18.6, 2.4, '#111', 1));
  for (const [x, z] of [[-9, 4], [-4, 8], [4, 8], [9, 4], [-9, -6.5], [10, -2]]) boxes.push(B(x - 0.7, z - 0.7, x + 0.7, z + 0.7, 0.95, '#6b4423'));
  // banheiros (oeste): corredor + cabines
  boxes.push(...building(-21, -7, -12, 7, { col: { ...col, wall: '#4a5a6a', wall2: '#3f4f5f', inner: '#9aa9b9' }, floors: 1, H: 3.0, parapet: 0,
    ops: [{ s: 'e', a: -1, b: 1 }, { s: 'w', a: 3, b: 5 }, { s: 'n', a: -15, b: -13 }],
    inner: [{ axis: 'z', s0: -6.5, s1: 6.5, line: -16.5, ops: [{ a: -5, b: -3.4 }, { a: -0.8, b: 0.8 }, { a: 3.4, b: 5 }] }, { axis: 'x', s0: -20.5, s1: -16.5, line: -2, ops: [] }, { axis: 'x', s0: -20.5, s1: -16.5, line: 2, ops: [] }] }));
  // escritório (leste)
  boxes.push(...building(12, -7, 21, 7, { col, floors: 1, H: 3.0, parapet: 0,
    ops: [{ s: 'w', a: -1, b: 1 }, { s: 'e', a: -5, b: -3 }, { s: 's', a: 17, b: 19 }, { s: 'w', a: 3, b: 5.5, k: 'win' }],
    inner: [{ axis: 'x', s0: 12.5, s1: 20.5, line: 0, ops: [{ a: 17, b: 18.8 }] }] }));
  C(14.5, -4.5, 1.8, 0.9, '#6b4423'); C(18.5, 4, 1.6, 0.9, '#6b4423');
  // sinuca (sudeste) e camarotes (sudoeste)
  boxes.push(...building(12, 9, 21, 19.6, { col, floors: 1, H: 3.0, parapet: 0, ops: [{ s: 'w', a: 13, b: 15 }, { s: 'e', a: 11, b: 13 }, { s: 'n', a: 14, b: 16 }, { s: 'w', a: 16.5, b: 18.5, k: 'win' }] }));
  boxes.push(B(14.5, 13, 18.5, 15, 0.9, '#1e7a4a'));
  boxes.push(B(-20, 9, -14, 10, 1.3, '#7a2d5a'), B(-20, 14, -14, 15, 1.3, '#7a2d5a'), B(-12.5, 11, -11.7, 17, 1.3, '#7a2d5a'), C(-17, 12, 1.2, 0.9, wood), C(-17, 17.5, 1.2, 0.9, wood));
  // corredores laterais (linha longa do Sniper): barris encostados
  C(-22.8, -4, 1.2, 1.2); C(-22.8, 12, 1.2, 1.2); C(22.8, 4, 1.2, 1.2); C(22.8, -12, 1.2, 1.2);
  const props = [];
  for (const [x, z] of [[-3, -6], [-1.8, -6], [3, -6], [1.8, -6.2], [-22.6, 1], [22.6, 10], [-11, -8.5], [11, 11]]) props.push({ t: 'keg', x, z });
  props.push({ t: 'keg', x: 6, z: -16, y: H }, { t: 'keg', x: -10, z: -16, y: H });
  props.push({ t: 'cup', x: -9.5, z: 11, s: 4 }, { t: 'cup', x: 10, z: 8, s: 4 }, { t: 'cup', x: -3, z: -3.4, s: 0.6, y: 1.2, deco: true }, { t: 'cup', x: 2, z: -3.4, s: 0.6, y: 1.2, deco: true });
  props.push({ t: 'neon', x: 0, y: 5.6, z: -9.9, w: 8, h: 1.6, rot: Math.PI, text: 'CHEERS', c: neon });
  props.push({ t: 'neon', x: -11.9, y: 2.6, z: -4, w: 3, h: 1.4, rot: -Math.PI / 2, text: 'WC', c: pink });
  props.push({ t: 'neon', x: 11.9, y: 2.6, z: 4, w: 3.5, h: 1.4, rot: Math.PI / 2, text: 'BAR', c: neon });
  props.push({ t: 'neon', x: 0, y: 4.4, z: 19.9, w: 7, h: 1.6, rot: Math.PI, text: 'OINK!', c: pink });
  props.push({ t: 'strip', x0: -7, z0: -2.78, x1: 7, z1: -2.78, y: 1.0, c: neon }, { t: 'strip', x0: -8, z0: 12.98, x1: 8, z1: 12.98, y: 0.9, c: pink });
  MAPS.push({
    id: 'bar-cheers', name: 'Bar Cheers Noturno', desc: 'Estilo Office: salão com balcão e palco, cozinha e depósito, VIP no andar de cima com sacada, terraço, banheiros, escritório, sinuca e corredores laterais compridos.',
    size: [24, 20], wallH: 6, wallColor: [dark, '#231c30'], laneMin: 35,
    palette: { sky: '#0b0e22', fog: ['#161236', 30, 90], hemi: ['#9a9aff', '#3a1c50', 1.6], sun: ['#b8c4ff', 1.1], ground: '#3a2418', tiles: ['#4a2e1e', '#3c2618', 48, 24], clouds: false, stars: true,
      lights: [[neon, 0, 4.5, -2, 40, 22], [pink, -16, 3, 12, 30, 18], [neon, 16, 3, 0, 30, 18], ['#ffd27a', 0, 3, 16, 25, 14], ['#ffd27a', 0, 3, -15, 25, 14]] },
    ...fin(boxes), props,
    spawns: [[-22.5, -18], [22.5, 18], [-22.5, 18], [22.5, -18], [-16, -12], [16, -15], [-18.5, 0], [16, 3], [16, 17], [-14.5, 12], [0, 10], [-12, -15, H], [12, -14, H]],
    pickups: [['health', 0, -7], ['health', -18.5, -4.5], ['health', 16, -2], ['ammo', 2, -12, H], ['ammo', 15, -16, 2 * H], ['ammo', 16, 11], ['ammo', -22.6, 6],
      ['grenade', 8, 2], ['grenade', -8, 2], ['grenade', 0, 15, 1], ['grenade', -2, -16, 2 * H]],
    showcase: [0, 0, 6], view: [-2, 1, 13, -0.08, -0.08], openMax: 7,
    test: { stairs: { from: [-4.2, 0, -18.5], to: [2.2, H, -18.5], level: H }, under: { from: [-4.5, 0, -15], to: [4.5, 0, -15], ceil: 3.0 }, roof: { from: [9.3, H, -18.5], to: [15.7, 2 * H, -18.5], level: 2 * H } },
  });
}

// ---------- 8) Posto Nevasca (Summit: base no cume, eixo N–S, 3 rotas) ----------
// +Z norte (spawn do lab), −Z sul (spawn da estrada), −X penhasco, +X salas estreitas.
// 1 unidade = 1 m. Pé-direito e portas folgados pro Docão (2,0 m): vão de porta ≥ 2,6 m, altura 2,6 m.
{
  const SNOW = '#E8EDF2', SNOW2 = '#A9B6C4', ROCK = '#4A4E54', METAL = '#8A8D8F', METAL2 = '#6E7378';
  const CONC = '#9C9A94', RUST = '#8E2F2A', ICE = '#BFDDEB', FLOOR = '#8A8680', IN = '#B7B2A8';
  const H = 3.4;
  const col = { wall: METAL, wall2: METAL2, inner: IN, floor: FLOOR, roof: SNOW, roof2: SNOW2, stair: METAL, trim: ICE };
  const boxes = [];
  const mound = (x, z, s = 2, h = 0.75, y0 = 0) => {
    const base = Math.max(h, 0.95);
    boxes.push(B(x - s / 2, z - s / 2, x + s / 2, z + s / 2, base, SNOW, y0));
    boxes.push(B(x - s * 0.28, z - s * 0.28, x + s * 0.28, z + s * 0.28, 0.35, SNOW, y0 + base * 0.72));
  };
  const C = (x, z, s = 1.3, h = 1.15, c = METAL2, y0 = 0) => boxes.push(crate(x, z, s, h, c, y0));

  // encosta oeste: a borda curva até 5 m para fora, pico em z=-2 (y do dossiê = 62).
  const bulge = (z) => { const t = (z + 2) / 28; return (t <= -1 || t >= 1) ? 0 : 5 * (1 - t * t); };
  const voids = [];
  for (let z = -34; z < 28; z += 6) {
    const z1 = Math.min(28, z + 6);
    const edge = -24 - Math.max(bulge(z), bulge(z + 3), bulge(z1));
    boxes.push(B(edge - 0.5, z, edge, z1, 1.15, ROCK)); // borda de 1,15 m
    const gap = z1 > -8 && z < 4; // trecho em que dá para cair de verdade
    if (!gap) boxes.push({ b: [edge - 0.4, 0, z, edge + 0.08, 4, z1], hide: true }); // colisor invisível de 4 m
    const inner = edge + 3.5;
    if (!(z >= 12 && z < 20)) boxes.push(B(inner, z, inner + 0.28, z1, 2.15, METAL2)); // fecha a corda reta
    voids.push([-31, z, edge - 0.15, z1]);
  }
  voids.push([-31, 28, -24.2, 60], [-31, -60, -24.2, -34]);
  boxes.push(B(26.4, -58, 30.6, 58, 4.5, ROCK)); // fecha o leste que o size maior abriu
  boxes.push(B(-25.6, -2.15, -25.28, -1.85, 2.5, METAL2)); // mastro da placa PENHASCO
  // rochas de 5 × 4 × 3,5 m: y45 → z=15, y92 → z=-32 (cortam a visada)
  boxes.push(B(-27.2, 13, -16.2, 17, 4.2, ROCK), B(-26, -34, -16, -30, 4.2, ROCK));
  boxes.push(B(-26, -10, -17, -6, 4.2, ROCK), B(-22, 46, -16.2, 49.2, 3.2, ROCK), B(-24, -54, -16.2, -50, 3.2, ROCK));
  boxes.push(B(-12, 4, -5, 10, 2.8, ROCK), B(-22, 18, -15, 24, 2.8, ROCK), B(2, -38, 8, -33, 2.4, ROCK));
  for (const z of [22, 8, -4, -16]) boxes.push(B(-23.2, z, -21.6, z + 1.4, 1.0, SNOW2)); // cobertura de 1 m a cada ~12–14 m

  // lab norte (spawn), 1 andar, portas pro pátio
  boxes.push(...building(-14, 48, 10, 58, { col, floors: 1, H: 3.5, parapet: 0.6,
    ops: [{ s: 'n', a: -8, b: -5 }, { s: 'n', a: 2, b: 5.2 }, { s: 's', a: -2, b: 1.2 }, { s: 'e', a: 50, b: 53 },
      { s: 'n', a: -12, b: -9.5, k: 'win', lo: 1.05, hi: 2.15 }, { s: 'w', a: 50, b: 53.2, k: 'win', lo: 1.05, hi: 2.1 }],
    inner: [{ axis: 'x', s0: -13.4, s1: 9.4, line: 53.2, ops: [{ a: -2.2, b: 1.2 }] }] }));
  // pátio entre o lab (z≥48) e a Sala Fria (z≤28): os dois prédios do meio, corredor de 3,6 m.
  // O antigo "prédio do meio" 14×12 era x −12…2, z 33…45 — na vista de cima parecia parte do lab. Agora é o bloco oeste.
  boxes.push(...building(-16, 31, -2, 43, { col, floors: 2, H, parapet: 1.7,
    ops: [{ s: 'n', a: -10, b: -6.4 }, { s: 's', a: -12, b: -8.4 }, { s: 'e', a: 34, b: 37.6 }, { s: 'w', a: 36, b: 39.4 },
      { s: 'e', a: 38, b: 41.5, f: 1, k: 'win', lo: 0.85, hi: 2.05 }],
    stairs: [{ f: 0, r: [-13.5, 33.2, -6.8, 36.2], axis: 'x', dir: 1 }] }));
  boxes.push(...building(1.6, 30, 19.6, 44, { col: { ...col, wall: CONC, wall2: METAL }, floors: 2, H, parapet: 1.7,
    ops: [{ s: 'n', a: 6, b: 9.6, k: 'wide' }, { s: 's', a: 8, b: 11.6 }, { s: 'w', a: 34, b: 37.6 }, { s: 'e', a: 36, b: 39.4 },
      { s: 's', a: 14, b: 17.5, f: 1, k: 'win', lo: 0.85, hi: 2.05 }],
    stairs: [{ f: 0, r: [4, 32.2, 11.2, 35.4], axis: 'x', dir: 1 }, { f: 1, r: [4, 38, 11.2, 41.2], axis: 'x', dir: 1 }] }));
  C(8.5, 40, 1.6, 1.1, '#6E7378', H); C(14, 36, 1.2, 0.9, RUST);

  // SALA FRIA / control room: 22 × 22 m, mezanino a +3,4 m, átrio aberto, 5 portas
  boxes.push(...building(-2, 6, 20, 28, { col: { ...col, wall: CONC, wall2: METAL, inner: '#C4BFB4' }, floors: 2, H, roof: false,
    ops: [{ s: 'w', a: 14.2, b: 17.8 }, { s: 'e', a: 12.2, b: 15.8 }, { s: 'n', a: 6, b: 9.4 }, { s: 's', a: 4, b: 7.6 }, { s: 's', a: 13, b: 16.4 },
      { s: 's', a: 8.2, b: 12.2, k: 'win', lo: 1.0, hi: 2.15 },
      { s: 's', a: 8, b: 12.4, f: 1, k: 'win', lo: 0.75, hi: 2.15 }, { s: 'n', a: 8, b: 12.4, f: 1, k: 'win', lo: 0.75, hi: 2.15 },
      { s: 'w', a: 8.5, b: 12, f: 1, k: 'win', lo: 0.8, hi: 2.05 }, { s: 'e', a: 20, b: 24, f: 1, k: 'win', lo: 0.8, hi: 2.05 }],
    stairs: [{ f: 0, r: [1.6, 21.4, 10.2, 24.3], axis: 'x', dir: 1 }],
    floorHoles: { 1: [[-1.4, 6.6, 15.4, 20.4]] } }));
  boxes.push(...slab(-2, 6, 20, 28, 2 * H, 0.35, SNOW, [[5, 11, 13, 23]])); // vão da claraboia 8 × 12 m
  // guarda-corpo de 1 m em volta do átrio
  boxes.push(B(-1.5, 20.28, 15.2, 20.55, 1.0, METAL2, H), B(-1.5, 6.55, 15.2, 6.82, 1.0, METAL2, H));
  boxes.push(B(15.22, 6.8, 15.5, 20.4, 1.0, METAL2, H), B(-1.55, 6.8, -1.28, 20.4, 1.0, METAL2, H));
  // consoles (1,1 m) e arquivos de aço (2 m)
  boxes.push(B(2.2, 12.4, 7.4, 13.8, 1.1, '#4d5963'), B(2.2, 16.2, 7.4, 17.6, 1.1, '#4d5963'));
  for (const [x, z] of [[16.2, 8.2], [16.2, 22.4], [16.2, 24.6], [-0.4, 8.4], [3.2, 8.4], [3.2, 24.2]]) boxes.push(B(x, z, x + 0.7, z + 1.4, 2.0, '#9aa3aa'));
  C(11.2, 25.2, 1.3, 1.05, METAL, H);
  // chapa: frisos verticais na face norte da Sala Fria
  for (let x = -1; x < 19; x += 1.7) boxes.push(B(x, 27.85, x + 0.12, 28.15, 3.1, METAL2, 0.2));

  // salas estreitas a leste (CQB), parede oeste é a da sala fria
  boxes.push(...building(20, 8, 26, 32, { col, floors: 1, H: 3.3, parapet: 0.4, noWall: ['w0'],
    ops: [{ s: 'e', a: 12, b: 15 }, { s: 'e', a: 22, b: 25 }, { s: 's', a: 23.4, b: 25.6 }, { s: 'n', a: 20.6, b: 22.4 }],
    inner: [{ axis: 'x', s0: 20.4, s1: 25.6, line: 18, ops: [{ a: 23.2, b: 25.4 }] }, { axis: 'x', s0: 20.4, s1: 25.6, line: 25, ops: [{ a: 20.8, b: 22.6 }] }] }));
  boxes.push(B(21.4, 40, 23.2, 44, 2.6, ROCK), B(21.4, -8, 23.2, -4, 2.6, ROCK), B(21.4, -42, 23.2, -38, 2.6, ROCK));

  // galpão sul + rampa pro telhado (antena)
  boxes.push(...building(-12, -46, 12, -30, { col: { ...col, wall: CONC }, floors: 1, H: 3.6, parapet: 1.15,
    ops: [{ s: 's', a: -3.2, b: 0.4 }, { s: 's', a: 4, b: 7.2 }, { s: 'n', a: -8.2, b: -5.2 }, { s: 'e', a: -40, b: -37 }],
    roofGaps: [{ s: 'n', a: -2.6, b: 2.6 }] }));
  boxes.push(B(-2.7, -49.4, 2.7, -46, 0.28, SNOW, 3.32), R(-2.2, -55.2, 2.2, -49.2, 0, 3.6, 'z', 1, METAL));
  boxes.push(B(3.55, -38.45, 3.95, -38.05, 6.2, RUST, 3.6), B(3.2, -39.3, 4.3, -38.9, 0.35, RUST, 9.5));
  // pátio sul a −1,5 m + escada metálica
  boxes.push(B(-14, -26, 18, -6, 0.3, SNOW2, -1.8));
  boxes.push(R(-1.6, -28.4, 1.6, -22.2, -1.5, 0, 'z', -1, METAL));
  boxes.push(B(-1.9, -28.4, -1.62, -22.2, 1.0, METAL2, -1.2), B(1.62, -28.4, 1.9, -22.2, 1.0, METAL2, -1.2));

  // torre treliçada (+8,1 m), a oeste do bloco do meio, fora do corredor
  boxes.push(R(-22.4, 22, -19.6, 30, 0, 4.05, 'z', 1, METAL), B(-22.8, 29.4, -19.2, 32.2, 0.24, METAL, 3.81));
  boxes.push(R(-22.4, 31.6, -19.6, 40, 4.05, 8.15, 'z', 1, METAL));
  boxes.push(B(-23.2, 39.2, -18.4, 44.6, 0.28, METAL, 7.87));
  for (const [x, z] of [[-22.9, 39.4], [-18.7, 39.4], [-22.9, 44.2], [-18.7, 44.2]]) {
    boxes.push(B(x, z, x + 0.28, z + 0.28, 8.15, METAL2));
    boxes.push(B(x + 0.05, z, x + 0.22, z + 4.6, 0.16, METAL2, 2.4), B(x, z + 0.05, x + 4.2, z + 0.2, 0.16, METAL2, 4.6));
  }
  boxes.push(B(-23.2, 39.2, -18.4, 39.45, 1.75, METAL2, 8.15), B(-23.2, 44.35, -21.2, 44.6, 1.75, METAL2, 8.15), B(-20.2, 44.35, -18.4, 44.6, 1.75, METAL2, 8.15));
  boxes.push(B(-23.2, 39.2, -22.95, 44.6, 1.75, METAL2, 8.15), B(-18.65, 39.2, -18.4, 44.6, 1.75, METAL2, 8.15));

  // teleférico no rasgo do penhasco (piso a +2,37 m)
  const gy = 2.37;
  boxes.push(B(-25.95, 42.25, -22.65, 46.75, 0.2, RUST, 2.17));
  boxes.push(...wallZ(42.45, 46.55, -25.75, 0.18, 2.6, RUST, [], gy));
  boxes.push(...wallZ(42.45, 46.55, -22.8, 0.18, 2.6, RUST, [door(43.15, 45.85, 2.45)], gy));
  boxes.push(...wallX(-25.7, -22.95, 42.4, 0.18, 2.6, RUST, [], gy));
  boxes.push(...wallX(-25.7, -22.95, 46.6, 0.18, 2.6, RUST, [], gy));
  boxes.push(B(-25.95, 42.25, -22.65, 46.75, 0.32, SNOW, gy + 2.55));
  boxes.push(R(-22.65, 43.15, -17.6, 45.85, 0, gy, 'x', -1, METAL));
  boxes.push({ wp: [-21.3, gy, 44.5] }, { wp: [-24.2, gy, 44.5] }, { wp: [-20.6, 8.15, 42] }, { wp: [-21, 4.05, 31] });
  // dois cabos: cabine → torre → fora do mapa, para a neblina
  boxes.push(B(-24.4, 43.6, -19.2, 43.78, 0.08, '#3a4248', 8.4), B(-24.4, 45.3, -19.2, 45.48, 0.08, '#3a4248', 7.6));
  boxes.push(B(-30.5, 43.6, -24.2, 43.78, 0.08, '#3a4248', 11.5), B(-30.5, 45.3, -24.2, 45.48, 0.08, '#3a4248', 12.2));

  // montes de neve (0,55–1,0 m) e caixotes de cobertura — pátio norte, vão central, pátio sul
  for (const [x, z, s, h] of [[-16, 46.2, 2.1, 0.7], [-14, 30.2, 1.8, 0.7], [5.2, 30.6, 1.7, 0.8], [14.2, 31.2, 2, 0.85],
    [-16, -4, 2, 0.95], [-13.2, 1.4, 1.5, 0.85], [2.6, -6.6, 1.5, 0.9], [-6, -8, 1.6, 0.7], [10, -6, 1.6, 0.9], [18, -4, 1.6, 0.75],
    [-6, 2.2, 2, 0.8], [14, 3.2, 1.8, 0.7], [22.5, 4.2, 1.5, 0.65],
    [-19.4, 8.2, 1.5, 0.7], [0, 3.4, 1.6, 0.7], [-4, -3, 1.6, 1.15]]) mound(x, z, s, h);
  C(-12.4, 16.2, 1.4, 1.2, METAL); C(-8, -20, 1.5, 1.3, '#6E5438', -1.5); C(14, -20, 1.3, 1.15, METAL2, -1.5); C(-16, -21, 1.6, 1.3, METAL); C(-18.6, 10, 1.2, 1.05, METAL);
  for (const [x, z, s, h] of [[-6, -14, 1.6, 0.8], [6, -18, 1.6, 0.7], [14, -16, 1.5, 1.2], [16, -22, 1.4, 1.15]]) boxes.push(B(x - s / 2, z - s / 2, x + s / 2, z + s / 2, h, SNOW, -1.5));

  // estalactites de gelo nos beirais (acima da cabeça: y ≥ 2,6)
  for (const [x, z, y] of [[-2, 18, 2.7], [20, 18, 2.7], [-12, 39, 6.4], [16, 38, 6.4], [-10, -30, 3.2], [8, -30, 3.2], [-14, 54, 3.1], [4, 54, 3.1], [-8, 43, 6.4], [12, 44, 6.4]]) boxes.push(B(x - 0.08, z - 0.08, x + 0.08, z + 0.08, 0.65, ICE, y));
  boxes.push(B(-1.15, -23, -0.65, -12, 0.04, '#6e767e', -1.46), B(2.15, -23, 2.65, -13, 0.04, '#6e767e', -1.46));

  const props = [
    { t: 'dome', x: 15.6, z: 52.2, r: 2.15, h: 1.25, c: CONC, cap: SNOW },
    { t: 'dome', x: 6.5, z: 1.6, r: 1.7, h: 1.05, c: METAL, cap: SNOW },
    { t: 'tank', x: -8.2, z: -16.5, y: -1.5, r: 0.75, h: 2.2, c: METAL, cap: SNOW, band: RUST },
    { t: 'tank', x: 16.5, z: -10, y: -1.5, r: 0.85, h: 1.8, c: RUST, cap: SNOW2 },
    { t: 'truck', x: 1.5, z: -18.5, y: -1.5, c: '#4A4E54' },
    { t: 'pine', x: -21.2, z: -56, s: 1.15 }, { t: 'pine', x: 21.2, z: 55.2, s: 1.25 }, { t: 'pine', x: 23.2, z: 2.2, s: 1.05 },
    { t: 'pine', x: 22.4, z: -27, s: 1.1 }, { t: 'pine', x: -16.2, z: 26.5, s: 0.95 }, { t: 'pine', x: 18.5, z: -52, s: 1.2 },
    { t: 'sign', x: 6, y: 4.5, z: 28.35, w: 6.2, h: 1.35, rot: 0, text: 'SALA FRIA', bg: RUST, fg: '#F2D9A0' },
    { t: 'sign', x: -25.4, y: 2.6, z: -2, w: 2.4, h: 1.15, rot: Math.PI / 2, text: 'PENHASCO', bg: RUST, fg: '#fff' },
    { t: 'sign', x: 0, y: 3.2, z: -29.6, w: 5.5, h: 1.2, rot: Math.PI, text: 'GALPÃO', bg: '#3E4248', fg: SNOW },
    { t: 'sign', x: 9, y: 5.3, z: 27.2, w: 5.4, h: 1.05, rot: Math.PI, text: '12:00  09:40  18:10', bg: '#1c242c', fg: '#F2D9A0' },
    { t: 'pane', x0: 5.2, z0: 11.2, x1: 8.8, z1: 16.6, y: 6.78, axis: 'y', c: 0xBFDDEB, o: 0.38 },
    { t: 'pane', x0: 9.2, z0: 11.2, x1: 12.8, z1: 16.6, y: 6.78, axis: 'y', c: 0xBFDDEB, o: 0.38 },
    { t: 'pane', x0: 5.2, z0: 17.2, x1: 8.8, z1: 22.6, y: 6.78, axis: 'y', c: 0xBFDDEB, o: 0.38 },
    { t: 'pane', x0: 9.2, z0: 17.2, x1: 12.8, z1: 22.6, y: 6.78, axis: 'y', c: 0xBFDDEB, o: 0.38 },
    { t: 'pane', x0: -25.5, z0: 43.3, x1: -25.5, z1: 46.2, y: 3.7, h: 1.3, axis: 'z', c: 0xBFDDEB, o: 0.4 },
    { t: 'grate', x0: -26.5, z0: -8, x1: -22.5, z1: 8, y: 0.04 },
    { t: 'dish', x: -6, y: 4.3, z: -38, r: 1.15 }, { t: 'dish', x: 8, y: 4.4, z: -34, r: 0.9 },
    { t: 'heli', x: 48, y: 16, z: -8, rot: 0.6 },
    { t: 'pine', x: -28, z: -6, y: -16, s: 1.4 }, { t: 'pine', x: -27, z: 8, y: -18, s: 1.1 }, { t: 'pine', x: -29, z: -18, y: -14, s: 1.6 },
    { t: 'keg', x: -0.2, z: 28.4 }, { t: 'keg', x: 8, z: 46.8 }, { t: 'keg', x: 21, z: 28 },
    { t: 'keg', x: -8.1, z: -14, y: -1.5 }, { t: 'keg', x: 6, z: -16, y: -1.5 }, { t: 'keg', x: -19.3, z: 11 },
  ];
  const roofs = [[-14, 48, 10, 58, 3.5], [-16, 31, -2, 43, 6.8], [1.6, 30, 19.6, 44, 6.8],
    [-2, 6, 20, 28, 6.8],
    [20, 8, 26, 32, 3.3], [-12, -46, 12, -30, 3.6], [-25.9, 42.2, -22.6, 46.8, 5.25], [-23.2, 39.2, -18.4, 44.6, 8.15]];
  MAPS.push({
    id: 'posto-nevasca', name: 'Posto Nevasca',
    desc: 'Base no cume: sala fria com mezanino e claraboia, passarela curva no penhasco e salas estreitas a leste.',
    size: [31, 60], wallH: 1.2, wallColor: [ROCK, ROCK], openMax: 8, laneMin: 40,
    fall: { y: -6, rects: voids, basins: [[-14, -26, 18, -6, -1.5]], haze: true, pit: '#d5dee6', floor: -30 },
    palette: { sky: '#C9D3DC', fog: ['#C9D3DC', 40, 120], hemi: ['#e7eef3', '#8B98A6', 1.55], sun: ['#f4f7fa', 0.72], ground: SNOW, tiles: null, clouds: true, mountains: true,
      lights: [['#F2D9A0', 4, 2.6, 14, 14, 11], ['#F2D9A0', 10, 2.6, 18, 14, 11], ['#F2D9A0', 6, 5.5, 22, 12, 9], ['#F2D9A0', 12, 5.5, 16, 12, 9], ['#F2D9A0', -8, 2.5, 36, 12, 10], ['#F2D9A0', 10, 2.5, 36, 12, 10]] },
    weather: { kind: 'snow', n: 1400, fall: 6.2, wind: [2.3, 0, 0.55], top: 34, color: 0xF7FBFF, size: 0.15, roofs },
    ...fin(boxes), props,
    spawns: [[-6, 50], [2, 52], [22, 52], [-12, 46], [8, 29.2], [16, 46], [-8, -52], [0, -56], [8, -50], [-4, -58], [6, -44], [-14, -50]],
    pickups: [['health', 8, 14], ['health', -10, 46], ['health', 10, -20, -1.5], ['health', 6, 50.5], ['health', -10, 38, H],
      ['ammo', -26.4, -1], ['ammo', 23.6, 20], ['ammo', -5, 40, H], ['ammo', 0, -38, 3.6],
      ['grenade', 8, 36], ['grenade', 8, -14, -1.5], ['grenade', 13.2, 23.4, H]],
    showcase: [4, 0, 30.5], view: [-16, 1.6, 2, -0.35, -0.04],
    test: { stairs: { from: [0.6, 0, 22.85], to: [11.4, H, 22.85], level: H }, roof: { from: [0, 0, -56.2], to: [0, 3.6, -38], level: 3.6 }, under: { from: [17.3, 0, 9.5], to: [17.3, 0, 16.5], ceil: 3.1 } },
  });
}

// ---------- 9) Morro do Leitão (Favela MW2: vielas, lajes, campinho, manhã) ----------
// +Z norte (platô / vala), −Z sul (rua principal). 1 m = 1 unidade. Vielas ≥ 3,2 m (o Docão tem 0,84 m de largura).
{
  const BR = '#a0503a', BR2 = '#c46a4e', PL = '#e6d7b8', YEL = '#e6c15a', TEAL = '#8fc4b8', PINK = '#e09aab', BLU = '#6a8cbf';
  const GRN = '#6a8f4a', DIRT = '#7c7260', GRASS = '#7a8a45', WOOD = '#8b5a2b', ROOF = '#6b5344';
  const casa = (wall, wall2, roof = ROOF) => ({ wall, wall2: wall2 || wall, inner: '#f0e2c8', floor: '#d9cbb0', roof, roof2: TEAL, stair: WOOD, trim: TEAL });
  const boxes = [];
  const C = (x, z, s = 1.3, h = 1.15, c = WOOD, y0 = 0) => boxes.push(crate(x, z, s, h, c, y0));
  // platô norte (+4 m): a vala de cima. Rampas sobem do meio da cidade.
  boxes.push(B(-40, 26, 24, 46, 4, DIRT));
  boxes.push(R(-12, 17.5, -6, 26.2, 0, 4, 'z', 1, WOOD), R(8, 17.5, 14, 26.2, 0, 4, 'z', 1, WOOD), R(-36, 16, -30, 26.2, 0, 4, 'z', 1, WOOD));
  // cada lance num z diferente: rampas empilhadas no mesmo xz viram teto umas das outras
  const well = (x0, z0, floors) => { const stairs = []; for (let f = 0; f < floors; f++) { const zA = z0 + 1.8 + f * 4.6; stairs.push({ f, r: [x0 + 1.8, zA, x0 + 8.2, zA + 3.2], axis: 'x', dir: 1 }); } return stairs; };
  const doorS = (x0, x1) => [{ s: 'n', a: (x0 + x1) / 2 - 1.5, b: (x0 + x1) / 2 + 1.5 }];
  // norte, em cima do platô
  boxes.push(...building(-18, 30, 2, 44, { col: casa(YEL, '#f0d48a', '#c4b49a'), floors: 2, H: 3, y0: 4, parapet: 1.05, stairs: well(-18, 30, 2), ops: [...doorS(-18, 2), { s: 'e', a: 34, b: 37.2 }, { s: 's', a: -8, b: -4, f: 1, k: 'win', lo: 0.8, hi: 2.1 }] }));
  boxes.push(...building(6, 32, 22, 44, { col: casa(PINK, '#f0c0cc', '#b7b3a8'), floors: 1, H: 3.1, y0: 4, parapet: 0.7, ops: [{ s: 'n', a: 10, b: 13.4 }, { s: 's', a: 12, b: 15.4 }, { s: 'w', a: 36, b: 39 }] }));
  // meio
  boxes.push(...building(-34, 2, -16, 20, { col: casa(YEL, '#f2d98a'), floors: 2, H: 3, parapet: 1.05, stairs: well(-34, 2, 2), ops: [...doorS(-34, -16), { s: 'e', a: 8, b: 11.4 }, { s: 'w', a: 10, b: 13.4, k: 'win' }] }));
  boxes.push(...building(-36, -22, -18, -2, { col: casa(BR, BR2), floors: 2, H: 3, parapet: 1.05, stairs: well(-36, -22, 2), ops: [...doorS(-36, -18), { s: 'e', a: -12, b: -8.4 }, { s: 's', a: -28, b: -24 }] }));
  boxes.push(...building(-10, -24, 8, -8, { col: casa(TEAL, '#b7e0d6', '#e6d7b8'), floors: 2, H: 3, parapet: 1.05, stairs: well(-10, -24, 2), ops: [...doorS(-10, 8), { s: 's', a: -4, b: 0 }, { s: 'e', a: -16, b: -12.4, f: 1, k: 'win', lo: 0.8, hi: 2.05 }] }));
  boxes.push(...building(10, -8, 26, 12, { col: casa(BLU, '#8aa6d4', BR), floors: 3, H: 3, parapet: 1.05, stairs: well(10, -8, 3), ops: [...doorS(10, 26), { s: 's', a: 16, b: 20 }, { s: 'e', a: -2, b: 2 }, { s: 'w', a: 2, b: 6, f: 2, k: 'win', lo: 0.7, hi: 2.1 }] }));
  // leste: campinho, lavanderia, barbeiro, casa verde
  boxes.push(B(28, 14, 52, 34, 0.08, GRASS));
  boxes.push(B(28.2, 18, 28.5, 28, 2.3, '#f4f1ea'), B(28.2, 18, 36, 18.25, 0.12, '#f4f1ea', 2.15), B(50, 20, 50.3, 30, 2.3, '#f4f1ea'), B(44, 29.75, 50.2, 30, 0.12, '#f4f1ea', 2.15));
  boxes.push(...building(40, -6, 58, 10, { col: casa('#d7d3cc', TEAL, '#8d8a84'), floors: 3, H: 3, parapet: 1.05, stairs: well(40, -6, 3), ops: [...doorS(40, 58), { s: 'w', a: -1, b: 2.6 }, { s: 'e', a: 2, b: 5.4 }, { s: 's', a: 46, b: 50, f: 2, k: 'win', lo: 0.7, hi: 2.05 }] }));
  boxes.push(...building(16, -24, 36, -8, { col: casa(GRN, '#8fb56a', BR), floors: 3, H: 3, parapet: 1.05, stairs: well(16, -24, 3), ops: [...doorS(16, 36), { s: 'e', a: -18, b: -14.4 }, { s: 's', a: 22, b: 26 }] }));
  boxes.push(...building(38, -24, 54, -12, { col: casa(PL, '#f7f1e4', BR2), floors: 2, H: 3, parapet: 1.05, stairs: well(38, -24, 2), ops: [...doorS(38, 54), { s: 'w', a: -20, b: -16.6 }] }));
  // rua principal e casa de tijolo ao sul
  boxes.push(B(-52, -36, 54, -26, 0.06, '#3a3a38'));
  for (const x of [-40, -20, 0, 20, 44]) { C(x, -34.8, 1.3, 1.15, WOOD); C(x, -27.4, 1.3, 1.15, BR); }
  boxes.push(...building(-22, -50, 6, -39, { col: casa(BR, BR2, '#5c4033'), floors: 2, H: 3, parapet: 1.05, stairs: well(-22, -50, 2), ops: [{ s: 's', a: -8, b: -4.4 }, { s: 's', a: -2, b: 2 }, { s: 'n', a: -16, b: -12 }] }));
  // cemitério e sucata: muretas, não prédio fechado
  boxes.push(B(46, -42, 58, -41.4, 1.3, '#cfc8b8'), B(46, -42, 46.5, -30, 1.3, '#cfc8b8'), B(57.5, -42, 58, -30, 1.2, '#cfc8b8'));
  for (const [x, z] of [[49, -38], [52, -36], [55, -39], [50, -33], [54, -32]]) boxes.push(B(x, z, x + 0.8, z + 1.6, 0.9, '#d9d3c4'));
  for (const [x, z, s, h, c] of [[-54, 10, 1.6, 1.2, BR], [-52, 16, 1.4, 1.4, YEL], [-56, 20, 1.8, 1.0, WOOD], [-50, 24, 1.3, 1.1, TEAL], [-46, -44, 2, 0.8, DIRT], [-54, -40, 1.6, 0.7, GRASS], [-24, 34, 1.4, 1.0, WOOD], [30, 22, 1.6, 1.1, WOOD], [40, 24, 1.4, 1.2, BR2], [18, 4, 1.5, 1.0, WOOD], [-4, 8, 1.4, 1.1, YEL]]) C(x, z, s, h, c);
  for (const [x, z] of [[-36, 32], [-30, 40], [-36, 42], [-26, 30], [-38, 36]]) C(x, z, 1.5, 1.2, WOOD, 4);
  for (const z of [-32, -20, -8, 4, 16, 28, 38]) { C(-55, z, 1.5, 1.15, BR); if (z < 26) C(-46, z, 1.4, 1.15, WOOD); }
  C(36, 40, 1.5, 1.2, WOOD); C(46, 38, 1.4, 1.15, BR2); C(-54, -40, 1.6, 1.1, DIRT); C(-48, 36, 1.4, 1.15, WOOD);
  C(14, -44, 1.5, 1.15, BR); C(24, -48, 1.4, 1.1, WOOD); C(8, -46, 1.4, 1.15, DIRT); C(32, -44, 1.5, 1.2, BR2);
  C(54, 42, 1.6, 1.2, BR); C(48, 46, 1.4, 1.15, WOOD); C(54, -46, 1.5, 1.2, DIRT); C(-54, 44, 1.5, 1.15, BR);
  for (const x of [-42, -32, 16, 28, 42]) C(x, -46, 1.5, 1.2, DIRT);
  // traves do campinho já estão; banco e caixa d'água baixa de cobertura
  C(36, 20, 1.2, 1.0, WOOD); C(44, 18, 1.3, 1.15, BR);
  const props = [
    { t: 'truck', x: -28, z: -34.2, c: '#c46a4e' }, { t: 'truck', x: 8, z: -28.2, c: '#6a8cbf' }, { t: 'bus', x: 34, z: -34.4, c: '#e6c15a' },
    { t: 'tree', x: -52, z: 8 }, { t: 'tree', x: -48, z: -46 }, { t: 'tree', x: 20, z: 18 }, { t: 'tree', x: 56, z: 16 }, { t: 'tree', x: -30, z: 24 }, { t: 'tree', x: 48, z: -44 },
    { t: 'tank', x: 50, z: 4, y: 9, r: 0.9, h: 1.6, c: '#8d8a84', cap: TEAL, band: BR },
    { t: 'sign', x: 0, y: 3.2, z: -26.7, w: 6, h: 1.2, rot: 0, text: 'RUA', bg: BR, fg: '#fff' },
    { t: 'sign', x: 40, y: 2.4, z: 13.6, w: 4.2, h: 1.1, rot: Math.PI, text: 'CAMPO', bg: GRN, fg: '#fff' },
    { t: 'sign', x: 26.3, y: 3.4, z: 2, w: 3.2, h: 1.1, rot: Math.PI / 2, text: 'BAR', bg: BLU, fg: '#fff' },
    { t: 'keg', x: -48, z: 14 }, { t: 'keg', x: 22, z: -18 }, { t: 'keg', x: -6, z: -16 }, { t: 'keg', x: 34, z: 16 },
  ];
  MAPS.push({
    id: 'morro-leitao', name: 'Morro do Leitão',
    desc: 'Vielas e lajes de manhã: campinho, rua com carros, casas de 2 e 3 andares e um platô no norte.',
    size: [66, 56], wallH: 4, wallColor: ['#3d4a32', '#2c3824'], openMax: 8, laneMin: 40, navSpacing: 2.5,
    fall: { y: -8, margin: 5, pit: '#142016' },
    palette: { sky: '#9ec4ea', fog: ['#c5d4e4', 80, 210], hemi: ['#fff6e4', '#6a7a48', 1.55], sun: ['#fff1d0', 2.35], ground: '#6d6454', tiles: null, clouds: true,
      lights: [] },
    ...fin(boxes), props,
    spawns: [[-38, -31], [-16, -31], [4, -31], [22, -31], [48, -31], [-52, -44], [-36, 40, 4], [-24, 34, 4], [-8, 28, 4], [16, 30, 4], [20, 40, 4], [-32, 30, 4]],
    pickups: [['health', 0, -31], ['health', 40, 22], ['health', -24, 38, 4], ['health', 20, 6, 3],
      ['ammo', -22, 14, 3], ['ammo', 52, 6, 6], ['ammo', -8, -31], ['ammo', -4, 42, 7],
      ['grenade', 24, -16], ['grenade', -40, 12], ['grenade', 8, 8, 3], ['grenade', -2, -46, 3]],
    showcase: [0, 0, -33], view: [-8, 1.6, -20, 0.4, -0.05],
    test: {
      stairs: { from: [-31.6, 0, 5.4], to: [-22.4, 3, 5.4], level: 3 },
      roof: { from: [-31.6, 3, 10], to: [-22.4, 6, 10], level: 6 },
      under: { from: [-24, 0, 16], to: [-18, 0, 16], ceil: 2.7 },
    },
  });
}

export const getMap = (id) => MAPS.find((m) => m.id === id) || MAPS[0];
