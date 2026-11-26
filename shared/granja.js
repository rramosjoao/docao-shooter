// ============================================================
//  Pistoleiro da Granja — circuito solo da Carabina da Granja.
//  O nome do mapa mora só em GRANJA_TITLE.
//
//  Inspiração (sem copiar asset): o Pit do CoD4 (seções cronometradas,
//  shoot/no-shoot, recarga entre salas), kill house / shoothouse (corredor
//  curto, alvo perto, refém) e as pistas de bolt-action / quickscope
//  (pente de 5, placa longe na luneta, alvo em trilho).
//
//  Conta do chão, com a corrida de shared/rules.js (SPEED) e a Carabina
//  de verdade (não uma cópia dos números):
//    recarga 2,9 s × SPEED 6,8 m/s = 19,72 m.
//    Cada trecho entre seções tem 20,00 m no plano, ou a rampa
//    hypot(20, 4) = 20,40 m. Correndo sem luneta, o ferrolho acaba
//    no fim do trecho (20 / 6,8 = 2,94 s; a rampa, 3,00 s).
//    Uma seção de 5 tiros: 4 intervalos de 0,58 s + a luneta abrindo
//    (adsIn × scopeAt ≈ 0,186 s) = 2,51 s. 2,51 × 6,8 = 17,04 m.
//    As seções de tiro têm 18 m (2,65 s), acima dessa cadeia.
//  O piso do ranking fica bem abaixo dessa corrida perfeita, no mesmo
//  espírito do rankMin 10 da Pocilga (PRs #104 e #105).
// ============================================================
import { SPEED, WEAPONS } from './rules.js';
import { BOARD, rayAabb, formatPit, suggestion } from './pocilga.js';
import { BONUS_CUT, bonusShape, readBonus } from './granja-bonus.js';

export const GRANJA_TITLE = 'Pistoleiro da Granja';
export const MAP = 'granja';

const GUN = WEAPONS.find((w) => w.key === 'carabina');
const GUN_IDX = WEAPONS.findIndex((w) => w.key === 'carabina');
const ROUND = (n) => Math.round(n * 1000) / 1000;

// 20 m no plano: um pouco acima de SPEED * reload (19,72 m).
export const LINK_M = 20;
export const RAMP_RISE = 4;
export const RAMP_M = ROUND(Math.hypot(LINK_M, RAMP_RISE));
export const SECTION_M = 18;
// Cadeia mínima de um pente: o primeiro tiro espera a luneta, os outros o ferrolho.
export const BOLT_CHAIN = ROUND((GUN.mag - 1) * GUN.rate + GUN.adsIn * GUN.scopeAt);
export const BOLT_M = ROUND(BOLT_CHAIN * SPEED);
export const RELOAD_M = ROUND(SPEED * GUN.reload);

// Quickscope: luneta já aberta (o cliente manda o tempo desde o overlay)
// e o tiro sai em até 0,35 s. O raio do acerto é conferido; o tempo de
// luneta entra no diário, como o resto do relógio. Corte pequeno, com teto.
export const QS_MAX = 0.35;
export const QS_MIN = 0.02;
export const QS_CUT = 0.1;
export const QS_CAP = 1.5;

const faceYaw = (face) => {
  if (face === 'x') return Math.PI / 2;
  if (face === '-x') return -Math.PI / 2;
  if (face === 1) return 0;
  return Math.PI;
};

