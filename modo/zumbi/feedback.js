// HUD de acerto, pontos e medalhas. Módulo solto: não importa o jogo.

let points = 0;
let firstBlood = false;
let streakCount = 0;
let lastKillAt = 0;
let revenge = false;
let hitTimer = 0;
let streakTimer = 0;
const pending = new Set();

const STREAK_MS = 5000; // abates seguidos: cada um reinicia esses 5 segundos (estilo Combat Arms)
const HIT_MS = 140;
const POP_MS = 800;
const MEDAL_MS = 2600;
const MEDAL_CAP = 4;

function $(id) {
  if (typeof document === 'undefined' || !document.getElementById) return null;
  return document.getElementById(id);
}

function now() {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now();
}

function later(fn, ms) {
  const id = setTimeout(() => {
    pending.delete(id);
    fn();
  }, ms);
  pending.add(id);
  return id;
}

function clearPending() {
  for (const id of pending) clearTimeout(id);
  pending.clear();
  if (hitTimer) {
    clearTimeout(hitTimer);
    hitTimer = 0;
  }
  if (streakTimer) {
    clearTimeout(streakTimer);
    streakTimer = 0;
  }
}

function empty(id) {
  const node = $(id);
  if (!node) return;
  if (typeof node.replaceChildren === 'function') node.replaceChildren();
  else while (node.firstChild) node.removeChild(node.firstChild);
}

export function resetFeedback() {
  points = 0;
  firstBlood = false;
  streakCount = 0;
  lastKillAt = 0;
  revenge = false;
  clearPending();
  empty('medals');
  empty('points');
  const streak = $('streak');
  if (streak) {
    streak.className = '';
    if (streak.replaceChildren) streak.replaceChildren();
  }
  const hit = $('hitmarker');
  if (hit) {
    hit.className = '';
    if (hit.style) hit.style.opacity = '';
  }
}

export function feedbackPoints() {
  return points;
}

function showHit(kill, head, wall = false) {
  const el = $('hitmarker');
  if (!el || !el.classList) return;
  if (hitTimer) {
    clearTimeout(hitTimer);
    pending.delete(hitTimer);
    hitTimer = 0;
  }
  el.className = '';
  void el.offsetWidth;
  el.classList.add('show');
  if (kill) el.classList.add('kill');
  if (head) el.classList.add('head');
  if (wall) el.classList.add('wall'); // acerto pela parede: hitmarker laranja
  if (el.style) el.style.opacity = '1';
  hitTimer = later(() => {
    el.classList.remove('show');
    if (el.style) el.style.opacity = '';
    hitTimer = 0;
  }, HIT_MS);
}

function popPoints(amount, extra) {
  const box = $('points');
  if (!box || typeof document === 'undefined') return;
  const node = document.createElement('div');
  node.className = 'pop' + (extra ? ' ' + extra : '');
  node.textContent = '+' + amount;
  box.appendChild(node);
  later(() => node.remove(), POP_MS);
}

const STREAKS = {
  2: { title: 'Dupla na chapa', sub: 'dois seguidos' },
  3: { title: 'Trio frito', sub: 'três seguidos' },
  4: { title: 'Ultra na brasa', sub: 'quatro seguidos' },
  5: { title: 'Fantástico', sub: 'show de torresmo' },
  6: { title: 'Incrível', sub: 'a granja inteira' },
};

function showStreak(n) {
  const el = $('streak');
  if (!el) return;
  const tier = STREAKS[Math.min(n, 6)];
  if (streakTimer) {
    clearTimeout(streakTimer);
    pending.delete(streakTimer);
    streakTimer = 0;
  }
  el.className = 's' + Math.min(n, 6);
  if (el.replaceChildren) el.replaceChildren();
  else while (el.firstChild) el.removeChild(el.firstChild);
  const title = document.createElement('b');
  title.textContent = tier.title;
  const sub = document.createElement('small');
  sub.textContent = n > 6 ? n + ' seguidos' : tier.sub;
  el.append(title, sub);
  void el.offsetWidth;
  el.classList.add('show');
  streakTimer = later(() => {
    el.className = '';
    if (el.replaceChildren) el.replaceChildren();
    streakTimer = 0;
  }, 1600);
}

function pushMedal(title, sub) {
  const box = $('medals');
  if (!box || typeof document === 'undefined') return;
  while (box.children.length >= MEDAL_CAP && box.firstElementChild) box.firstElementChild.remove();
  const card = document.createElement('div');
  card.className = 'medal';
  const titleEl = document.createElement('b');
  titleEl.textContent = title;
  const subEl = document.createElement('small');
  subEl.textContent = sub;
  card.append(titleEl, subEl);
  box.appendChild(card);
  later(() => card.remove(), MEDAL_MS);
}

// pontos de abate que não contam na sequência (o helicóptero, por exemplo)
export function feedbackAward(amount) {
  const n = Math.max(0, Math.round(amount) || 0);
  if (!n) return;
  points += n;
  popPoints(n, 'kill');
}

// medalha avulsa (Collateral: várias mortes numa bala só)
export function feedbackMedal(title, sub) {
  points += 50;
  pushMedal(title, sub);
}

export function feedbackHit(info) {
  const head = !!(info && info.head);
  const wall = !!(info && info.wall);
  points += 10;
  showHit(false, head, wall);
  popPoints(10, head ? 'head' : '');
}

export function feedbackKill(info) {
  const head = !!(info && info.head);
  const dist = info ? info.dist : undefined;
  const isRevenge = !!(info && info.revenge);
  const wall = !!(info && info.wall);
  points += head ? 150 : 100;
  revenge = isRevenge;
  showHit(true, head, wall);
  popPoints(head ? 150 : 100, head ? 'kill head' : 'kill');

  const seen = new Set();
  const award = (title, sub) => {
    if (seen.has(title)) return;
    seen.add(title);
    pushMedal(title, sub);
  };

  if (!firstBlood) {
    firstBlood = true;
    award('Primeiro torresmo', 'o café da manhã foi servido');
  }
  if (head) award('No focinho', 'direto na cabeça');
  if (typeof dist === 'number' && Number.isFinite(dist) && dist >= 35) award('Do telhado', 'de bem longe');
  if (typeof dist === 'number' && Number.isFinite(dist) && dist <= 5) award('Na brasa', 'quase encostado');
  if (isRevenge) award('Devolução', 'olho por olho');
  if (wall) award('Pela parede', 'atravessou a parede');

  const t = now();
  streakCount = lastKillAt && t - lastKillAt <= STREAK_MS ? streakCount + 1 : 1;
  lastKillAt = t;
  if (streakCount >= 2) showStreak(streakCount);
  return streakCount;
}

export function tickFeedback(dt) {
  void dt;
}
