// Interface dos prêmios por abates seguidos.
// Módulo solto: não importa o jogo nem o three.js.

const REWARDS = [
  { need: 3, name: 'Olho da granja', icon: 'eye' },
  { need: 5, name: 'Míssil da granja', icon: 'missiles' },
  { need: 7, name: 'Gavião da granja', icon: 'heli' },
  { need: 10, name: 'Chopper da granja', icon: 'heli gunner' },
  { need: 13, name: 'Grelha da granja', icon: 'plane' },
];

const CSS = `
#streakCount{
  position:fixed;bottom:22px;left:50%;transform:translateX(-50%);
  z-index:20;text-align:center;pointer-events:none;user-select:none;
}
#streakCount[hidden]{display:none!important}
#streakCount b{
  display:block;font-family:var(--font);
  font-size:68px;line-height:.85;white-space:nowrap;color:#ffd27a;
  -webkit-text-stroke:6px #000;paint-order:stroke fill;text-shadow:0 3px 0 #000;
}
#streakCount small{
  display:block;margin-top:4px;font-family:var(--font);
  font-size:15px;font-weight:bold;letter-spacing:1.5px;color:#ffe8c2;text-shadow:0 2px 0 #000;
}
#streakBar{
  position:fixed;right:12px;bottom:210px;z-index:20;
  display:flex;flex-direction:row;align-items:stretch;justify-content:flex-end;gap:6px;
  padding-right:28px;
  pointer-events:none;user-select:none;
}
#streakBar .streak-stack{
  display:flex;flex-direction:column-reverse;align-items:flex-end;gap:7px;
}
#streakBar .streak-card{
  position:relative;display:flex;align-items:center;justify-content:flex-end;gap:6px;
  height:54px;color:#f2e6dc;
}
#streakBar .streak-sq{
  width:54px;height:54px;box-sizing:border-box;position:relative;flex:none;
  background:rgba(18,14,14,.9);border:2px solid #5a4a4c;border-radius:3px;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.55);
}
#streakBar .streak-pips{
  position:absolute;left:100%;top:50%;transform:translateY(-50%);margin-left:6px;
  width:20px;display:flex;flex-direction:column;justify-content:center;gap:2px;
}
#streakBar .streak-pips i{
  display:block;height:5px;width:100%;flex:none;border-radius:1px;background:#4a1820;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.55);
}
#streakBar .streak-pips i.is-hidden{display:none}
#streakBar .streak-pips i.on{
  background:#e02028;box-shadow:0 0 6px #ff2a2a,inset 0 0 0 1px rgba(0,0,0,.25);
}
#streakBar .streak-card b{
  position:absolute;left:0;right:0;bottom:2px;text-align:center;
  font-family:var(--font);font-size:16px;line-height:1;
  color:inherit;text-shadow:0 1px 0 #000,0 0 3px #000;pointer-events:none;
}
#streakBar .streak-glyph{
  position:absolute;left:50%;top:6px;transform:translateX(-50%);
  color:currentColor;display:block;
}
#streakBar .streak-glyph.eye{
  width:28px;height:16px;box-sizing:border-box;
  border:2px solid currentColor;border-radius:50%;
}
#streakBar .streak-glyph.eye::before{
  content:"";position:absolute;left:50%;top:50%;width:8px;height:8px;
  border-radius:50%;background:currentColor;transform:translate(-50%,-50%);
}
#streakBar .streak-glyph.missiles{width:26px;height:18px}
#streakBar .streak-glyph.missiles i{
  display:block;position:absolute;top:2px;width:3px;height:13px;
  border-radius:2px;background:currentColor;font-style:normal;
}
#streakBar .streak-glyph.missiles i::after{
  content:"";position:absolute;left:50%;bottom:-4px;transform:translateX(-50%);
  border-left:3px solid transparent;border-right:3px solid transparent;
  border-top:4px solid currentColor;
}
#streakBar .streak-glyph.missiles i:nth-child(1){left:11px;transform:none}
#streakBar .streak-glyph.missiles i:nth-child(2){display:none}
#streakBar .streak-glyph.missiles i:nth-child(3){display:none}
#streakBar .streak-glyph.radio{width:18px;height:22px}
#streakBar .streak-glyph.radio::before{
  content:"";position:absolute;left:3px;top:0;width:2px;height:7px;
  background:currentColor;border-radius:1px;
}
#streakBar .streak-glyph.radio::after{
  content:"";position:absolute;left:0;right:0;top:6px;bottom:0;box-sizing:border-box;
  border:2px solid currentColor;border-radius:3px;
  background:
    linear-gradient(currentColor,currentColor) center 4px / 8px 2px no-repeat,
    linear-gradient(currentColor,currentColor) center 8px / 8px 2px no-repeat;
}
#streakBar .streak-glyph.eye{color:#e8fbff}
#streakBar .streak-glyph.missiles{color:#ffe7a4}
#streakBar .streak-glyph.radio{color:#ff8d8d}
#streakBar .streak-glyph.heli{width:28px;height:18px}
#streakBar .streak-glyph.heli::before{
  content:"";position:absolute;left:6px;top:7px;width:14px;height:7px;box-sizing:border-box;
  border:2px solid currentColor;border-radius:2px 7px 2px 2px;background:transparent;
}
#streakBar .streak-glyph.heli::after{
  content:"";position:absolute;left:1px;top:3px;width:26px;height:2px;background:currentColor;border-radius:1px;
}
#streakBar .streak-glyph.heli{color:#ffd27a}
#streakBar .streak-glyph.heli.gunner{color:#9fe0ff}
#streakBar .streak-glyph.heli.gunner{box-shadow:inset 0 -3px 0 -1px transparent}
#streakBar .streak-glyph.heli.gunner::before{border-radius:2px 7px 2px 2px;box-shadow:-5px 6px 0 -3px currentColor}
#streakBar .streak-glyph.plane{width:26px;height:16px}
#streakBar .streak-glyph.plane i{
  display:block;position:absolute;left:0;top:6px;width:26px;height:3px;
  border-radius:1px;background:currentColor;font-style:normal;
}
#streakBar .streak-glyph.plane::before{
  content:"";position:absolute;left:11px;top:1px;width:3px;height:14px;
  border-radius:1px;background:currentColor;
}
#streakBar .streak-glyph.plane::after{
  content:"";position:absolute;left:8px;top:1px;width:9px;height:2px;background:currentColor;
}
/* todos neutros; só brilha o que está guardado pra usar (F) */
#streakBar .streak-card{opacity:.85}
#streakBar .streak-card.ready{opacity:1;color:#fff}
#streakBar .streak-card.ready .streak-sq{
  border-color:#ff4a4a;background:rgba(48,12,16,.96);
  box-shadow:0 0 14px #ff2a2a,0 0 3px #fff;animation:streakReady 1.1s ease-in-out infinite;
}
@keyframes streakReady{50%{box-shadow:0 0 22px #ff2a2a,0 0 5px #fff}}
@media (prefers-reduced-motion:reduce){#streakBar .streak-card.ready .streak-sq{animation:none}}
#nukeReady{
  position:absolute;right:0;bottom:calc(100% + 6px);
  pointer-events:none;user-select:none;white-space:nowrap;
  font-family:var(--font);
  font-size:13px;font-weight:bold;letter-spacing:.2px;color:#ffd27a;
  background:rgba(14,10,8,.92);border:2px solid #e63946;border-radius:8px;
  padding:5px 8px;box-shadow:0 0 10px rgba(230,57,70,.4);
}
#nukeReady[hidden]{display:none!important}
#strikeMap{
  position:fixed;inset:0;z-index:40;display:flex;
  align-items:flex-end;justify-content:center;
  padding:0 16px 20px;background:transparent;
  pointer-events:none;user-select:none;overflow:visible;
}
#strikeMap[hidden]{display:none!important}
#strikeMap .strike-tablet{
  pointer-events:auto;box-sizing:border-box;
  width:min(460px,calc(100vw - 32px));
  display:flex;flex-direction:column;align-items:center;gap:8px;
  padding:10px 12px 14px;
  background:linear-gradient(180deg,#3a312a 0%,#1a1512 22%,#100e0c 100%);
  border:3px solid #4a3b32;border-radius:28px 28px 32px 32px;
  box-shadow:0 26px 48px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,220,170,.28),inset 0 0 0 2px #0c0a09;
}
#strikeMap .strike-tablet::before{
  content:"";width:10px;height:10px;border-radius:50%;
  background:#1a120c;box-shadow:inset 0 0 0 2px #2a211c,0 0 0 3px #0c0a09;
}
#strikeMap .strike-head{
  align-self:stretch;display:flex;align-items:center;justify-content:space-between;
  gap:10px;padding:0 4px;pointer-events:none;
}
#strikeMap h2{
  margin:0;font-family:var(--font);
  font-size:15px;font-weight:bold;letter-spacing:.2px;line-height:1.1;color:#ffd27a;
}
#strikeMap .strike-left{
  font-family:var(--font);font-size:18px;line-height:1;color:#fff8ea;
  text-shadow:0 1px 0 #000;
}
#strikeMap canvas{
  display:block;background:#7cc95a;cursor:crosshair;touch-action:none;
  border-radius:8px;box-shadow:inset 0 0 0 2px #24180f;pointer-events:auto;
}
#strikeMap .strike-tablet::after{
  content:"";width:86px;height:5px;border-radius:999px;background:#3a322c;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.12);
}
#nukeBanner{
  position:fixed;left:50%;top:46%;transform:translate(-50%,-50%);
  z-index:80;text-align:center;pointer-events:none;user-select:none;
  padding:8px 28px 16px;background:#fff0cc;
  border:5px solid #203e35;border-radius:4px;
  box-shadow:7px 8px 0 #a52e26;
}
#nukeBanner[hidden]{display:none!important}
#nukeBanner b{
  display:block;font-family:var(--font);
  font-size:220px;line-height:.78;letter-spacing:-2px;color:#a52e26;
  text-shadow:5px 5px 0 #203e35;
}
#nukeBanner span{
  display:block;margin-top:4px;font-family:var(--font);
  font-size:44px;line-height:1;letter-spacing:3px;color:#203e35;
}
@media (max-height:760px){
  #nukeBanner b{font-size:148px}
  #nukeBanner span{font-size:30px}
}
`;