export const GRANJA = {
  mode: 'pocilga',
  map: MAP,
  title: GRANJA_TITLE,
  localKey: 'docao.granja.best',
  gun: GUN,
  pistol: GUN_IDX,
  weapon: GUN_IDX,
  knife: null,
  infiniteReserve: true,
  civPenalty: 3,
  bonusCut: BONUS_CUT,
  qsCut: QS_CUT,
  qsCap: QS_CAP,
  qsMax: QS_MAX,
  // Corrida perfeita ≈ 31,6 s só de deslocamento (ver perfectClock).
  // 3 estrelas em 50 s deixa folga pra mirar andando. 2 estrelas em 64 s,
  // +14 s como a Pocilga (52 → 66). Piso 16 s: metade do modelo, só pega
  // relógio impossível.
  rankMin: 16,
  star3: 50,
  star2: 64,
  sprint: 1,
  rise: 0.18,
  lead: 12,
  spawn: [-158, 0],
  spawnYaw: -Math.PI / 2,
  tower: { x: -156.2, z: -6.4, y: 0 },
  lines: [
    'Carabina da Granja. Cinco no pente: recarrega andando entre as seções.',
    'Placa do Barriguinha cai. Azul, sem arma: é civil e soma tempo.',
    'Luneta e tiro rápido contam um descontinho. No curral, de perto, pode ir sem mirar.',
    'No campo a placa é grande de propósito. Cabe na luneta.',
  ],
  hudIdle: 'Carabina · cinco no pente',
  leadIdle: 'Barriguinha na placa cai. Azul é civil. Recarrega no caminho.',
  // Campo olha para +x, com o z entre 19 e 33. Tudo que é parede fica
  // em z ≥ 40 ou atrás da sacada, pra não comer o tiro longo.
  path: [
    { x: -158, z: 0, y: 0 },
    { x: -152, z: 0, y: 0, approach: true },
    { x: -132, z: 0, y: 0, section: 'celeiro' },
    { x: -132, z: 20, y: 0, link: 'norte' },
    { x: -132, z: 38, y: 0, section: 'campo' },
    { x: -132, z: 58, y: 0, link: 'fundo' },
    { x: -114, z: 58, y: 0, section: 'curral' },
    { x: -94, z: 58, y: RAMP_RISE, link: 'sobe' },
    { x: -76, z: 58, y: RAMP_RISE, section: 'varal' },
    { x: -56, z: 58, y: 0, link: 'desce' },
    { x: -56, z: 40, y: 0, section: 'silo' },
    { x: -36, z: 40, y: 0, link: 'eixo' },
    { x: -18, z: 40, y: 0, section: 'tulha' },
    { x: -12, z: 40, y: 0, finish: true },
  ],
  gates: [
    { id: 'start', x: -152, z: 0, y: 0, x0: -152.7, x1: -151.3, z0: -6.2, z1: 6.2, pop: 'celeiro' },
    { id: 'campo', x: -132, z: 20.4, y: 0, x0: -134.2, x1: -129.6, z0: 19.7, z1: 21.2, pop: 'campo', say: 'Campo aberto!' },
    { id: 'curral', x: -131.4, z: 58, y: 0, x0: -132.2, x1: -130.6, z0: 56.9, z1: 59.1, pop: 'curral', say: 'Curral apertado!' },
    { id: 'varal', x: -93.6, z: 58, y: RAMP_RISE, x0: -94.4, x1: -92.8, z0: 56.6, z1: 59.4, pop: 'varal', say: 'Eles se mexem!' },
    { id: 'silo', x: -56, z: 56.2, y: 0, x0: -57.6, x1: -54.4, z0: 55.4, z1: 57, pop: 'silo' },
    { id: 'tulha', x: -35.6, z: 40, y: 0, x0: -36.4, x1: -34.8, z0: 37.6, z1: 42.4, pop: 'tulha' },
  ],
  bays: [
    { id: 'celeiro', targets: [
      { id: 's1a', kind: 'enemy', name: 'Barriguinha da porteira', x: -146, z: -4.4, y: 0, face: '-x' },
      { id: 's1b', kind: 'enemy', name: 'Barriguinha do feno', x: -142, z: 4.6, y: 2.35, face: '-x' },
      { id: 's1c', kind: 'enemy', name: 'Barriguinha do trilho', x: -138.2, z: 0.2, y: 0, face: '-x', move: { axis: 'z', min: -1.6, max: 2.2, speed: 1.15, phase: 0.4 } },
      { id: 's1d', kind: 'enemy', name: 'Barriguinha do beiral', x: -135.4, z: -4.8, y: 1.35, face: '-x' },
      { id: 's1e', kind: 'enemy', name: 'Barriguinha da saída', x: -133.5, z: 3.5, y: 0, face: '-x' },
    ] },
    { id: 'campo', targets: [
      // Placa alta o bastante pra ~2,4° na luneta (adsFov 24). scale = (dist * 0,042) / BOARD.h.
      { id: 's2a', kind: 'enemy', name: 'Barriguinha da cerca', x: -46, z: 22, y: 0.4, face: '-x', scale: 1.95, far: true },
      { id: 's2b', kind: 'enemy', name: 'Barriguinha do pasto', x: -18, z: 30, y: 1.7, face: '-x', scale: 2.55, far: true },
      { id: 's2c', kind: 'enemy', name: 'Barriguinha do milho', x: -4, z: 19, y: 0.35, face: '-x', scale: 2.9, far: true },
      { id: 's2d', kind: 'enemy', name: 'Barriguinha do horizonte', x: 10, z: 33, y: 2.1, face: '-x', scale: 3.22, far: true },
      { id: 's2e', kind: 'enemy', name: 'Barriguinha que cruza o pasto', x: -34, z: 26, y: 1.05, face: '-x', scale: 2.25, far: true, move: { axis: 'z', min: 23.2, max: 29.4, speed: 0.42, phase: 0.2 } },
    ] },
    { id: 'curral', targets: [
      // Perto, no corredor de 1,7 m. A face larga olha pra quem anda.
      // spread 0,09 da ficha, a ~2,8 m, abre ~0,25 m. A Carabina na prática
      // usa sniperSpread: 0,10 parado e 0,15 andando, ~0,42 m a 2,8 m.
      // A meia-largura da placa (0,525 m) cobre esse cone se a mira está no centro.
      { id: 's3a', kind: 'enemy', name: 'Barriguinha da entrada', x: -128.6, z: 57.66, y: 0, face: '-x', close: true },
      { id: 's3b', kind: 'enemy', name: 'Barriguinha da esquerda', x: -125.4, z: 58.34, y: 0, face: '-x', close: true },
      { id: 's3c', kind: 'enemy', name: 'Barriguinha do meio', x: -122.2, z: 57.62, y: 0.15, face: '-x', close: true },
      { id: 's3d', kind: 'enemy', name: 'Barriguinha da direita', x: -119.0, z: 58.36, y: 0, face: '-x', close: true },
      { id: 's3e', kind: 'enemy', name: 'Barriguinha da boca', x: -116.0, z: 57.7, y: 0, face: '-x', close: true },
    ] },
    { id: 'varal', targets: [
      { id: 's4a', kind: 'enemy', name: 'Barriguinha do varal', x: -90.2, z: 58, y: RAMP_RISE, face: '-x', move: { axis: 'z', min: 56.9, max: 59.1, speed: 1.05, phase: 0.3 } },
      { id: 's4b', kind: 'enemy', name: 'Barriguinha do pêndulo', x: -86.6, z: 57.3, y: RAMP_RISE, face: '-x', move: { kind: 'pendulum', axis: 'z', amp: 0.5, len: 1.55, speed: 1.35, phase: 0.6 } },
      { id: 's4c', kind: 'enemy', name: 'Barriguinha que sobe', x: -83.2, z: 58.5, y: RAMP_RISE, face: '-x', move: { kind: 'bob', min: RAMP_RISE, max: RAMP_RISE + 2.1, speed: 1.2, phase: 1.1 } },
      { id: 's4d', kind: 'enemy', name: 'Barriguinha que gira', x: -79.8, z: 57.45, y: RAMP_RISE, face: '-x', move: { kind: 'spin', speed: 0.65, phase: 0.4 } },
      { id: 's4e', kind: 'enemy', name: 'Barriguinha do outro trilho', x: -77.2, z: 58.4, y: RAMP_RISE, face: '-x', move: { axis: 'z', min: 57.2, max: 59.3, speed: 1.25, phase: 1.7 } },
    ] },
    { id: 'silo', targets: [
      { id: 's5a', kind: 'enemy', name: 'Barriguinha do silo', x: -58.3, z: 54.2, y: 0, face: 1 },
      { id: 's5b', kind: 'enemy', name: 'Barriguinha do telhado', x: -53.7, z: 50.4, y: 1.85, face: 1 },
      { id: 's5c', kind: 'enemy', name: 'Barriguinha que passa', x: -57.6, z: 47.2, y: 0, face: 1, move: { axis: 'x', min: -59.1, max: -56.2, speed: 0.95, phase: 0.5 } },
      { id: 'c1', kind: 'civil', name: 'Leitão do balde', x: -53.9, z: 45.4, y: 0, face: 1 },
      { id: 's5d', kind: 'enemy', name: 'Barriguinha da sombra', x: -58.8, z: 43.6, y: 0, face: 1 },
      { id: 'c2', kind: 'civil', name: 'Porquinha da cerca', x: -53.4, z: 42.6, y: 0, face: 1 },
      { id: 's5e', kind: 'enemy', name: 'Barriguinha do moinho', x: -56.2, z: 41.15, y: 1.7, face: 1 },
    ] },
    { id: 'tulha', targets: [
      { id: 's6a', kind: 'enemy', name: 'Barriguinha da tulha', x: -32.2, z: 37.4, y: 0, face: '-x' },
      { id: 's6b', kind: 'enemy', name: 'Barriguinha do alto', x: -28.4, z: 42.5, y: 1.65, face: '-x' },
      { id: 's6c', kind: 'enemy', name: 'Barriguinha do vão', x: -24.6, z: 37.7, y: 0, face: '-x' },
      { id: 's6d', kind: 'enemy', name: 'Barriguinha da viga', x: -21.2, z: 42.2, y: 0.7, face: '-x' },
      { id: 's6e', kind: 'enemy', name: 'Barriguinha da faixa', x: -16.6, z: 39.3, y: 0, face: '-x' },
    ] },
  ],
};
export const PIT = GRANJA;

