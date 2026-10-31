// Morro do Leitão, rodada 3. Planta Favela.png na escala 0,18 m/px.
// Origem do pesquisador no noroeste: x → leste, y → sul. Motor: x = rx − 65, z = 45 − ry (+z = norte).
const B = (x0, z0, x1, z1, h, c, y0 = 0) => ({ b: [Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y0 + h, Math.max(z0, z1)], c });
const R = (x0, z0, x1, z1, y0, y1, axis, dir, c) => ({ b: [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)], c, ramp: { axis, dir } });
const door = (a, b, h = 2.4) => ({ a, b, y0: 0, y1: h });
const win = (a, b, lo = 1.05, hi = 2.05) => ({ a, b, y0: lo, y1: hi });
function wallAlong(axis, s0, s1, line, t, h, c, openings = [], y0 = 0) {
  const out = []; let cur = Math.min(s0, s1); const end = Math.max(s0, s1);
  const box = (a, b, ya, yb) => {
    if (b - a < 0.05 || yb - ya < 0.05) return;
    out.push(axis === 'x'
      ? { b: [a, y0 + ya, line - t / 2, b, y0 + yb, line + t / 2], c }
      : { b: [line - t / 2, y0 + ya, a, line + t / 2, y0 + yb, b], c });
  };
  for (const o of [...openings].sort((p, q) => p.a - q.a)) {
    box(cur, o.a, 0, h);
    if (o.y0 > 0) box(o.a, o.b, 0, o.y0);
    if (o.y1 < h) box(o.a, o.b, o.y1, h);
    cur = Math.max(cur, o.b);
  }
  box(cur, end, 0, h);
  return out;
}
const wallX = (x0, x1, z, t, h, c, op, y0) => wallAlong('x', x0, x1, z, t, h, c, op, y0);
const wallZ = (z0, z1, x, t, h, c, op, y0) => wallAlong('z', z0, z1, x, t, h, c, op, y0);

const X = (rx) => rx - 65;
const Z = (ry) => 45 - ry;
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const BRICK = '#a0503a', BRICK2 = '#8a4030', ROOF = '#7e7e7c', DIRT = '#675b44', GRASS = '#7a8a45', WOOD = '#8b5a2b';
const PASTEL = ['#c4b49a', '#9bb8ad', '#d5c4c4', '#d9d3c4', '#b7c4a8'];

function groundY(ry) {
  if (ry >= 68) return 0;
  if (ry >= 54) return 1.52;
  if (ry >= 40) return 2.66;
  if (ry >= 24) return 4.18;
  return 5.89;
}
function mainCenter(rx) { return 73 + 3.1 * Math.sin(rx * 0.075); }
function inMain(rx, ry) {
  if (rx < 0 || rx > 118) return false;
  return Math.abs(ry - mainCenter(rx)) < 4.8;
}
function inSide(rx, ry) { return rx >= 18 && rx <= 25.6 && ry >= 22 && ry <= 71; }
const ALLEYS = [
  [46, 26, 46, 42, 2.5], [46, 40, 60, 40, 2.5], [58, 28, 58, 42, 2.5],
  [70, 20, 70, 38, 2.6], [70, 30, 86, 30, 2.5], [84, 18, 84, 36, 2.5],
  [30, 8, 30, 24, 2.5], [30, 22, 44, 22, 2.4],
  [98, 34, 98, 52, 2.6], [98, 50, 116, 50, 2.5],
  [52, 56, 52, 68, 2.5], [52, 58, 70, 58, 2.5],
  [34, 42, 34, 58, 2.6], [34, 44, 50, 44, 2.5],
  [86, 60, 86, 72, 2.4], [104, 36, 104, 50, 2.5],
];
function inAlley(rx, ry) {
  for (const [x0, y0, x1, y1, w] of ALLEYS) {
    const vx = x1 - x0, vy = y1 - y0, L2 = vx * vx + vy * vy || 1;
    let t = ((rx - x0) * vx + (ry - y0) * vy) / L2;
    t = Math.max(0, Math.min(1, t));
    if (Math.hypot(rx - (x0 + vx * t), ry - (y0 + vy * t)) < w / 2) return true;
  }
  return false;
}
function inOpen(rx, ry) {
  if (rx >= 34 && rx <= 56 && ry >= 6 && ry <= 24) return true; // playground
  if (rx >= 0 && rx <= 16 && ry >= 24 && ry <= 44) return true; // junkyard
  if (rx >= 0 && rx <= 14 && ry >= 46 && ry <= 66) return true; // grassy knoll
  if (rx >= 108 && rx <= 129 && ry >= 56 && ry <= 70) return true; // cemetery
  if (rx >= 82 && rx <= 108 && ry >= 44 && ry <= 62) return true; // campinho
  return false;
}
function blocked(rx, ry) {
  return rx < 0.4 || ry < 0.4 || rx > 129 || ry > 88.5 || inMain(rx, ry) || inSide(rx, ry) || inAlley(rx, ry) || inOpen(rx, ry);
}