let currentCount = 0;
let currentCycle = 0;
let currentReady = [];
let strike = null;
let listening = false;

function hasDom() {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function byId(id) {
  return document.getElementById(id);
}

function ensureStyle() {
  if (byId('streak-ui-style')) return;
  const style = document.createElement('style');
  style.id = 'streak-ui-style';
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);
}

function ensureCount() {
  let node = byId('streakCount');
  if (!node) {
    node = document.createElement('div');
    node.id = 'streakCount';
    node.hidden = true;
    document.body.appendChild(node);
  }
  if (!node.querySelector('b')) {
    const num = document.createElement('b');
    num.textContent = '0';
    const label = document.createElement('small');
    label.textContent = 'seguidos';
    node.append(num, label);
  }
  return node;
}

function makeGlyph(icon) {
  const glyph = document.createElement('span');
  glyph.className = 'streak-glyph ' + icon;
  glyph.setAttribute('aria-hidden', 'true');
  if (icon === 'missiles') {
    glyph.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
  }
  if (icon === 'plane') glyph.append(document.createElement('i'));
  return glyph;
}

function ensureBar() {
  let bar = byId('streakBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'streakBar';
    document.body.appendChild(bar);
  }
  if (!bar.querySelector('.streak-card')) {
    const stack = document.createElement('div');
    stack.className = 'streak-stack';
    for (const reward of REWARDS) {
      const card = document.createElement('div');
      card.className = 'streak-card locked';
      card.dataset.need = String(reward.need);
      card.title = reward.name;
      const sq = document.createElement('div');
      sq.className = 'streak-sq';
      const num = document.createElement('b');
      num.textContent = String(reward.need);
      sq.append(makeGlyph(reward.icon), num);
      card.append(sq);
      stack.appendChild(card);
    }
    const pips = document.createElement('div');
    pips.className = 'streak-pips';
    for (let i = 0; i < 15; i++) pips.appendChild(document.createElement('i'));
    bar.append(stack, pips);
  }
  return bar;
}