export const FINISH_LINE = { x: -12, z0: 36.4, z1: 43.6, depth: 0.7, along: 'x' };

export function pitTargets() {
  const out = [];
  for (const b of GRANJA.bays) for (const t of b.targets) out.push({ ...t, bay: b.id });
  return out;
}
export function pitTarget(id) { return pitTargets().find((t) => t.id === id) || null; }
export function pitEnemies() { return pitTargets().filter((t) => t.kind === 'enemy'); }
export function pitCivils() { return pitTargets().filter((t) => t.kind === 'civil'); }
export function pitMovers() { return pitTargets().filter((t) => t.move); }

export function poseAt(t, time) {
  const base = { x: t.x, y: t.y || 0, z: t.z, yaw: 0 };
  if (!t.move) return base;
  const m = t.move;
  const u = Math.sin((time || 0) * m.speed + (m.phase || 0));
  if (m.kind === 'bob') {
    const y = (m.min + m.max) / 2 + (m.max - m.min) / 2 * u;
    return { x: t.x, y, z: t.z, yaw: 0 };
  }
  if (m.kind === 'pendulum') {
    const ang = (m.amp || 0.5) * u;
    const L = m.len || 1.5;
    const swing = L * Math.sin(ang);
    const lift = L * (1 - Math.cos(Math.abs(ang)));
    const alongZ = m.axis === 'z';
    return {
      x: t.x + (alongZ ? 0 : swing),
      y: (t.y || 0) + lift,
      z: t.z + (alongZ ? swing : 0),
      yaw: 0,
    };
  }
  if (m.kind === 'spin') return { x: t.x, y: t.y || 0, z: t.z, yaw: (time || 0) * m.speed + (m.phase || 0) };
  const along = (m.min + m.max) / 2 + (m.max - m.min) / 2 * u;
  if (m.axis === 'y') return { x: t.x, y: along, z: t.z, yaw: 0 };
  return m.axis === 'x'
    ? { x: along, y: t.y || 0, z: t.z, yaw: 0 }
    : { x: t.x, y: t.y || 0, z: along, yaw: 0 };
}

