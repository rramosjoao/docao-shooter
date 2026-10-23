// Minimapa estilo UAV do Call of Duty ("Olho da granja").
// Canvas 2D puro. Não importa three nem main.js.
// Janela local: o jogador fica no centro (raio VIEW) e o mapa desliza e gira por baixo.
// A frente do personagem aponta sempre para cima. A seta fica fixa.
//
// Câmera: camera.rotation.set(pitch, yaw, 0) — Euler XYZ.
// Frente no mundo (x, z): fx = -sin(yaw), fz = -cos(yaw). yaw 0 olha para -Z.
// Direita do personagem (igual ao main.js): rx = cos(yaw), rz = -sin(yaw). yaw 0 => direita = +X.
// Para um ponto (x, z) e o jogador (px, pz):
//   dx = x - px; dz = z - pz
//   along = dx*fx + dz*fz   // positivo = na frente
//   side  = dx*rx + dz*rz   // positivo = à direita
//   screenX = cx + side * scale
//   screenY = cy - along * scale   // frente = para cima
//   scale = (SIZE/2 - INSET) / VIEW
//
// Bússola, sentido horário a partir do norte (+Z):
//   facing = atan2(-fx, fz)  // leste = −X (de frente pro norte +Z, a direita é −X); yaw 0 => PI (sul)
//   delta = atan2(sin(ang - facing), cos(ang - facing))   // -PI..PI
//   x = cx + delta / (PI/4) * 36
// Norte = 0, NE = PI/4, E = PI/2, e assim por diante. A letra do centro é a frente.

const SIZE = 210;
const SCALE = 2;
const VIEW = 22;
const INSET = 8;

const COMPASS = [
  { label: 'N', ang: 0 },
  { label: 'NE', ang: Math.PI / 4 },
  { label: 'E', ang: Math.PI / 2 },
  { label: 'SE', ang: (3 * Math.PI) / 4 },
  { label: 'S', ang: Math.PI },
  { label: 'SW', ang: (5 * Math.PI) / 4 },
  { label: 'W', ang: (6 * Math.PI) / 4 },
  { label: 'NW', ang: (7 * Math.PI) / 4 },
];

let root = null;
let canvas = null;
let timeEl = null;
let active = false;
let duration = 0;
let elapsed = 0;
let halfX = 1;
let halfZ = 1;
let boxes = [];

const CSS = `
#uav{
  position:fixed;
  top:14px;
  left:14px;
  z-index:12;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:4px;
  padding:7px 8px 6px;
  background:rgba(8,10,8,.84);
  border:2px solid #e6c34a;
  border-radius:12px;
  box-shadow:0 0 0 1px rgba(0,0,0,.72), 0 12px 28px rgba(0,0,0,.45), inset 0 0 18px rgba(230,195,74,.1);
  pointer-events:none;
  color:#ffe7a3;
  font-family:"Trebuchet MS","Segoe UI",Arial,sans-serif;
  user-select:none;
}
#uav.hidden,#uav[hidden]{display:none!important}
#uav .uav-title{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  margin:0;
  font-family:"Arial Black",Impact,sans-serif;
  font-size:12px;
  font-weight:400;
  letter-spacing:.3px;
  color:#ffd56a;
  text-shadow:0 1px 0 #000;
  line-height:1.2;
  white-space:nowrap;
}
#uav .uav-title:before{
  content:"";
  width:7px;
  height:7px;
  border-radius:50%;
  background:#ff3b3b;
  box-shadow:0 0 8px #ff2a2a;
  animation:uavBlink 1.1s ease-in-out infinite;
}
@keyframes uavBlink{
  0%,100%{opacity:1}
  50%{opacity:.25}
}
#uav canvas{
  width:210px;
  height:210px;
  display:block;
  flex:none;
  border-radius:4px;
  background:#0c100c;
}
#uavTime{
  margin:0;
  min-width:3ch;
  text-align:center;
  font-family:"Arial Black",Impact,sans-serif;
  font-size:16px;
  font-weight:400;
  letter-spacing:.6px;
  color:#fff6d2;
  text-shadow:0 1px 0 #000, 0 0 8px rgba(230,195,74,.35);
  line-height:1.1;
  font-variant-numeric:tabular-nums;
}
`;

function ensureStyle() {
  if (!document.head || document.getElementById('uav-style')) return;
  const style = document.createElement('style');
  style.id = 'uav-style';
  style.textContent = CSS;
  document.head.appendChild(style);
}

function frame(player) {
  const px = player && Number.isFinite(Number(player.x)) ? Number(player.x) : 0;
  const pz = player && Number.isFinite(Number(player.z)) ? Number(player.z) : 0;
  const yaw = player && Number.isFinite(Number(player.yaw)) ? Number(player.yaw) : 0;
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const scale = (SIZE / 2 - INSET) / VIEW;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const half = SIZE / 2 - INSET;
  return {
    px,
    pz,
    fx,
    fz,
    rx,
    rz,
    scale,
    cx,
    cy,
    facing: Math.atan2(-fx, fz),
    left: cx - half,
    top: cy - half,
    w: half * 2,
    h: half * 2,
    right: cx + half,
    bottom: cy + half,
  };
}