function ensureNukeReady() {
  let node = byId('nukeReady');
  if (!node) {
    node = document.createElement('div');
    node.id = 'nukeReady';
    node.hidden = true;
    node.textContent = 'F · puxar o rádio';
    const bar = byId('streakBar');
    (bar || document.body).appendChild(node);
  }
  return node;
}

function ensureMap() {
  let map = byId('strikeMap');
  if (!map) {
    map = document.createElement('div');
    map.id = 'strikeMap';
    map.hidden = true;
    const tablet = document.createElement('div');
    tablet.className = 'strike-tablet';
    const head = document.createElement('div');
    head.className = 'strike-head';
    const title = document.createElement('h2');
    title.textContent = 'Chuva de torresmo';
    const left = document.createElement('div');
    left.className = 'strike-left';
    left.textContent = '0/3';
    const canvas = document.createElement('canvas');
    head.append(title, left);
    tablet.append(head, canvas);
    map.appendChild(tablet);
    const swallow = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    tablet.addEventListener('mousedown', swallow);
    tablet.addEventListener('click', swallow);
    document.body.appendChild(map);
  }
  return map;
}

function ensureNuke() {
  let banner = byId('nukeBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'nukeBanner';
    banner.hidden = true;
    document.body.appendChild(banner);
  }
  let num = banner.querySelector('b');
  let title = banner.querySelector('span');
  if (!num) { num = document.createElement('b'); num.textContent = '0'; }
  if (!title) title = document.createElement('span');
  title.textContent = 'FIM DA CHAPA';
  banner.replaceChildren(num, title); // número enorme no centro, "FIM DA CHAPA" embaixo; vale pra quem chamou também
  return banner;
}