export function moverAt(t, time) {
  return poseAt(t, time);
}

// Caixa da placa já na pose. groupY é a altura do pé da placa.
export function plateAabb(x, z, groupY, face, scale = 1, yawExtra = 0) {
  const w = BOARD.w * scale;
  const h = BOARD.h * scale;
  const d = BOARD.d;
  const yaw = faceYaw(face) + (yawExtra || 0);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const hx = w / 2, hz = d / 2;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const lx of [-hx, hx]) for (const lz of [-hz, hz]) {
    const wx = x + lx * c + lz * s;
    const wz = z - lx * s + lz * c;
    minX = Math.min(minX, wx); maxX = Math.max(maxX, wx);
    minZ = Math.min(minZ, wz); maxZ = Math.max(maxZ, wz);
  }
  const y0 = (groupY || 0) + BOARD.y;
  return { minX, maxX, minY: y0, maxY: y0 + h, minZ, maxZ };
}

export function boardAabb(t, _ground = 0, time = 0) {
  const pose = poseAt(t, time);
  return plateAabb(pose.x, pose.z, pose.y, t.face, t.scale || 1, pose.yaw);
}

export { rayAabb, formatPit, suggestion, BOARD };

function segLen(a, b) {
  return Math.hypot(b.x - a.x, (b.y || 0) - (a.y || 0), b.z - a.z);
}