function project(x, z, F) {
  const dx = x - F.px;
  const dz = z - F.pz;
  const along = dx * F.fx + dz * F.fz;
  const side = dx * F.rx + dz * F.rz;
  return {
    x: F.cx + side * F.scale,
    y: F.cy - along * F.scale,
  };
}

function readBoxes(list) {
  const out = [];
  if (!Array.isArray(list)) return out;
  for (const o of list) {
    const b = o && o.b;
    if (!b || b.length < 6) continue;
    const nums = [0, 1, 2, 3, 4, 5].map((i) => Number(b[i]));
    if (!nums.every(Number.isFinite)) continue;
    const x0 = Math.min(nums[0], nums[3]);
    const x1 = Math.max(nums[0], nums[3]);
    const z0 = Math.min(nums[2], nums[5]);
    const z1 = Math.max(nums[2], nums[5]);
    const y0 = Math.min(nums[1], nums[4]);
    if (x1 - x0 < 0.02 || z1 - z0 < 0.02) continue;
    out.push({ x0, z0, x1, z1, y0 });
  }
  out.sort((a, c) => c.y0 - a.y0);
  return out;
}

function fitCanvas() {
  if (!canvas) return null;
  const w = SIZE * SCALE;
  if (canvas.width !== w || canvas.height !== w) {
    canvas.width = w;
    canvas.height = w;
  }
  canvas.style.width = SIZE + 'px';
  canvas.style.height = SIZE + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  return ctx;
}

function clipSquare(ctx, F) {
  ctx.beginPath();
  ctx.rect(F.left, F.top, F.w, F.h);
  ctx.clip();
}

function paintField(ctx, F) {
  const field = ctx.createRadialGradient(F.cx, F.cy, F.w * 0.12, F.cx, F.cy, F.w * 0.72);
  field.addColorStop(0, '#3a522c');
  field.addColorStop(0.62, '#24361c');
  field.addColorStop(1, '#121a10');
  ctx.fillStyle = field;
  ctx.fillRect(F.left, F.top, F.w, F.h);
}

