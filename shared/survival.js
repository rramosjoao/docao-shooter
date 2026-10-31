// ============================================================
//  Survival da Invasão — contrato compartilhado (sem Three.js, sem DOM).
//  O outro agente pluga o seletor, a pistola inicial, a máquina de upgrade,
//  a mystery box e as armas de parede. Esta branch entrega o mapa exclusivo
//  e as portas compráveis. Não inventar um segundo saldo: usar `ent.points`.
//
//  Como ligar o modo (qualquer um dos três vale):
//    cfg.mode = 'survival'
//    cfg.mode = 'inv' e cfg.variant = 'survival'
//    cfg.survival = true
//  Com o modo ligado, a lista de mapas é só SURVIVAL_MAPS (maps.js).
//  O mapa hotmilk-noite tem survivalOnly e não entra em PLAY_MAPS, INV_MAPS,
//  BOMB_MAPS nem X1_MAPS.
//
//  Pontos da partida (por jogador, não são Docoins):
//    começam em SURVIVAL.START_POINTS (500).
//    abate e acerto creditam em ent.points (pointsForKill / pointsForHit).
//    porta debita o comprador; abre pra todo mundo e libera a área do outro lado.
//    upgrade, mystery box e parede devem debitar o MESMO ent.points
//    (trySpendPoints). Não somar de novo no abate.
//
//  Portas: evaluateDoorBuy + commitDoorBuy. Servidor é a autoridade.
//  Spawns de zumbi: unlockedZombieSpawns — só áreas já abertas.
//  Spawns de jogador no começo: map.survival.playerSpawns (saguão).
//  Âncoras (não compram nada nesta branch): map.survival.anchors
//    .upgrade[] .mystery[] .wall[]  { id, area, x, y, z, yaw, ... }
// ============================================================

export const SURVIVAL = {
  mode: 'survival',
  variant: 'survival',
  DEFAULT_MAP: 'hotmilk-noite',
  // 500 de entrada. Wave 1 solo (~18 zumbis) rende o bastante pra 1ª e 2ª porta;
  // em grupo o abate é de quem mata, então a primeira porta (750) sai com poucos abates de um jogador.
  START_POINTS: 500,
  USE_R: 2.35, // metros até o ponto `door.at` (os dois lados da folha)
  KILL: { walker: 70, runner: 90, tank: 160, spitter: 110, boss: 500 },
  HEAD_BONUS: 40,
  KNIFE_BONUS: 30,
  HIT: 10,
  HIT_CAP: 4, // acertos contados por zumbi; o abate paga à parte e não entra nesse teto
};

export function isSurvivalMode(mode, cfg) {
  if (mode === SURVIVAL.mode) return true;
  if (!cfg || typeof cfg !== 'object') return false;
  if (cfg.mode === SURVIVAL.mode) return true;
  if (cfg.variant === SURVIVAL.variant) return true;
  return cfg.survival === true || cfg.survival === 1;
}

export function pointsForKill(zt, opts = {}) {
  const base = SURVIVAL.KILL[zt] ?? SURVIVAL.KILL.walker;
  return base + (opts.head ? SURVIVAL.HEAD_BONUS : 0) + (opts.knife ? SURVIVAL.KNIFE_BONUS : 0);
}

// Soma no zumbi. Devolve 0 quando o teto de acertos desse corpo já foi pago.
export function pointsForHit(zombie) {
  if (!zombie) return 0;
  const n = zombie.ptsHits | 0;
  if (n >= SURVIVAL.HIT_CAP) return 0;
  zombie.ptsHits = n + 1;
  return SURVIVAL.HIT;
}

export function grantPoints(ent, n) {
  if (!ent || !(n > 0)) return 0;
  ent.points = (ent.points | 0) + n;
  return n;
}

// Debita se couber. Devolve true quando o saldo mudou.
export function trySpendPoints(ent, price) {
  const cost = price | 0;
  if (!ent || cost < 0) return false;
  if ((ent.points | 0) < cost) return false;
  ent.points -= cost;
  return true;
}