export function pathParts() {
  const out = [];
  for (let i = 1; i < GRANJA.path.length; i++) {
    const a = GRANJA.path[i - 1], b = GRANJA.path[i];
    out.push({
      len: ROUND(segLen(a, b)),
      approach: !!b.approach,
      section: b.section || null,
      link: b.link || null,
      finish: !!b.finish,
      y0: a.y || 0,
      y1: b.y || 0,
    });
  }
  return out;
}

export function pathStats() {
  let run = 0;
  for (const p of pathParts()) if (!p.approach) run += p.len;
  return { run: ROUND(run), dash: 0, total: ROUND(run) };
}

export function perfectClock() {
  let move = 0, extra = 0;
  for (const p of pathParts()) {
    if (p.approach) continue;
    move += p.len;
    if (p.section) extra += Math.max(0, BOLT_CHAIN - p.len / SPEED);
    if (p.link) extra += Math.max(0, GUN.reload - p.len / SPEED);
  }
  return ROUND(move / SPEED + extra);
}

export function minPlausible() { return perfectClock(); }

export function rankFloor() {
  const hard = Number.isFinite(GRANJA.rankMin) ? GRANJA.rankMin : 16;
  return ROUND(Math.max(0, hard));
}

export function onFinishLine(pos) {
  if (!pos) return false;
  const L = FINISH_LINE;
  return pos.z >= L.z0 && pos.z <= L.z1 && Math.abs((pos.x || 0) - L.x) <= L.depth && Math.abs(pos.y || 0) < 6.2;
}

export function onSprint() { return false; }

export function inGate(pos, gate) {
  if (!pos || !gate) return false;
  if (Math.abs((pos.y || 0) - gate.y) >= 2.2) return false;
  if (gate.x0 != null) return pos.x >= gate.x0 && pos.x <= gate.x1 && pos.z >= gate.z0 && pos.z <= gate.z1;
  const dx = pos.x - gate.x, dz = pos.z - gate.z;
  return dx * dx + dz * dz <= gate.r * gate.r;
}

export function fillPops(have, bay) {
  const order = GRANJA.bays.map((b) => b.id);
  const idx = order.indexOf(bay);
  if (idx < 0) return null;
  const next = Array.isArray(have) ? have.slice() : [];
  for (let i = 0; i <= idx; i++) if (!next.includes(order[i])) next.push(order[i]);
  return next;
}

export function zombiesAwake() { return false; }

export function pitRescue(x, y, z) {
  let best = null, bd = 1e9;
  for (let i = 1; i < GRANJA.path.length; i++) {
    const a = GRANJA.path[i - 1], b = GRANJA.path[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const q = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, y: (a.y || 0) + ((b.y || 0) - (a.y || 0)) * t };
      const d = Math.hypot(q.x - x, q.z - z);
      if (d < bd) { bd = d; best = q; }
    }
  }
  if (!best || bd <= 9.2) return null;
  return best;
}

export function samplePath(step = 0.4) {
  const out = [];
  for (let i = 1; i < GRANJA.path.length; i++) {
    const a = GRANJA.path[i - 1], b = GRANJA.path[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      const t = k / n;
      out.push({
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        y: (a.y || 0) + ((b.y || 0) - (a.y || 0)) * t,
      });
    }
  }
  return out;
}

export function starsOf(final, civs, finished) {
  if (!finished) return 0;
  if (final <= GRANJA.star3 && civs === 0) return 3;
  if (final <= GRANJA.star2) return 2;
  return 1;
}