// faltam = cycle >= need ? 0 : need - cycle
// próximo = menor need com faltam > 0; faltam 0 = earned; o resto = locked
function remainingFor(need, cycle) {
  const c = Number.isFinite(cycle) ? cycle : 0;
  const goal = Number(need);
  if (!Number.isFinite(goal)) return 0;
  if (c >= goal) return 0;
  return goal - c;
}

function remainingText(left) {
  if (!Number.isFinite(left)) return '0';
  const nearest = Math.round(left);
  if (Math.abs(left - nearest) < 1e-6) return String(nearest);
  return String(Math.round(left * 10) / 10);
}

function nextNeed(cycle) {
  let best = null;
  for (const reward of REWARDS) {
    if (remainingFor(reward.need, cycle) <= 0) continue;
    if (best === null || reward.need < best) best = reward.need;
  }
  return best;
}

function stateFor(need, cycle) {
  if (remainingFor(need, cycle) === 0) return 'earned';
  return nextNeed(cycle) === need ? 'next' : 'locked';
}

function applyCycle(cycle) {
  const cards = document.querySelectorAll('#streakBar .streak-card');
  cards.forEach((card) => {
    const need = Number(card.dataset.need);
    const state = stateFor(need, cycle);
    card.classList.remove('locked', 'next', 'earned');
    card.classList.add(state);
    const num = card.querySelector('b');
    const left = remainingFor(need, cycle);
    if (num) num.textContent = remainingText(left);
  });
  const bar = document.getElementById('streakBar');
  const pipBox = bar && bar.querySelector('.streak-pips');
  const pips = pipBox ? pipBox.querySelectorAll('i') : [];
  const steps = Number.isFinite(cycle) ? Math.max(0, Math.floor(cycle)) : 0;
  const goal = nextNeed(cycle) || pips.length;
  const filled = Math.min(goal, steps);
  pips.forEach((pip, i) => {
    const show = i < goal;
    pip.classList.toggle('is-hidden', !show);
    pip.classList.toggle('on', show && i >= goal - filled);
  });
  const anchor = bar && bar.querySelector('.streak-card[data-need="' + goal + '"]');
  if (pipBox && anchor && pipBox.parentElement !== anchor) anchor.appendChild(pipBox);
}

// ready = ids guardados ('uav', 'missile', 'heli'); o card brilha enquanto tiver um pra usar
const READY_ID = { 3: 'uav', 5: 'missile', 7: 'heli', 10: 'gunner', 13: 'ac130' };
function applyReady(ids) {
  document.querySelectorAll('#streakBar .streak-card').forEach((card) => {
    card.classList.toggle('ready', ids.includes(READY_ID[card.dataset.need]));
  });
}

function applyCount(n) {
  const node = byId('streakCount');
  if (!node) return;
  const num = node.querySelector('b');
  if (num) num.textContent = String(n);
  node.hidden = !(n > 0);
}

