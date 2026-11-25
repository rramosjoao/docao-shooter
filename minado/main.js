// Docão Minado na quermesse. As regras ficam em rules.js.
import { BOMBS, SIZES, SHAPES, createGame, openCell, toggleFlag } from './rules.js';

const $ = (id) => document.getElementById(id);
const KEY = 'docao.minado';

const ICONS = {
  botijao: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="13" y="4" width="6" height="4" rx="1" fill="#5d6b63"/><rect x="10" y="8" width="12" height="18" rx="3" fill="#3f8f55"/><rect x="10" y="14" width="12" height="3" fill="#d8eccf"/></svg>',
  copo: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 7h14l-2 18a3 3 0 0 1-3 2h-4a3 3 0 0 1-3-2z" fill="#c43a2e"/><rect x="9" y="12" width="13" height="3" fill="#f6e4bd"/></svg>',
  granada: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="18" r="8" fill="#3d6b3a"/><rect x="14" y="6" width="4" height="5" fill="#c9a36a"/><path d="M18 8h6" stroke="#5a4632" stroke-width="2"/></svg>',
  choque: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M18 3 12 16h6L13 29 24 13h-6z" fill="#f2d24b" stroke="#8a6a12" stroke-width="1"/></svg>',
  ovo: '<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="18" rx="8" ry="10" fill="#f7f1e4" stroke="#d9c7a2"/><path d="M12 16l4 3-2 4" fill="none" stroke="#c9b48a" stroke-width="1.5"/></svg>',
};

let game = null;
let markMode = false;
let cursor = -1;
let started = 0;
let clock = 0;
let audio = null;
let suppressClick = false;
let choice = loadChoice();

function loadChoice() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { saved = {}; }
  const bombId = BOMBS.some((b) => b.id === saved.bombId) ? saved.bombId : BOMBS[0].id;
  const sizeId = SIZES.some((s) => s.id === saved.sizeId) ? saved.sizeId : SIZES[0].id;
  const shapeId = SHAPES.some((s) => s.id === saved.shapeId) ? saved.shapeId : SHAPES[0].id;
  return { bombId, sizeId, shapeId };
}

function saveChoice() {
  try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch { /* sem storage */ }
}