const empty = (reason) => ({
  ok: false, ranked: false, reason, started: false, finished: false,
  raw: null, penalty: 0, final: null, civs: 0, stars: 0, missed: pitEnemies().map((t) => t.id),
  down: [], pops: [], suggestion: suggestion(0), blocked3: false,
  bonus: 0, bonusZone: null, qs: 0, grabs: 0,
});

function finite(n) { return typeof n === 'number' && Number.isFinite(n); }

function shotRay(e) {
  if (![e.ox, e.oy, e.oz, e.dx, e.dy, e.dz].every(finite)) return null;
  if (e.ox < -180 || e.ox > 180 || e.oz < -80 || e.oz > 80 || e.oy < -1 || e.oy > 14) return null;
  const len = Math.hypot(e.dx, e.dy, e.dz);
  if (!(len > 1e-8)) return null;
  return { ox: e.ox, oy: e.oy, oz: e.oz, dx: e.dx / len, dy: e.dy / len, dz: e.dz / len };
}

function hitLands(t, e) {
  const ray = shotRay(e);
  if (!ray) return false;
  const pose = poseAt(t, e.t);
  const box = plateAabb(pose.x, pose.z, pose.y, t.face, t.scale || 1, pose.yaw);
  const dist = rayAabb(ray.ox, ray.oy, ray.oz, ray.dx, ray.dy, ray.dz, box, GUN.range);
  return dist != null;
}

export function inspectRun(events) {
  if (!Array.isArray(events) || events.length < 2 || events.length > 120) return empty('diário');
  const targets = new Map(pitTargets().map((t) => [t.id, t]));
  const bayOrder = GRANJA.bays.map((b) => b.id);
  let prev = -1, started = false, finishT = null;
  const pops = [], down = new Map(), civHit = new Set(), qsIds = new Set();
  for (const e of events) {
    if (!e || typeof e.k !== 'string' || typeof e.t !== 'number' || !Number.isFinite(e.t)) return empty('diário');
    if (e.t < -1e-9 || e.t > 900 || e.t + 1e-9 < prev) return empty('ordem');
    prev = e.t;
    if (e.k === 'start') {
      if (started || e.t !== 0) return empty('ordem');
      started = true;
      continue;
    }
    if (!started) return empty('ordem');
    if (e.k === 'pop') {
      if (typeof e.bay !== 'string' || !bayOrder.includes(e.bay)) return empty('diário');
      if (pops.includes(e.bay)) return empty('ordem');
      const filled = fillPops(pops, e.bay);
      pops.length = 0;
      for (const id of filled) pops.push(id);
      continue;
    }
    if (e.k === 'hit') {
      const t = targets.get(e.id);
      if (!t) return empty('diário');
      if (e.w !== GRANJA.pistol) continue;
      if (!hitLands(t, e)) continue;
      if (t.kind === 'enemy') {
        if (!down.has(t.id)) down.set(t.id, e.t);
        if (!qsIds.has(t.id) && e.ads > QS_MIN && e.ads <= QS_MAX + 1e-9) qsIds.add(t.id);
      } else civHit.add(t.id);
      continue;
    }
    if (e.k === 'finish') {
      if (finishT != null) return empty('ordem');
      if (!onFinishLine({ x: e.x, y: e.y || 0, z: e.z })) return empty('linha');
      finishT = e.t;
      continue;
    }
    if (e.k === 'bonus') {
      if (!bonusShape(e)) return empty('diário');
      continue;
    }
    return empty('diário');
  }
  const missed = pitEnemies().filter((t) => !down.has(t.id)).map((t) => t.id);
  const finished = finishT != null && missed.length === 0 && pops.length === GRANJA.bays.length;
  const civs = civHit.size;
  const penalty = civs * GRANJA.civPenalty;
  const bonus = readBonus(events, GRANJA.pistol);
  const qs = finished || down.size ? -Math.min(QS_CAP, qsIds.size * QS_CUT) : 0;
  const final = finished ? ROUND(finishT + penalty + bonus.delta + qs) : null;
  const stars = starsOf(final, civs, finished);
  const reason = !started ? 'largada' : finishT == null ? 'andamento' : missed.length ? 'alvo' : pops.length < GRANJA.bays.length ? 'sala' : 'ok';
  return {
    ok: finished, ranked: false, reason, started, finished,
    raw: finished ? finishT : null, penalty: finished ? penalty : civs * GRANJA.civPenalty,
    final, civs, grabs: 0, stars, missed, down: [...down.keys()], pops: pops.slice(),
    suggestion: suggestion(stars), blocked3: civs > 0,
    bonus: bonus.delta, bonusZone: bonus.zone, qs,
  };
}