function ensureDom() {
  if (!hasDom()) return false;
  ensureStyle();
  ensureCount();
  ensureBar();
  ensureNukeReady();
  ensureMap();
  ensureNuke();
  bindMap();
  applyCycle(currentCycle);
  applyReady(currentReady);
  applyCount(currentCount);
  return true;
}

function mapCanvas() {
  const map = byId('strikeMap');
  return map ? map.querySelector('canvas') : null;
}

function readArea(info) {
  const size = info && Array.isArray(info.size) ? info.size : [1, 1];
  const halfX = Math.abs(Number(size[0])) || 1;
  const halfZ = Math.abs(Number(size[1])) || 1;
  const boxes = info && Array.isArray(info.boxes) ? info.boxes : [];
  return { halfX, halfZ, boxes };
}

// Encaixa o mapa inteiro na tela do tablet. O pixel do clique continua em eventToWorld.
function layoutCanvas(canvas, halfX, halfZ) {
  const viewW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const outer = Math.min(460, Math.max(0, viewW - 32));
  const maxW = Math.max(96, outer - 30);
  const maxH = Math.max(110, Math.min(300, Math.floor(viewH * 0.38)));
  const worldW = halfX * 2;
  const worldH = halfZ * 2;
  let cssW = maxW;
  let cssH = cssW * (worldH / worldW);
  if (cssH > maxH) {
    cssH = maxH;
    cssW = cssH * (worldW / worldH);
  }
  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
}

function worldToPx(x, z, width, height, halfX, halfZ) {
  return [
    ((x + halfX) / (halfX * 2)) * width,
    ((halfZ - z) / (halfZ * 2)) * height,
  ];
}

function eventToWorld(event, canvas, halfX, halfZ) {
  const rect = canvas.getBoundingClientRect();
  if (!(rect.width > 0) || !(rect.height > 0) || !(canvas.width > 0) || !(canvas.height > 0)) return null;
  const px = Math.min(canvas.width, Math.max(0, (event.clientX - rect.left) * (canvas.width / rect.width)));
  const py = Math.min(canvas.height, Math.max(0, (event.clientY - rect.top) * (canvas.height / rect.height)));
  return {
    x: (px / canvas.width) * (halfX * 2) - halfX,
    z: halfZ - (py / canvas.height) * (halfZ * 2),
  };
}

function boxFootprint(box) {
  if (!box || !Array.isArray(box.b) || box.b.length < 6) return null;
  const x0 = Number(box.b[0]);
  const z0 = Number(box.b[2]);
  const x1 = Number(box.b[3]);
  const z1 = Number(box.b[5]);
  if (![x0, z0, x1, z1].every(Number.isFinite)) return null;
  if (Math.abs(x1 - x0) < 0.01 || Math.abs(z1 - z0) < 0.01) return null;
  const color = typeof box.c === 'string' && box.c.charAt(0) === '#' ? box.c : '#8b5a2b';
  return { x0, z0, x1, z1, color };
}

function drawX(ctx, px, py, size, width, color) {
  ctx.beginPath();
  ctx.moveTo(px - size, py - size);
  ctx.lineTo(px + size, py + size);
  ctx.moveTo(px + size, py - size);
  ctx.lineTo(px - size, py + size);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function paint() {
  if (!strike) return;
  const canvas = mapCanvas();
  if (!canvas) return;
  layoutCanvas(canvas, strike.halfX, strike.halfZ);
  const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
  if (!ctx) return;
  const { width, height } = canvas;
  const { halfX, halfZ, boxes, points } = strike;
  const scale = width / Math.max(1, parseFloat(canvas.style.width) || width);

  ctx.fillStyle = '#6fb852';
  ctx.fillRect(0, 0, width, height);
  const step = 4;
  for (let x = -halfX; x < halfX; x += step) {
    for (let z = -halfZ; z < halfZ; z += step) {
      const alt = (Math.floor((x + halfX) / step) + Math.floor((z + halfZ) / step)) % 2 === 0;
      ctx.fillStyle = alt ? '#8ed36a' : '#7cc95a';
      const [left, top] = worldToPx(x, z + step, width, height, halfX, halfZ);
      const [right, bottom] = worldToPx(x + step, z, width, height, halfX, halfZ);
      ctx.fillRect(left, top, right - left, bottom - top);
    }
  }

  const shade = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.15, width / 2, height / 2, Math.max(width, height) * 0.72);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(18,36,8,.38)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);

  for (const box of boxes) {
    const foot = boxFootprint(box);
    if (!foot) continue;
    const [left, top] = worldToPx(Math.min(foot.x0, foot.x1), Math.max(foot.z0, foot.z1), width, height, halfX, halfZ);
    const [right, bottom] = worldToPx(Math.max(foot.x0, foot.x1), Math.min(foot.z0, foot.z1), width, height, halfX, halfZ);
    ctx.fillStyle = foot.color;
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.strokeStyle = '#2a1410';
    ctx.lineWidth = Math.max(1, scale);
    ctx.strokeRect(left, top, right - left, bottom - top);
  }

  ctx.strokeStyle = '#2a1410';
  ctx.lineWidth = 5 * scale;
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);

  for (const point of points) {
    const [px, py] = worldToPx(point.x, point.z, width, height, halfX, halfZ);
    drawX(ctx, px, py, 12 * scale, 7 * scale, '#2a1410');
    drawX(ctx, px, py, 12 * scale, 4 * scale, '#e63946');
  }
}