export function createMatchSurvival(map) {
  const pack = map && map.survival;
  if (!pack) return null;
  const areas = new Set((pack.areas || []).filter((a) => a.start).map((a) => a.id));
  return { open: new Set(), areas };
}

export function doorById(map, id) {
  const doors = map && map.survival && map.survival.doors;
  if (!doors) return null;
  return doors.find((d) => d.id === id) || null;
}

export function areaById(map, id) {
  const areas = map && map.survival && map.survival.areas;
  if (!areas) return null;
  return areas.find((a) => a.id === id) || null;
}

function doorDist(door, pos) {
  if (!pos || !door.at) return Infinity;
  const dx = pos.x - door.at[0], dy = (pos.y || 0) - (door.at[1] || 0), dz = pos.z - door.at[2];
  return Math.hypot(dx, dy, dz);
}

// Não mexe em saldo nem em estado. reason: none | open | locked | far | points | dead
export function evaluateDoorBuy(map, state, ent, doorId) {
  const door = doorById(map, doorId);
  if (!map || !map.survival || !state || !door) return { ok: false, reason: 'none' };
  if (state.open.has(door.id)) return { ok: false, reason: 'open', door };
  if (!ent || ent.alive === false) return { ok: false, reason: 'dead', door };
  if (!door.areas.some((a) => state.areas.has(a))) return { ok: false, reason: 'locked', door };
  if (doorDist(door, ent.pos) > SURVIVAL.USE_R) return { ok: false, reason: 'far', door };
  if ((ent.points | 0) < door.price) return { ok: false, reason: 'points', door, price: door.price, have: ent.points | 0 };
  return { ok: true, door, price: door.price, unlock: door.areas.filter((a) => !state.areas.has(a)) };
}

// Pré-condição: evaluateDoorBuy.ok. Abre a folha e libera as áreas do outro lado.
export function commitDoorBuy(state, ent, door) {
  ent.points = (ent.points | 0) - door.price;
  state.open.add(door.id);
  const unlocked = [];
  for (const id of door.areas) if (!state.areas.has(id)) { state.areas.add(id); unlocked.push(id); }
  return { points: ent.points, unlocked };
}

export function nearestClosedDoor(map, state, pos) {
  if (!map || !map.survival || !state || !pos) return null;
  let best = null, bd = SURVIVAL.USE_R;
  for (const door of map.survival.doors) {
    if (state.open.has(door.id)) continue;
    if (!door.areas.some((a) => state.areas.has(a))) continue;
    const d = doorDist(door, pos);
    if (d < bd) { bd = d; best = door; }
  }
  return best ? { door: best, dist: bd } : null;
}

export function unlockedZombieSpawns(map, state) {
  if (!map || !map.survival || !state) return [];
  const out = [];
  for (const area of map.survival.areas || []) {
    if (!state.areas.has(area.id)) continue;
    for (const s of area.zspawns || []) out.push({ area: area.id, x: s[0], z: s[1], y: s[2] || 0 });
  }
  return out;
}

export function closedDoorSolids(map, openSet) {
  if (!map || !map.survival) return [];
  const open = openSet || new Set();
  const out = [];
  for (const door of map.survival.doors) {
    if (open.has(door.id)) continue;
    const [x0, y0, z0, x1, y1, z1] = door.block;
    out.push({ min: { x: Math.min(x0, x1), y: Math.min(y0, y1), z: Math.min(z0, z1) }, max: { x: Math.max(x0, x1), y: Math.max(y0, y1), z: Math.max(z0, z1) }, ramp: null, door: door.id });
  }
  return out;
}

export const DOOR_FAIL = {
  points: 'Pontos insuficientes',
  far: 'Chega mais perto da porta',
  locked: 'Esse lado ainda está fechado',
  dead: 'Só vivo compra porta',
  open: '',
  none: '',
};