export function rankedRun(events) {
  const run = inspectRun(events);
  if (!run.finished) return run;
  const floor = rankFloor();
  const cut = (Number.isFinite(GRANJA.bonusCut) ? GRANJA.bonusCut : 0) + (Number.isFinite(GRANJA.qsCap) ? GRANJA.qsCap : 0);
  if (!(run.raw + 1e-6 >= floor) || !(run.final + 1e-6 >= floor)) return { ...run, ranked: false, reason: 'rápido' };
  if (run.final + 1e-6 < run.raw - cut) return { ...run, ranked: false, reason: 'rápido' };
  return { ...run, ranked: true, reason: 'ok' };
}

function aimFrom(eye, t, pose) {
  const scale = t.scale || 1;
  const cy = pose.y + BOARD.y + BOARD.h * scale * 0.45;
  const dx = pose.x - eye.x, dy = cy - eye.y, dz = pose.z - eye.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  return { ox: eye.x, oy: eye.y, oz: eye.z, dx: dx / len, dy: dy / len, dz: dz / len };
}

function eyeFor(t, pose) {
  const y = Math.max(1.45, (pose.y || 0) + 1.15);
  if (t.far) return { x: -132, y: 1.62, z: pose.z };
  if (t.face === '-x') return { x: pose.x - 3.05, y, z: pose.z };
  if (t.face === 1) return { x: pose.x, y, z: pose.z + 3.05 };
  if (t.face === -1) return { x: pose.x, y, z: pose.z - 3.05 };
  return { x: pose.x - 3, y, z: pose.z };
}

export function scriptRun({ finish = 48, civs = [], skip = [], rifle = false, ads = null } = {}) {
  const events = [{ k: 'start', t: 0 }];
  let t = 0.35;
  for (const b of GRANJA.bays) {
    events.push({ k: 'pop', bay: b.id, t: ROUND(t) });
    t += 0.12;
    for (const tgt of b.targets) {
      if (tgt.kind === 'enemy' && skip.includes(tgt.id)) continue;
      if (tgt.kind === 'civil' && !civs.includes(tgt.id)) continue;
      const pose = poseAt(tgt, t);
      const ev = { k: 'hit', id: tgt.id, w: rifle ? 0 : GRANJA.pistol, t: ROUND(t), ...aimFrom(eyeFor(tgt, pose), tgt, pose) };
      if (ads != null && tgt.kind === 'enemy') ev.ads = ads;
      events.push(ev);
      t += 0.1;
    }
  }
  events.push({ k: 'finish', t: ROUND(Math.max(t, finish)), x: FINISH_LINE.x, z: (FINISH_LINE.z0 + FINISH_LINE.z1) / 2 });
  return events;
}