function finishStrike() {
  const done = strike;
  const spots = done.points.slice(0, 3).map((point) => ({ x: point.x, z: point.z }));
  strike = null;
  const map = byId('strikeMap');
  if (map) map.hidden = true;
  done.resolve(spots);
}

function onCanvasClick(event) {
  if (!strike) return;
  event.preventDefault();
  event.stopPropagation();
  const point = eventToWorld(event, event.currentTarget, strike.halfX, strike.halfZ);
  if (!point) return;
  strike.points.push(point);
  const left = byId('strikeMap').querySelector('.strike-left');
  if (left) left.textContent = strike.points.length + '/3';
  paint();
  if (strike && strike.points.length >= 3) finishStrike();
}

function bindMap() {
  if (listening) return;
  const canvas = mapCanvas();
  if (!canvas) return;
  listening = true;
  canvas.addEventListener('mousedown', (event) => {
    if (!strike) return;
    event.preventDefault();
    event.stopPropagation();
  });
  canvas.addEventListener('click', onCanvasClick);
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      if (strike) paint();
    });
  }
}

export function mountStreakUi() {
  ensureDom();
}

export function setStreakCount(n) {
  const value = Number(n);
  currentCount = Number.isFinite(value) ? value : 0;
  ensureDom();
}

export function setStreakCycle(cycle) {
  const value = Number(cycle);
  currentCycle = Number.isFinite(value) ? value : 0;
  ensureDom();
}

export function setStreakReady(ids) {
  currentReady = Array.isArray(ids) ? ids.slice() : [];
  ensureDom();
}

export function openStrikeMap(info) {
  if (strike) return;
  if (!ensureDom()) return Promise.reject(new Error('cancelado'));
  const area = readArea(info);
  const map = byId('strikeMap');
  const left = map.querySelector('.strike-left');
  if (left) left.textContent = '0/3';
  return new Promise((resolve, reject) => {
    strike = { resolve, reject, points: [], halfX: area.halfX, halfZ: area.halfZ, boxes: area.boxes };
    map.hidden = false;
    paint();
  });
}

export function closeStrikeMap() {
  const pending = strike;
  strike = null;
  if (hasDom()) {
    const map = byId('strikeMap');
    if (map) map.hidden = true;
  }
  if (pending) pending.reject(new Error('cancelado'));
}

export function showNukeCount(seconds) {
  if (!ensureDom()) return;
  const banner = byId('nukeBanner');
  const num = banner.querySelector('b');
  const n = Math.round(Number(seconds));
  if (num) num.textContent = Number.isFinite(n) ? String(n) : '0';
  banner.hidden = false; // todo mundo, inclusive quem chamou
}

export function hideNuke() {
  if (!hasDom()) return;
  const banner = byId('nukeBanner');
  if (banner) banner.hidden = true;
}

export function showNukeReady() {
  if (!ensureDom()) return;
  const node = byId('nukeReady');
  if (node) node.hidden = false;
}

export function hideNukeReady() {
  if (!hasDom()) return;
  const node = byId('nukeReady');
  if (node) node.hidden = true;
}