function selected(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function readChoice() {
  choice = {
    bombId: selected('bomba') || choice.bombId,
    sizeId: selected('tamanho') || choice.sizeId,
    shapeId: selected('formato') || choice.shapeId,
  };
  saveChoice();
}

function picks(box, name, items, current, shape) {
  box.innerHTML = '';
  for (const item of items) {
    const label = document.createElement('label');
    label.className = 'pick';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = item.id;
    input.checked = item.id === current;
    label.appendChild(input);
    if (shape) {
      const from = document.createElement('span');
      from.className = 'pick-from';
      from.textContent = item.from;
      label.appendChild(from);
    }
    const title = document.createElement('span');
    title.className = 'pick-name';
    title.textContent = item.name;
    const note = document.createElement('span');
    note.className = 'pick-note';
    note.textContent = item.blurb;
    label.append(title, note);
    box.appendChild(label);
  }
  box.addEventListener('change', () => { readChoice(); drawPreview(); });
}

function drawPreview() {
  const size = SIZES.find((s) => s.id === choice.sizeId);
  const shape = SHAPES.find((s) => s.id === choice.shapeId);
  const bomb = BOMBS.find((b) => b.id === choice.bombId);
  const box = $('preview');
  box.style.gridTemplateColumns = `repeat(${size.cols}, 1fr)`;
  box.style.aspectRatio = `${size.cols} / ${size.rows}`;
  box.replaceChildren();
  const frag = document.createDocumentFragment();
  for (let r = 0; r < size.rows; r++) {
    for (let c = 0; c < size.cols; c++) {
      const cell = document.createElement('i');
      if (shape.cell(c, r, size.cols, size.rows)) cell.className = 'on';
      frag.appendChild(cell);
    }
  }
  box.appendChild(frag);
  $('preview-nome').textContent = `${bomb.name} · ${size.name} · ${shape.name} (${shape.from})`;
}

function seedFromUrl() {
  const n = Number(new URLSearchParams(location.search).get('seed'));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : (Date.now() % 1000000000);
}

function fitCell() {
  const w = Math.floor((window.innerWidth - 36) / game.cols) - 2;
  const h = Math.floor((window.innerHeight - 132) / game.rows) - 2;
  return Math.max(14, Math.min(40, w, h));
}

function paintClock() {
  const s = started ? Math.min(999, Math.floor((performance.now() - started) / 1000)) : 0;
  $('tempo').textContent = String(s).padStart(3, '0');
}

function stopClock() {
  clearInterval(clock);
  clock = 0;
}

function startClock() {
  if (started) return;
  started = performance.now();
  paintClock();
  clock = setInterval(paintClock, 250);
}

function bombOf() {
  return BOMBS.find((b) => b.id === game.bombId);
}

function paintHud() {
  const left = game.mines - game.flags;
  $('contador').textContent = String(Math.max(-99, left)).padStart(3, '0');
  const shape = SHAPES.find((s) => s.id === game.shapeId);
  const size = SIZES.find((s) => s.id === game.sizeId);
  $('miolo').textContent = `${bombOf().name} · ${size.name} · ${shape.name}`;
  $('cara').textContent = game.status === 'lost' ? '😵' : game.status === 'won' ? '😎' : '🐽';
}

function cellClass(i) {
  if (game.status === 'lost') {
    if (game.mine[i] && i === game.hit) return 'cell boom';
    if (game.mine[i] && game.state[i] === 2) return 'cell flag';
    if (game.mine[i]) return 'cell open';
    if (game.state[i] === 2) return 'cell bad-flag';
  }
  if (game.status === 'won' && game.mine[i]) return 'cell flag';
  if (game.state[i] === 2) return 'cell flag';
  if (game.state[i] === 1) return 'cell open n' + game.adj[i];
  return 'cell hidden';
}

function paintCell(btn, i) {
  const cls = cellClass(i);
  btn.className = cls + (i === cursor ? ' cursor' : '');
  const showMine = game.mine[i] && (cls.includes('boom') || cls === 'cell open');
  if (showMine) btn.innerHTML = ICONS[game.bombId];
  else if (cls === 'cell bad-flag') btn.textContent = '✕';
  else if (game.state[i] === 1 && !game.mine[i] && game.adj[i] > 0) btn.textContent = String(game.adj[i]);
  else btn.textContent = '';
  const shape = SHAPES.find((s) => s.id === game.shapeId);
  const where = `linha ${((i / game.cols) | 0) + 1}, coluna ${(i % game.cols) + 1}`;
  btn.setAttribute('aria-label', cls.includes('flag') ? `bandeirinha, ${where}` : game.state[i] === 1 && !game.mine[i] ? (game.adj[i] ? `${game.adj[i]} por perto, ${where}` : `limpo, ${where}`) : `fechado, ${where}, ${shape.name}`);
}

function paint() {
  const board = $('tabuleiro');
  const buttons = board.querySelectorAll('[data-i]');
  buttons.forEach((btn) => paintCell(btn, Number(btn.dataset.i)));
  paintHud();
}

function buildBoard() {
  const board = $('tabuleiro');
  board.style.setProperty('--cell', fitCell() + 'px');
  board.style.gridTemplateColumns = `repeat(${game.cols}, var(--cell))`;
  board.replaceChildren();
  const frag = document.createDocumentFragment();
  for (let i = 0; i < game.playable.length; i++) {
    if (!game.playable[i]) {
      const gap = document.createElement('span');
      gap.className = 'gap';
      frag.appendChild(gap);
      continue;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.i = String(i);
    frag.appendChild(btn);
  }
  board.appendChild(frag);
  cursor = [...game.playable].findIndex((v) => v);
  paint();
}

function endOverlays(show) {
  $('derrota').hidden = show !== 'lost';
  $('vitoria').hidden = show !== 'won';
  if (show === 'lost') $('derrotaQual').textContent = `Era um ${bombOf().name}.`;
  if (show === 'won') $('vitoriaQual').textContent = `Nenhum ${bombOf().name} sobrou.`;
}

function afterMove() {
  paint();
  if (game.status === 'lost' || game.status === 'won') {
    stopClock();
    paintClock();
    sound(game.status);
    endOverlays(game.status);
  }
}

function doOpen(i) {
  if (!game || game.playable[i] === 0) return;
  const before = game.status;
  openCell(game, i);
  if (before === 'ready' && game.placed) startClock();
  afterMove();
}

function doFlag(i) {
  if (!game) return;
  if (toggleFlag(game, i)) {
    sound('flag');
    paint();
  }
}

function startGame() {
  readChoice();
  stopClock();
  started = 0;
  markMode = false;
  $('marcar').setAttribute('aria-pressed', 'false');
  game = createGame({ ...choice, seed: seedFromUrl() });
  $('lobby').hidden = true;
  $('mesa').hidden = false;
  endOverlays(null);
  buildBoard();
  paintClock();
}

function backToLobby() {
  stopClock();
  $('mesa').hidden = true;
  endOverlays(null);
  $('lobby').hidden = false;
  drawPreview();
}

function sound(kind) {
  try {
    audio = audio || new AudioContext();
    audio.resume();
    const now = audio.currentTime;
    const tone = (freq, at, dur, type, gain) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain, now + at);
      g.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
      o.connect(g);
      g.connect(audio.destination);
      o.start(now + at);
      o.stop(now + at + dur);
    };
    if (kind === 'flag') tone(520, 0, 0.06, 'square', 0.03);
    else if (kind === 'won') {
      tone(523, 0, 0.12, 'triangle', 0.05);
      tone(659, 0.1, 0.12, 'triangle', 0.05);
      tone(784, 0.2, 0.18, 'triangle', 0.05);
    } else if (kind === 'lost') {
      tone(140, 0, 0.28, 'sawtooth', 0.04);
      tone(90, 0.12, 0.3, 'triangle', 0.04);
    }
  } catch { /* sem áudio */ }
}