// Geometria. O campo entre a sacada (x=-132, z 20..38) e as placas (x até 10, z 19..33) fica vazio.
export function granjaPieces() {
  const out = [];
  const add = (x0, y0, z0, x1, y1, z1, extra) => out.push({
    b: [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)],
    ...extra,
  });
  const wall = (x0, z0, x1, z1, h = 3.2, y0 = 0, tone = 'wood') => add(x0, y0, z0, x1, y0 + h, z1, { tone });
  const slab = (x0, z0, x1, z1, y, tone = 'wood', th = 0.28) => add(x0, y - th, z0, x1, y, z1, { floor: true, tone });
  const ramp = (x0, z0, x1, z1, yLo, yHi, axis, dir) => add(x0, yLo, z0, x1, yHi, z1, { ramp: { axis, dir }, tone: 'ramp' });

  // Celeiro da largada. Aberto para +x.
  wall(-161.2, -8.2, -134.8, -7.75, 4.4, 0, 'barn');
  wall(-161.2, 7.75, -134.8, 8.2, 4.4, 0, 'barn');
  wall(-161.2, -7.75, -160.75, 7.75, 4.4, 0, 'barn');
  add(-156.4, 2.05, 5.35, -150.2, 2.28, 7.15, { floor: true, tone: 'hay' });
  add(-155.5, 0, -6.4, -153.6, 1.05, -4.5, { tone: 'hay' });
  add(-154.2, 0, 5.1, -152.4, 0.85, 6.8, { tone: 'hay' });
  // Arco da largada, fora do eixo z=0.
  wall(-152.55, -5.4, -152.1, -3.6, 3.6, 0, 'wood');
  wall(-152.55, 3.6, -152.1, 5.4, 3.6, 0, 'wood');

  // Sacada: só um guarda a oeste. O leste é o campo.
  wall(-134.35, 18.5, -133.9, 39.2, 1.15, 0, 'fence');

  // Corredor de recarga. Começa em z=1,2 pra não morder o eixo z=0 do celeiro.
  wall(-133.35, 1.2, -132.95, 18.6, 2.8, 0, 'wood');
  wall(-131.05, 1.2, -130.65, 18.6, 2.8, 0, 'wood');

  // Curral apertado em z=58. A boca em x=-132 fica aberta: a parede só fecha a partir de x=-129,6.
  // Vão interno 1,70 m (faces em ±0,85 do eixo).
  wall(-129.6, 56.75, -114.2, 57.15, 3.15, 0, 'wood');
  wall(-129.6, 58.85, -114.2, 59.25, 3.15, 0, 'wood');

  // Rampa, laje e descida. O miolo tem 3,4 m.
  ramp(-114, 56.3, -94, 59.7, 0, RAMP_RISE, 'x', 1);
  wall(-114, 55.85, -94, 56.25, RAMP_RISE + 1.3, 0, 'wood');
  wall(-114, 59.75, -94, 60.15, RAMP_RISE + 1.3, 0, 'wood');
  slab(-94, 56.15, -76, 59.85, RAMP_RISE, 'wood', 0.28);
  wall(-94, 55.85, -76, 56.2, 1.15, RAMP_RISE, 'fence');
  wall(-94, 59.8, -76, 60.15, 1.15, RAMP_RISE, 'fence');
  ramp(-76, 56.3, -56, 59.7, 0, RAMP_RISE, 'x', -1);
  wall(-76, 55.85, -57.5, 56.25, RAMP_RISE + 1.1, 0, 'wood');
  wall(-76, 59.75, -57.5, 60.15, RAMP_RISE + 1.1, 0, 'wood');

  // Silo, a leste do eixo x=-56, sem entrar no caminho.
  add(-52.6, 0, 46.2, -48.8, 8.4, 50.2, { tone: 'silo' });
  add(-51.6, 8.4, 47.2, -49.8, 9.3, 49.2, { tone: 'silo' });
  add(-59.4, 0, 44.8, -58.5, 1.0, 46.6, { tone: 'hay' });

  // Tulha. A parede sul fica em z=36,2, acima dos tiros do campo (z ≤ 33).
  wall(-38.2, 36.15, -14.2, 36.55, 3.4, 0, 'barn');
  wall(-38.2, 43.55, -14.2, 43.95, 3.4, 0, 'barn');
  wall(-38.2, 36.55, -37.8, 38.5, 3.4, 0, 'barn');
  wall(-38.2, 41.5, -37.8, 43.55, 3.4, 0, 'barn');
  add(-34.5, 0, 41.6, -32.6, 0.9, 43.1, { tone: 'hay' });
  add(-22.4, 0, 36.7, -20.6, 0.75, 38.1, { tone: 'hay' });

  // Cerca do pasto, ao sul do fan de tiro.
  wall(-120, 12.2, -40, 12.55, 1.05, 0, 'fence');
  wall(-20, 12.2, 18, 12.55, 1.05, 0, 'fence');
  add(14.6, 0, 35.2, 17.2, 0.4, 36.8, { tone: 'dirt' });
  return out;
}