function matOf(rx, ry, i, force) {
  if (force) return force;
  const r = rnd();
  if ((rx > 74 && rx < 100 && ry < 20) || r > 0.9) return { wall: WOOD, wall2: '#6b4423', roof: '#6e6256', stair: '#6b4423', kind: 'wood' };
  if (r > 0.55) { const p = PASTEL[i % PASTEL.length]; return { wall: p, wall2: '#b7aea0', roof: ROOF, stair: WOOD, kind: 'pastel' }; }
  return { wall: BRICK, wall2: BRICK2, roof: ROOF, stair: '#c4b49a', kind: 'brick' };
}

export function morroLeitao() {
  seed = 11;
  const boxes = [];
  const props = [];
  const wps = [];
  const roofs = [];

  // patamares. A face norte de cada faixa é o muro de arrimo.
  const bands = [[-23, -9, 1.52], [-9, 5, 2.66], [5, 21, 4.18], [21, 45, 5.89]];
  for (const [z0, z1, h] of bands) boxes.push(B(-65, z0, 65, z1, h, DIRT));
  boxes.push(B(-66, -46, 66, -22, 0.08, '#5c5348')); // sul, cota 0, terra

  function steps(rx, ryLine, width, yLo, yHi) {
    const n = Math.max(1, Math.round((yHi - yLo) / 0.19));
    const len = n * 0.28, zTop = Z(ryLine), zBot = zTop - len;
    const x0 = X(rx) - width / 2, x1 = X(rx) + width / 2;
    for (let i = 0; i < n; i++) {
      const a = zBot + i * 0.28;
      boxes.push(B(x0, a, x1, a + 0.27, 0.16, '#d9d3c4', yLo + i * 0.19));
    }
    boxes.push({ b: [x0 + 0.12, yLo, zBot, x1 - 0.12, yLo + n * 0.19, zTop], ramp: { axis: 'z', dir: 1 }, hide: true, c: '#888' });
    boxes.push(B(x0 - 0.14, zBot, x0, zTop, (yHi - yLo) + 0.85, BRICK2, yLo));
    boxes.push(B(x1, zBot, x1 + 0.14, zTop, (yHi - yLo) + 0.85, BRICK2, yLo));
    wps.push([X(rx), yLo + 0.2, zBot + 0.4], [X(rx), yHi + 0.2, zTop + 0.4]);
  }
  // oito escadarias públicas, mais as das casas
  steps(21.8, 68, 2.6, 0, 1.52);
  steps(21.8, 54, 2.6, 1.52, 2.66);
  steps(21.8, 40, 2.6, 2.66, 4.18);
  steps(21.8, 24, 2.4, 4.18, 5.89);
  steps(10, 40, 2.4, 2.66, 4.18); // junkyard
  steps(72, 68, 2.7, 0, 1.52); // sobe da Main no centro
  steps(67, 24, 2.3, 4.18, 5.89); // fruit stand / roof garden
  steps(40, 54, 2.4, 1.52, 2.66); // crackhouse
  steps(90, 54, 2.2, 1.52, 2.66); // sobe pro campinho
  steps(112, 54, 2.3, 1.52, 2.66); // laundromat / barber

  function house(rx, ry, w, d, floors, force) {
    const x0 = X(rx), x1 = X(rx + w), z1 = Z(ry), z0 = Z(ry + d);
    const y0 = groundY(ry + d * 0.5);
    const col = matOf(rx, ry, Math.floor(rx + ry), force);
    const t = 0.38, H = 3;
    const southDoor = door(x0 + 1.15, x0 + 2.75);
    for (let f = 0; f < floors; f++) {
      const y = y0 + f * H;
      const doorOp = f === 0 ? [southDoor] : [];
      const winS = f === 0 ? [] : [win(x1 - 1.8, x1 - 0.7)];
      boxes.push(...wallX(x0, x1, z0 + t / 2, t, H, col.wall, doorOp, y));
      boxes.push(...wallX(x0, x1, z1 - t / 2, t, H, col.wall2, [win(x0 + 0.7, x0 + 1.7, 1.0, 2.0)], y));
      boxes.push(...wallZ(z0 + t, z1 - t, x0 + t / 2, t, H, col.wall2, f === 0 ? [] : [win(z0 + 1.2, z0 + 2.2)], y));
      boxes.push(...wallZ(z0 + t, z1 - t, x1 - t / 2, t, H, col.wall, [win(z1 - 2.2, z1 - 1.2)], y));
      if (f > 0) boxes.push(B(x0 + t, z0 + t, x1 - t, z1 - t, 0.22, '#cfc6b4', y - 0.22));
      if (winS.length) { /* janela sul já entra no andar de cima pelo doorOp vazio */ }
    }
    const sw = x0 + t + 0.15, se = sw + 1.2, sz0 = z0 + t + 0.15, sz1 = Math.min(z1 - t - 0.3, sz0 + Math.max(2.2, d - 1.3));
    const two = (x1 - x0) >= 4.5;
    const ew = x1 - t - 1.35, ee = ew + 1.2, ez1 = z1 - t - 0.2, ez0 = Math.max(z0 + t + 0.4, ez1 - 2.6);
    for (let f = 0; f < floors; f++) {
      boxes.push(R(sw, sz0, se, sz1, y0 + f * H, y0 + (f + 1) * H, 'z', 1, col.stair));
      if (two) boxes.push(R(ew, ez0, ee, ez1, y0 + f * H, y0 + (f + 1) * H, 'z', -1, col.stair));
    }
    const roofY = y0 + floors * H;
    boxes.push(B(x0, z0, sw, z1, 0.22, col.roof, roofY - 0.22));
    if (ew - se > 0.2) boxes.push(B(se, z0, ew, z1, 0.22, col.roof, roofY - 0.22));
    if (two) {
      boxes.push(B(ee, z0, x1, z1, 0.22, col.roof, roofY - 0.22));
      boxes.push(B(ew, z0, ee, ez0, 0.22, col.roof, roofY - 0.22), B(ew, ez1, ee, z1, 0.22, col.roof, roofY - 0.22));
    } else boxes.push(B(se, z0, x1, z1, 0.22, col.roof, roofY - 0.22));
    boxes.push(B(sw, z0, se, sz0, 0.22, col.roof, roofY - 0.22), B(sw, sz1, se, z1, 0.22, col.roof, roofY - 0.22));
    if (rnd() < 0.3) boxes.push(B(x0, z1 - 0.16, x1, z1, 0.85, col.wall2, roofY));
    if (rnd() < 0.5) props.push({ t: 'tank', x: (x0 + x1) / 2, z: (z0 + z1) / 2, y: roofY, r: 0.7, h: 1.15, c: '#3a6fb0', cap: '#d9d3c4' });
    if (rnd() < 0.4) for (const [cx, cz] of [[x0 + 0.3, z0 + 0.3], [x1 - 0.3, z1 - 0.3]]) boxes.push(B(cx - 0.05, cz - 0.05, cx + 0.05, cz + 0.05, 0.8, '#9aa3a8', roofY));
    if (rnd() < 0.2) props.push({ t: 'sign', x: (x0 + x1) / 2, y: y0 + 1.6, z: z0 - 0.05, w: 1.6, h: 0.7, rot: 0, text: ['LEO', '22', 'FÉ', 'RIO', '12'][Math.floor(rnd() * 5)], bg: ['#3a6fb0', '#a0503a', '#6a8f4a'][Math.floor(rnd() * 3)], fg: '#fff' });
    wps.push([(x0 + x1) / 2, y0 + 0.2, z0 - 0.7], [(x0 + x1) / 2, y0 + 0.2, z0 + 1.2], [(se + ew) / 2, y0 + 0.25, (z0 + z1) / 2]);
    roofs.push(roofY);
  }

  const anchors = [
    [72, 41, 10, 8, 3, { wall: '#c4b49a', wall2: BRICK, roof: ROOF, stair: WOOD }], // bar
    [106, 42, 12, 10, 3, { wall: '#9bb8ad', wall2: '#7e7e7c', roof: ROOF, stair: WOOD }], // laundromat
    [77, 56, 12, 10, 3, { wall: '#6a8f4a', wall2: '#8fb56a', roof: '#6e6256', stair: WOOD }], // grifter
    [36, 29, 10, 8, 2, { wall: '#e6c15a', wall2: '#d4b24a', roof: ROOF, stair: WOOD }], // yellow
    [35, 46, 10, 7, 2, { wall: BRICK, wall2: BRICK2, roof: ROOF, stair: '#c4b49a' }], // crackhouse
    [54, 56, 12, 8, 2, { wall: '#d5c4c4', wall2: '#c4b49a', roof: ROOF, stair: WOOD }], // ice cream
    [97, 59, 10, 7.5, 2, { wall: '#d9d3c4', wall2: '#9bb8ad', roof: ROOF, stair: WOOD }], // barber
    [50, 76, 12, 8, 2, { wall: BRICK, wall2: BRICK2, roof: '#6e6256', stair: WOOD }], // brickhouse
    [106, 0, 14, 8, 3, { wall: BRICK, wall2: '#c4b49a', roof: ROOF, stair: WOOD }], // bar 3rd
    [84, 18, 6, 5, 1, { wall: WOOD, wall2: '#6b4423', roof: '#6e6256', stair: WOOD }], // fruit stand
    [62, 25, 10, 7, 1, { wall: '#9bb8ad', wall2: '#b7c4a8', roof: GRASS, stair: WOOD }], // roof garden
  ];
  const occupied = [];
  function hits(rx, ry, w, d) {
    if (rx < 0.4 || ry < 0.4 || rx + w > 129.2 || ry + d > 88.6) return true;
    if (groundY(ry + 0.3) !== groundY(ry + d - 0.3)) return true;
    for (let x = rx + 0.3; x < rx + w - 0.2; x += 0.9) for (let y = ry + 0.3; y < ry + d - 0.2; y += 0.9) if (blocked(x, y)) return true;
    for (const p of occupied) if (rx < p[0] + p[2] && rx + w > p[0] && ry < p[1] + p[3] && ry + d > p[1]) return true;
    return false;
  }
  anchors.forEach(([rx, ry, w, d, floors, col]) => { house(rx, ry, w, d, floors, col); occupied.push([rx, ry, w, d]); });
  let ry = 0.6;
  let guard = 0;
  const cuts = [24, 40, 54, 68, 90];
  while (ry < 84 && guard++ < 80) {
    const next = cuts.find((c) => c > ry + 0.4) ?? 90;
    const room = next - ry - 0.15;
    if (room < 3.8) { ry = next + 0.1; continue; }
    const d = Math.min(6.2, room);
    if (groundY(ry + 0.2) !== groundY(ry + d - 0.2)) { ry = next + 0.3; continue; }
    let rx = 0.6;
    while (rx < 126) {
      const w = 4.5 + rnd() * 1.4;
      if (!hits(rx, ry, w, d)) { house(rx, ry, w, d, (Math.floor(rx * 2 + ry) % 4 === 0) ? 3 : 2); occupied.push([rx, ry, w, d]); rx += w; }
      else rx += 0.7;
    }
    ry += d;
  }
  for (const [w, d] of [[4.2, 4.0], [3.8, 4.2]]) {
    for (let y = 0.3; y < 84; y += 0.6) for (let x = 0.3; x < 126; x += 0.6) {
      if (!hits(x, y, w, d)) { house(x, y, w, d, 2); occupied.push([x, y, w, d]); x += w - 0.6; }
    }
  }

  // Main Street sinuosa e Side Street
  for (let rx = 0; rx <= 118; rx += 3) {
    const c = mainCenter(rx);
    const [x, , z] = [X(rx), 0, Z(c)];
    boxes.push(B(x - 1.6, z - 5.1, x + 1.6, z + 5.1, 0.07, '#3a3a38', 0.02));
  }
  for (let rx = 2; rx < 116; rx += 4.2) {
    const c = mainCenter(rx);
    props.push({ t: 'decal', x0: X(rx), z0: Z(c) - 0.12, x1: X(rx + 2.1), z1: Z(c) + 0.12, y: 0.1, c: 0xf2c94c });
  }
  // campinho, playground, junkyard, knoll, cemetery
  boxes.push(B(X(82), Z(62), X(108), Z(44), 2.66, DIRT));
  boxes.push(B(X(82), Z(62), X(108), Z(44), 0.1, GRASS, 2.66));
  boxes.push(B(X(82), Z(62), X(108), Z(61.7), 0.8, '#d9d3c4', 2.66), B(X(82), Z(44.3), X(108), Z(44), 0.8, '#d9d3c4', 2.66));
  boxes.push(B(X(82), Z(62), X(82.25), Z(44), 0.8, '#d9d3c4', 2.66), B(X(107.75), Z(62), X(108), Z(44), 0.8, '#d9d3c4', 2.66));
  props.push(
    { t: 'decal', x0: X(84), z0: Z(60), x1: X(106), z1: Z(59.8), y: 2.78, c: 0xf7f4ee },
    { t: 'decal', x0: X(84), z0: Z(46.2), x1: X(106), z1: Z(46), y: 2.78, c: 0xf7f4ee },
    { t: 'decal', x0: X(84), z0: Z(60), x1: X(84.2), z1: Z(46), y: 2.78, c: 0xf7f4ee },
    { t: 'decal', x0: X(105.8), z0: Z(60), x1: X(106), z1: Z(46), y: 2.78, c: 0xf7f4ee },
    { t: 'decal', x0: X(94.9), z0: Z(60), x1: X(95.1), z1: Z(46), y: 2.78, c: 0xf7f4ee },
  );
  boxes.push(B(X(84), Z(52.4), X(84.15), Z(49.6), 1.5, '#f4f1ea', 2.66), B(X(105.8), Z(52.4), X(106), Z(49.6), 1.5, '#f4f1ea', 2.66));
  boxes.push(B(X(2), Z(64), X(12), Z(48), 0.08, '#8a9a55', 1.52));
  for (const [px, pz] of [[4, 52], [8, 58], [3, 60]]) {
    const palm = (rx, ry) => {
      boxes.push(B(X(rx) - 0.2, Z(ry) - 0.2, X(rx) + 0.2, Z(ry) + 0.2, 5.5, WOOD, groundY(ry)));
      props.push({ t: 'tree', x: X(rx), z: Z(ry), y: groundY(ry) });
    };
    palm(px, pz);
  }
  boxes.push(B(X(108), Z(70), X(128), Z(69.6), 1.1, '#d9d3c4', 1.52), B(X(108), Z(70), X(108.4), Z(56), 1.1, '#d9d3c4', 1.52));
  for (const [px, pz] of [[112, 64], [118, 60], [122, 66], [114, 58]]) boxes.push(B(X(px), Z(pz), X(px) + 0.7, Z(pz) - 1.3, 0.8, '#e4dece', 1.52));

  // carros na Main (caminhões ao longo de X) e sucata fechando a saída
  for (const rx of [8, 22, 38, 54, 70, 88, 104, 116]) {
    const c = mainCenter(rx);
    const side = rx % 2 ? 2.6 : -2.6;
    props.push({ t: 'truck', x: X(rx), z: Z(c + side), y: 0.05, c: ['#e6c15a', '#c46a4e', '#6a8cbf', '#d9d3c4', '#3a6fb0', '#a0503a', '#8d8a84', '#6a8f4a'][Math.floor(rx / 16) % 8] });
  }
  props.push({ t: 'truck', x: X(118), z: Z(mainCenter(118)), y: 0.2, c: '#4a3428' });
  props.push({ t: 'car', x: X(21.6), z: Z(34), y: groundY(34), c: '#e6c15a', rot: Math.PI });
  props.push({ t: 'car', x: X(21.6), z: Z(48), y: groundY(48), c: '#6a8cbf' });

  // postes e fios
  const poles = [];
  for (let rx = 6; rx <= 112; rx += 18) {
    const c = mainCenter(rx) - 4.2;
    const x = X(rx), z = Z(c);
    boxes.push(B(x - 0.12, z - 0.12, x + 0.12, z + 0.12, 5.2, '#6e6256'));
    poles.push([x, 5.2, z]);
  }
  for (let i = 0; i < poles.length - 1; i++) {
    const [x0, y0, z0] = poles[i], [x1, , z1] = poles[i + 1];
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    props.push({ t: 'cable', x0, y0, z0, x1: mx, y1: y0 - 0.55, z1: mz, c: '#1c1c1c', r: 0.035 });
    props.push({ t: 'cable', x0: mx, y0: y0 - 0.55, z0: mz, x1, y1: y0, z1, c: '#1c1c1c', r: 0.035 });
  }

  // toldos na Main
  for (const rx of [14, 46, 96]) {
    const c = mainCenter(rx) - 4.9;
    boxes.push(B(X(rx), Z(c) - 1.4, X(rx + 4), Z(c), 0.1, rx === 46 ? '#e6c15a' : '#c45a6a', 2.7));
  }

  // anel de casas de fundo, sobe até +30 m no nordeste. Sem interior.
  const ring = (rx, ry, w, d, floors, y0) => {
    const x0 = X(rx), x1 = X(rx + w), z0 = Z(ry + d), z1 = Z(ry);
    const col = matOf(rx, ry, floors);
    for (let f = 0; f < floors; f++) boxes.push(B(x0, z0, x1, z1, 2.7, f === floors - 1 ? col.roof : col.wall, y0 + f * 2.8));
  };
  for (let i = 0; i < 18; i++) {
    const rx = -28 + (i % 9) * 18;
    const ry = 92 + Math.floor(i / 9) * 8;
    ring(rx, ry, 8, 6, 3 + (i % 3), 0);
  }
  for (let i = 0; i < 16; i++) {
    const rx = -22 + (i % 8) * 20;
    ring(rx, -12 - Math.floor(i / 8) * 7, 9, 6, 3 + (i % 4), 4 + (i % 4) * 4);
  }
  for (let i = 0; i < 10; i++) ring(132 + (i % 2) * 8, 10 + i * 7, 7, 6, 4 + (i % 2), 8 + i * 2);
  for (let i = 0; i < 8; i++) ring(-18, 8 + i * 10, 7, 7, 4, 6 + i);

  // colisão invisível no limite jogável. As saídas da rua fecham com o caminhão e o entulho.
  boxes.push({ b: [-65, 0, -45, -64.4, 8, 45], hide: true, c: '#000' });
  boxes.push({ b: [64.4, 0, -45, 65, 8, 45], hide: true, c: '#000' });
  boxes.push({ b: [-65, 0, 44.4, 65, 8, 45], hide: true, c: '#000' });
  boxes.push({ b: [-65, 0, -45, 65, 8, -44.4], hide: true, c: '#000' });
  boxes.push(B(X(0), Z(76), X(6), Z(70), 1.4, '#6e6256'));
  boxes.push(B(X(124), Z(78), X(130), Z(70), 1.6, BRICK2));

  // telheiros abertos em pátios que já estão no grafo: contam como interior
  const shed = (rx, ry, w, d) => {
    const x0 = X(rx), x1 = X(rx + w), z1 = Z(ry), z0 = Z(ry + d), y0 = groundY(ry + d * 0.5);
    boxes.push(B(x0, z0, x0 + 0.25, z1, 2.5, WOOD, y0), B(x1 - 0.25, z0, x1, z1, 2.5, WOOD, y0));
    boxes.push(B(x0, z1 - 0.25, x1, z1, 2.5, WOOD, y0));
    boxes.push(B(x0, z0, x1, z1, 0.18, ROOF, y0 + 2.4));
    wps.push([(x0 + x1) / 2, y0 + 0.3, (z0 + z1) / 2]);
  };
  shed(3, 30, 7, 6);
  shed(38, 10, 8, 6);
  // lojas abertas para a Main: o interior liga no grafo e a porta tem 2,4 m
  for (const rx of [12, 26, 40, 58, 74, 92]) {
    const c = mainCenter(rx);
    const ry = c - 9.4;
    if (hits(rx, ry, 4.6, 4.2)) continue;
    const x0 = X(rx), x1 = X(rx + 4.6), z1 = Z(ry), z0 = Z(ry + 4.2), y0 = groundY(ry + 2);
    boxes.push(...wallX(x0, x1, z1 - 0.2, 0.35, 3, BRICK, [win(x0 + 0.8, x0 + 1.8)], y0));
    boxes.push(...wallZ(z0, z1, x0 + 0.18, 0.35, 3, BRICK2, [], y0));
    boxes.push(...wallZ(z0, z1, x1 - 0.18, 0.35, 3, BRICK2, [], y0));
    boxes.push(B(x0, z0, x1, z1, 0.2, ROOF, y0 + 2.8));
    wps.push([(x0 + x1) / 2, y0 + 0.3, (z0 + z1) / 2], [(x0 + x1) / 2, y0 + 0.3, z0 - 0.8]);
    occupied.push([rx, ry, 4.6, 4.2]);
  }
  for (let rx = 4; rx < 116; rx += 6) wps.push([X(rx), 0.3, Z(mainCenter(rx))]);
  for (let ry = 26; ry < 68; ry += 6) wps.push([X(21.8), groundY(ry) + 0.3, Z(ry)]);

  const spawns = [[-55, -30.11, 0.2], [-45, -31.0, 0.2], [-37, -30.68, 0.2], [-27, -28.9, 0.2], [-19, -27.06, 0.2], [-7, -25.1, 0.2], [-1, -24.91, 0.2], [17, -27.59, 0.2], [35, -30.91, 0.2], [-43.2, 19, 4.38], [-43.2, 7, 4.38], [-43.2, -13, 1.72]];
  const pickups = [['ammo', -51, -30.7, 0.3], ['health', -11, -25.6, 0.3], ['ammo', -43.2, 15, 4.45], ['health', -39, -30.9, 0.3], ['grenade', -43.2, -17, 1.8], ['ammo', -31, -29.7, 0.3], ['grenade', -23, -28, 0.3], ['health', 9, -27.2, 0.3]];

  return {
    id: 'morro-leitao', name: 'Morro do Leitão',
    desc: 'Favela de manhã: Main Street no sul, becos, campinho e lajes em vários andares.',
    size: [93, 73], wallH: 0.4, wallColor: [DIRT, DIRT], openMax: 14, laneMin: 40, navSpacing: 2,
    skyline: 'favela',
    fall: { openWest: true, openEast: true, openNorth: true, openSouth: true },
    palette: { sky: '#9ec4ea', fog: ['#d5e0ea', 80, 240], hemi: ['#fff6e4', '#6a7a48', 1.45], sun: ['#fff1d0', 2.15], ground: DIRT, tiles: null, clouds: true, mountains: false, lights: [] },
    boxes: boxes.filter((o) => o.b),
    waypoints: wps,
    props,
    spawns, pickups,
    showcase: [X(40), 0, Z(73)],
    view: [X(20), 2, Z(70), 0.4, -0.05],
    test: {
      stairs: { from: [X(21.8), 0, Z(70)], to: [X(21.8), 1.52, Z(66)], level: 1.52 },
      roof: { from: [X(74), 1.52, Z(46)], to: [X(77), 1.52 + 6, Z(44)], level: 7 },
      under: { from: [X(21.8), groundY(40), Z(40)], to: [X(21.8), groundY(36), Z(36)], ceil: 8 },
    },
    _roofs: roofs,
  };
}