function stepCursor(dc, dr) {
  if (cursor < 0) return;
  const cols = game.cols;
  let x = cursor % cols;
  let y = (cursor / cols) | 0;
  for (let n = 0; n < Math.max(cols, game.rows); n++) {
    x = Math.max(0, Math.min(cols - 1, x + dc));
    y = Math.max(0, Math.min(game.rows - 1, y + dr));
    const i = y * cols + x;
    if (game.playable[i]) { cursor = i; paint(); return; }
  }
}

function wire() {
  picks($('bombas'), 'bomba', BOMBS, choice.bombId, false);
  picks($('tamanhos'), 'tamanho', SIZES, choice.sizeId, false);
  picks($('formatos'), 'formato', SHAPES, choice.shapeId, true);
  drawPreview();

  $('comanda').addEventListener('submit', (ev) => { ev.preventDefault(); startGame(); });
  $('cara').addEventListener('click', startGame);
  $('marcar').addEventListener('click', () => {
    markMode = !markMode;
    $('marcar').setAttribute('aria-pressed', markMode ? 'true' : 'false');
  });
  for (const id of ['derrota-de-novo', 'vitoria-de-novo']) $(id).addEventListener('click', startGame);
  for (const id of ['derrota-outro', 'vitoria-outro']) $(id).addEventListener('click', backToLobby);

  const board = $('tabuleiro');
  board.addEventListener('pointerdown', (ev) => {
    if (ev.button === 2) return;
    const btn = ev.target.closest('[data-i]');
    if (!btn) return;
    const i = Number(btn.dataset.i);
    btn._hold = setTimeout(() => { suppressClick = true; doFlag(i); }, 420);
  });
  board.addEventListener('pointerup', (ev) => {
    const btn = ev.target.closest('[data-i]');
    if (btn && btn._hold) clearTimeout(btn._hold);
  });
  board.addEventListener('pointerleave', (ev) => {
    const btn = ev.target.closest && ev.target.closest('[data-i]');
    if (btn && btn._hold) clearTimeout(btn._hold);
  });
  board.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-i]');
    if (!btn) return;
    if (suppressClick) { suppressClick = false; return; }
    const i = Number(btn.dataset.i);
    cursor = i;
    if (markMode) doFlag(i);
    else doOpen(i);
  });
  board.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    suppressClick = true;
    const btn = ev.target.closest('[data-i]');
    if (!btn) return;
    if (btn._hold) clearTimeout(btn._hold);
    doFlag(Number(btn.dataset.i));
  });
  window.addEventListener('resize', () => {
    if (game && !$('mesa').hidden) board.style.setProperty('--cell', fitCell() + 'px');
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
    if (!$('derrota').hidden || !$('vitoria').hidden || $('mesa').hidden || !game) return;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); stepCursor(-1, 0); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); stepCursor(1, 0); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); stepCursor(0, -1); }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); stepCursor(0, 1); }
    else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); doOpen(cursor); }
    else if (ev.key === 'f' || ev.key === 'F') { ev.preventDefault(); doFlag(cursor); }
  });
}

wire();