function paintGrid(ctx, F) {
  const step = 8;
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(220, 196, 120, 0.16)';
  ctx.lineWidth = 1;
  for (let x = Math.ceil(-halfX / step) * step; x <= halfX + 0.001; x += step) {
    const a = project(x, -halfZ, F);
    const b = project(x, halfZ, F);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  for (let z = Math.ceil(-halfZ / step) * step; z <= halfZ + 0.001; z += step) {
    const a = project(-halfX, z, F);
    const b = project(halfX, z, F);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
}

function paintBox(ctx, box, F) {
  const pts = [
    project(box.x0, box.z0, F),
    project(box.x1, box.z0, F),
    project(box.x1, box.z1, F),
    project(box.x0, box.z1, F),
  ];
  const high = box.y0 >= 2;
  const alpha = high ? Math.max(0.14, 0.4 - (box.y0 - 2) * 0.03) : 0.94;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = high
    ? `rgba(176, 142, 98, ${alpha.toFixed(3)})`
    : `rgba(214, 176, 120, ${alpha})`;
  ctx.fill();
  let minX = pts[0].x;
  let maxX = pts[0].x;
  let minY = pts[0].y;
  let maxY = pts[0].y;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (Math.min(maxX - minX, maxY - minY) >= 5) {
    ctx.strokeStyle = high ? `rgba(62, 40, 18, ${(alpha * 0.65).toFixed(3)})` : 'rgba(74, 46, 22, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function paintSweep(ctx, F) {
  const ang = elapsed * (Math.PI * 2 / 3.4);
  ctx.save();
  clipSquare(ctx, F);
  ctx.translate(F.cx, F.cy);
  ctx.rotate(ang);
  const radius = Math.hypot(F.w, F.h) * 0.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, -0.85, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, radius, 0);
  g.addColorStop(0, 'rgba(214, 255, 170, 0)');
  g.addColorStop(0.45, 'rgba(214, 255, 170, 0.04)');
  g.addColorStop(1, 'rgba(214, 255, 170, 0.2)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(226, 255, 190, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(radius * 0.42, 0);
  ctx.lineTo(radius, 0);
  ctx.stroke();
  ctx.restore();
}

function paintCompass(ctx, F) {
  ctx.save();
  clipSquare(ctx, F);
  const band = ctx.createLinearGradient(0, F.top, 0, F.top + 30);
  band.addColorStop(0, 'rgba(6, 8, 6, 0.78)');
  band.addColorStop(1, 'rgba(6, 8, 6, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(F.left, F.top, F.w, 30);

  const y = F.top + 13;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const dir of COMPASS) {
    const delta = Math.atan2(Math.sin(dir.ang - F.facing), Math.cos(dir.ang - F.facing));
    const x = F.cx + delta / (Math.PI / 4) * 36;
    if (x < F.left || x > F.right) continue;
    const cardinal = dir.label.length === 1;
    ctx.font = cardinal
      ? '700 12px "Trebuchet MS", sans-serif'
      : '700 10px "Trebuchet MS", sans-serif';
    ctx.fillStyle = cardinal ? '#F7A531' : '#f3e6c0';
    ctx.fillText(dir.label, x, y);
  }
  ctx.restore();
}

function paintPlayer(ctx, F) {
  const x = F.cx;
  const y = F.cy;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x + 8, y + 7);
  ctx.lineTo(x, y + 2);
  ctx.lineTo(x - 8, y + 7);
  ctx.closePath();
  ctx.fillStyle = '#f5d90a';
  ctx.strokeStyle = '#1a1404';
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function paintEnemies(ctx, F, enemies) {
  if (!Array.isArray(enemies)) return;
  const phase = (elapsed % 1.25) / 1.25;
  ctx.save();
  clipSquare(ctx, F);
  for (const e of enemies) {
    if (!e) continue;
    const x = Number(e.x);
    const z = Number(e.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    const p = project(x, z, F);
    if (p.x < F.left || p.x > F.right || p.y < F.top || p.y > F.bottom) continue;
    const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 11);
    glow.addColorStop(0, 'rgba(255, 48, 48, 0.9)');
    glow.addColorStop(0.45, 'rgba(255, 30, 30, 0.35)');
    glow.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.2 + phase * 6.5, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(255, 64, 64, ${((1 - phase) * 0.7).toFixed(3)})`;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2a2a';
    ctx.fill();
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = '#ffd2d2';
    ctx.stroke();
  }
  ctx.restore();
}

function render(dyn) {
  const ctx = fitCanvas();
  if (!ctx) return;
  const F = frame(dyn && dyn.player);
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#070908';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.save();
  clipSquare(ctx, F);
  paintField(ctx, F);
  paintGrid(ctx, F);
  for (const box of boxes) paintBox(ctx, box, F);
  ctx.restore();

  paintSweep(ctx, F);

  if (dyn) paintEnemies(ctx, F, dyn.enemies);

  paintCompass(ctx, F);

  ctx.strokeStyle = '#e6c34a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(F.left + 0.75, F.top + 0.75, F.w - 1.5, F.h - 1.5);

  if (dyn && dyn.player) paintPlayer(ctx, F);
}

function showPanel() {
  if (!root) return;
  root.hidden = false;
  root.classList.remove('hidden');
}

export function mountUav() {
  if (typeof document === 'undefined') return null;
  ensureStyle();
  let el = document.getElementById('uav');
  if (!el) {
    el = document.createElement('div');
    el.id = 'uav';
    el.className = 'hidden';
    el.hidden = true;
    const title = document.createElement('div');
    title.className = 'uav-title';
    title.textContent = 'Olho da granja';
    const board = document.createElement('canvas');
    const time = document.createElement('div');
    time.id = 'uavTime';
    time.textContent = '10s';
    el.append(title, board, time);
    (document.body || document.documentElement).appendChild(el);
  }
  root = el;
  canvas = el.querySelector('canvas');
  timeEl = document.getElementById('uavTime');
  fitCanvas();
  return el;
}

export function showUav(info) {
  mountUav();
  const size = (info && info.size) || [1, 1];
  const hx = Math.abs(Number(size[0]));
  const hz = Math.abs(Number(size[1]));
  halfX = Number.isFinite(hx) && hx > 0 ? hx : 1;
  halfZ = Number.isFinite(hz) && hz > 0 ? hz : 1;
  boxes = readBoxes(info && info.boxes);
  const seconds = Number(info && info.seconds);
  duration = Number.isFinite(seconds) ? Math.max(0, seconds) : 10;
  elapsed = 0;
  active = true;
  if (timeEl) timeEl.textContent = `${Math.ceil(duration)}s`;
  showPanel();
  render(null);
}

export function drawUav(info) {
  if (!root) mountUav();
  render(info || {});
}

export function tickUav(dt) {
  if (!active) return false;
  const step = Number(dt);
  if (Number.isFinite(step) && step > 0) elapsed += step;
  const left = duration - elapsed;
  if (left <= 0) {
    hideUav();
    return false;
  }
  if (timeEl) timeEl.textContent = `${Math.ceil(left)}s`;
  return true;
}

export function hideUav() {
  active = false;
  if (typeof document !== 'undefined' && !root) root = document.getElementById('uav');
  if (!root) return;
  root.hidden = true;
  root.classList.add('hidden');
}
