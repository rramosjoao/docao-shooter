// ============================================================
//  Invasão · Survival. Regras puras (sem DOM, sem Three.js).
//  Só vale quando a sala está em Invasão E na variante Survival.
//  Padrão não cria loja, não debita ponto e não troca o loadout.
//
//  Pontos da partida: a HUD antiga (+10 no acerto, +100/+150 no abate) é só
//  enfeite e não se gasta. Aqui a carteira é outra, da partida, no mesmo espírito
//  (acerto paga pouco, abate paga o grosso) e quem debita é o servidor.
//
//  Registrar o mapa do Survival (o outro agente faz o 'Hotmilk à noite'):
//    import { registerSurvivalMap } from './shared/survival.js';
//    registerSurvivalMap('hotmilk-noite', {
//      exclusive: true, // Survival passa a jogar SÓ neste mapa
//      papada: { x: 0, z: 4, yaw: 0 },
//      box: { x: 8, z: -2, yaw: Math.PI },
//      walls: [{ w: 9, x: -6, z: 2, yaw: 0 }], // w = índice em WEAPONS; preço opcional
//      doors: [{ id: 'porteira', x: 2, z: 0, yaw: 0, price: 750 }], // portas compráveis: o mapa lê este array
//    });
//  Sem exclusive, cada mapa da Invasão ganha posições de TESTE (stationsFor).
//  doors não é simulado aqui: fica no layout pra quem implementa a porta.
// ============================================================
import { INV_AMMO } from './invasion.js';
import { WEAPONS, PISTOL, KNIFE, UZI, P90, NAIL, SEMI, BOW, CORN_W, TAMPA, PRIMARIES, SECONDARIES } from './rules.js';

export const PAPADA_NAME = 'Papada';
export const BOX_NAME = 'Barraca da Sorte';
export const SURV_ID = 'survival';
export const PADRAO_ID = 'padrao';

export const SURV = {
  hit: 10,
  hitCap: 36, // acertos pagos por zumbi, por jogador (o golpe que mata não conta de novo)
  head: 50,
  cook: 2.6,
  boxSpin: 2.2,
  boxHold: 8,
  reach: 2.35,
  use: 'KeyF',
  useLabel: 'F',
  boxPrice: 1250,
};

// Custo pra sair do tier atual (0→1, 1→2, 2→3). Tier 3 não sobe.
export const PAP_COST = [10000, 25000, 50000];
const TAG = ['', 'na Brasa', 'Defumado', 'Pururuca'];

// Multiplicadores do tier (1, 2, 3). dmg no corpo; rate e reload são fração do tempo (menor = mais rápido).
// Sniper sobe menos (já mata). Escopeta sobe menos por causa do chumbo. Explosivo mexe na área, não vira metralhadora.
const PROFILE = {
  bullet: [
    { dmg: 1.55, mag: 1.45, reserve: 1.6, rate: 0.9, reload: 0.82 },
    { dmg: 2.2, mag: 1.9, reserve: 2.15, rate: 0.8, reload: 0.68 },
    { dmg: 2.9, mag: 2.35, reserve: 2.75, rate: 0.72, reload: 0.55 },
  ],
  shotgun: [
    { dmg: 1.4, mag: 1.5, reserve: 1.6, rate: 0.92, reload: 0.85 },
    { dmg: 1.85, mag: 1.85, reserve: 2.1, rate: 0.84, reload: 0.72 },
    { dmg: 2.3, mag: 2.25, reserve: 2.6, rate: 0.76, reload: 0.6 },
  ],
  sniper: [
    { dmg: 1.35, mag: 1.4, reserve: 1.5, rate: 0.92, reload: 0.85 },
    { dmg: 1.7, mag: 1.8, reserve: 1.9, rate: 0.85, reload: 0.72 },
    { dmg: 2.05, mag: 2.0, reserve: 2.3, rate: 0.78, reload: 0.62 },
  ],
  boom: [
    { dmg: 1.45, mag: 1, reserve: 1.5, rate: 0.95, reload: 0.85 },
    { dmg: 1.9, mag: 1, reserve: 2, rate: 0.9, reload: 0.75 },
    { dmg: 2.35, mag: 2, reserve: 2.5, rate: 0.85, reload: 0.65 },
  ],
};
const SNIPER_KEYS = new Set(['sniper', 'canhao', 'carabina']);
const SHOT_KEYS = new Set(['shotgun', 'semi']);
const BOOM_KEYS = new Set(['bazooka', 'milho']);

const KILL = { walker: 120, runner: 90, tank: 240, spitter: 140, boss: 700 };

// Armas fracas e úteis na parede. price = primeira compra; ammo = recompra de munição.
export const WALL_CATALOG = [
  { w: PISTOL, price: 500, ammo: 250 },
  { w: UZI, price: 1100, ammo: 450 },
  { w: NAIL, price: 900, ammo: 350 },
  { w: SEMI, price: 1300, ammo: 500 },
  { w: BOW, price: 1000, ammo: 400 },
  { w: P90, price: 1500, ammo: 550 },
];

const BOX_SKIP = new Set([TAMPA, KNIFE]);
export const BOX_POOL = [...PRIMARIES, ...SECONDARIES].filter((w, i, a) => a.indexOf(w) === i && !BOX_SKIP.has(w) && papOk(WEAPONS[w]));

export function normSurv(v) { return v === SURV_ID ? SURV_ID : PADRAO_ID; }
export function isSurvival(v) { return normSurv(v) === SURV_ID; }

export function papOk(w) {
  if (!w || w.melee || w.shield || w.saber || w.key === 'minigun' || w.key === 'faca-dourada') return false;
  return w.dmg > 0 || !!w.rocket || !!w.corn || !!w.disc || !!w.egg;
}
export function papRefuse(w) {
  if (!w) return 'arma';
  if (w.melee || w.key === 'faca-dourada' || w.saber) return 'lamina';
  if (w.shield) return 'escudo';
  if (w.key === 'minigun') return 'especial';
  if (!papOk(w)) return 'especial';
  return '';
}

function profileOf(w) {
  if (!w) return PROFILE.bullet;
  if (SNIPER_KEYS.has(w.key)) return PROFILE.sniper;
  if (SHOT_KEYS.has(w.key)) return PROFILE.shotgun;
  if (BOOM_KEYS.has(w.key) || w.rocket || w.corn) return PROFILE.boom;
  return PROFILE.bullet;
}
export function tierMul(w, tier) {
  const t = tier | 0;
  if (t < 1) return null;
  const row = profileOf(w);
  return row[Math.min(3, t) - 1];
}
const r1 = (n) => Math.round(n * 10) / 10;
const r3 = (n) => Math.round(n * 1000) / 1000;

export function papName(w, tier) {
  const t = tier | 0;
  if (!w || t < 1) return w ? (w.short || w.name) : '';
  return `${w.short || w.name} ${TAG[Math.min(3, t)]}`;
}

export function withPap(base, tier) {
  if (!base) return base;
  const t = tier | 0;
  if (t < 1 || !papOk(base)) return base;
  const m = tierMul(base, t);
  const mag0 = base.mag | 0;
  let mag = mag0;
  if (mag0 <= 1) mag = mag0 + (t >= 3 ? 2 : t === 2 ? 1 : 0);
  else mag = Math.max(mag0, Math.ceil(mag0 * m.mag));
  const reserve0 = base.reserve | 0;
  const reserve = reserve0 > 0 ? Math.max(reserve0, Math.ceil(reserve0 * m.reserve)) : 0;
  const next = {
    ...base,
    dmg: r1(base.dmg * m.dmg),
    mag, reserve,
    rate: r3(Math.max(0.03, base.rate * m.rate)),
    reload: base.reload > 0 ? r3(Math.max(0.15, base.reload * m.reload)) : base.reload,
    pap: t,
    papName: papName(base, t),
  };
  next.name = next.papName;
  next.short = next.papName;
  if (base.rocket) next.rocket = { ...base.rocket, maxDmg: Math.round(base.rocket.maxDmg * m.dmg) };
  return next;
}

export function bodyDmg(w) {
  if (!w) return 0;
  if (w.rocket) return w.rocket.maxDmg;
  if (w.corn) return Math.round(18 * (w.pap ? tierMul(WEAPONS.find((x) => x.key === 'milho') || w, w.pap).dmg : 1));
  if ((w.pellets | 0) > 1) return Math.round(w.dmg * w.pellets);
  return r1(w.dmg);
}

export function gunStats(base, tier) {
  const w = tier ? withPap(base, tier) : base;
  return {
    tier: tier | 0,
    name: tier ? papName(base, tier) : (base.short || base.name),
    dmg: bodyDmg(tier ? w : { ...base, pap: 0 }),
    mag: w.mag | 0,
    reserve: w.reserve | 0,
    rate: w.rate,
    reload: w.reload || 0,
  };
}
// milho: o dano de verdade está em CORN.maxDmg (18). withPap não mexe nele; bodyDmg acima usa o tier.
// Ajuste: gunStats do milho sem tier deve mostrar 18.
const CORN_POP = 18;
export function shownDmg(base, tier) {
  if (base && base.corn) {
    const m = tier ? tierMul(base, tier) : null;
    return Math.round(CORN_POP * (m ? m.dmg : 1));
  }
  return gunStats(base, tier).dmg;
}

export function statLine(base, fromTier, toTier) {
  const a = gunStats(base, fromTier), b = gunStats(base, toTier);
  a.dmg = shownDmg(base, fromTier); b.dmg = shownDmg(base, toTier);
  const n = (x) => String(x).replace('.', ',');
  const bits = [`dano ${n(a.dmg)} → ${n(b.dmg)}`];
  if (b.mag !== a.mag) bits.push(`pente ${a.mag} → ${b.mag}`);
  if (b.reserve !== a.reserve) bits.push(`reserva ${a.reserve} → ${b.reserve}`);
  if (b.rate !== a.rate && a.rate > 0) bits.push(`tiro ${n(a.rate)}s → ${n(b.rate)}s`);
  if (b.reload !== a.reload && a.reload > 0) bits.push(`recarga ${n(a.reload)}s → ${n(b.reload)}s`);
  return { before: a, after: b, text: bits.join(' · '), tier: toTier | 0, name: b.name };
}

export function fmtPts(n) {
  const v = Math.max(0, n | 0);
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function ensurePurse(e) {
  if (!e.pap || typeof e.pap !== 'object') e.pap = {};
  if (!e.slotOn) e.slotOn = [1, 1, 1];
  if (e.pts == null) e.pts = 0;
  if (!e.hitFarm) e.hitFarm = {};
  return e;
}
export function papTierOf(e, w) { return (e && e.pap && e.pap[w] | 0) || 0; }

export function killPoints(zt, head) { return (KILL[zt] || 100) + (head ? SURV.head : 0); }
export function grantHit(e, zid) {
  ensurePurse(e);
  const k = String(zid);
  const n = e.hitFarm[k] | 0;
  if (n >= SURV.hitCap) return 0;
  e.hitFarm[k] = n + 1;
  e.pts = (e.pts | 0) + SURV.hit;
  return SURV.hit;
}
export function grantKill(e, zt, head) {
  ensurePurse(e);
  const add = killPoints(zt, head);
  e.pts = (e.pts | 0) + add;
  return add;
}

export function fillGun(e, w, weapons = WEAPONS) {
  const base = weapons[w]; if (!base) return;
  const g = withPap(base, papTierOf(e, w));
  if (!e.mag) e.mag = weapons.map((x) => x.mag);
  if (!e.reserve) e.reserve = weapons.map((x) => x.reserve);
  e.mag[w] = g.mag;
  e.reserve[w] = g.reserve;
}
export function needsAmmo(e, w, weapons = WEAPONS) {
  const base = weapons[w]; if (!base || !(base.reserve > 0)) return false;
  const g = withPap(base, papTierOf(e, w));
  return (e.mag[w] | 0) < g.mag || (e.reserve[w] | 0) < g.reserve;
}

export function applySurvivalLoadout(e, weapons = WEAPONS) {
  ensurePurse(e);
  e.primary = e.nextPrimary = PISTOL;
  e.secondary = e.nextSecondary = PISTOL;
  e.melee = e.nextMelee = KNIFE;
  e.slots = [PISTOL, PISTOL, KNIFE];
  e.slotOn = [1, 0, 1];
  e.weapon = PISTOL;
  e.kit = {};
  e.papGun = -1; e.papUntil = 0;
  fillGun(e, PISTOL, weapons);
  return e;
}
export function slotLive(e, i) { return !e.slotOn || e.slotOn[i] !== 0; }

export function giveGun(e, w, weapons = WEAPONS) {
  ensurePurse(e);
  const on = e.slotOn;
  if ((on[0] && e.slots[0] === w) || (on[1] && e.slots[1] === w)) { fillGun(e, w, weapons); return 'have'; }
  if (!on[1]) {
    e.slots[1] = w; e.secondary = e.nextSecondary = w; on[1] = 1;
    fillGun(e, w, weapons); e.weapon = w; return 'add';
  }
  const slot = e.weapon === e.slots[1] ? 1 : 0;
  e.slots[slot] = w;
  if (slot === 0) e.primary = e.nextPrimary = w; else e.secondary = e.nextSecondary = w;
  fillGun(e, w, weapons); e.weapon = w; return 'swap';
}

export function tryPap(e, weapons = WEAPONS, now = 0) {
  ensurePurse(e);
  const w = e.weapon | 0;
  const base = weapons[w];
  const why = papRefuse(base);
  if (why) return { ok: false, reason: why };
  if ((e.papUntil || 0) > now && e.papGun === w) return { ok: false, reason: 'cozinha' };
  const cur = papTierOf(e, w);
  if (cur >= 3) return { ok: false, reason: 'max', tier: 3 };
  const cost = PAP_COST[cur];
  if ((e.pts | 0) < cost) return { ok: false, reason: 'pontos', cost, have: e.pts | 0, tier: cur };
  const line = statLine(base, cur, cur + 1);
  e.pts -= cost;
  e.pap[w] = cur + 1;
  fillGun(e, w, weapons);
  return { ok: true, weapon: w, tier: cur + 1, cost, pts: e.pts | 0, line };
}

export function tryBoxPay(e) {
  ensurePurse(e);
  if ((e.pts | 0) < SURV.boxPrice) return { ok: false, reason: 'pontos', cost: SURV.boxPrice, have: e.pts | 0 };
  e.pts -= SURV.boxPrice;
  return { ok: true, cost: SURV.boxPrice, pts: e.pts | 0 };
}
export function rollBox(rng, avoid = -1) {
  const pool = BOX_POOL.filter((w) => w !== avoid);
  const src = pool.length ? pool : BOX_POOL;
  const i = Math.min(src.length - 1, Math.floor((rng ? rng() : Math.random()) * src.length));
  return src[i];
}
export function takeBox(e, w, weapons = WEAPONS) {
  const how = giveGun(e, w, weapons);
  return { ok: true, how, weapon: w, pts: e.pts | 0 };
}

export function tryWall(e, wall, weapons = WEAPONS) {
  ensurePurse(e);
  if (!wall) return { ok: false, reason: 'longe' };
  const w = wall.w | 0;
  const on = e.slotOn || [1, 1, 1];
  const owns = (on[0] && e.slots[0] === w) || (on[1] && e.slots[1] === w);
  if (owns) {
    if (!needsAmmo(e, w, weapons)) return { ok: false, reason: 'cheia', weapon: w };
    const cost = wall.ammo | 0;
    if ((e.pts | 0) < cost) return { ok: false, reason: 'pontos', cost, have: e.pts | 0, weapon: w, kind: 'ammo' };
    e.pts -= cost; fillGun(e, w, weapons);
    return { ok: true, kind: 'ammo', cost, pts: e.pts | 0, weapon: w };
  }
  const cost = wall.price | 0;
  if ((e.pts | 0) < cost) return { ok: false, reason: 'pontos', cost, have: e.pts | 0, weapon: w, kind: 'buy' };
  e.pts -= cost;
  const how = giveGun(e, w, weapons);
  return { ok: true, kind: how, cost, pts: e.pts | 0, weapon: w };
}

// Caixa de munição do mapa, no teto da arma já passada na Papada (não encolhe a reserva upada).
export function survRefill(e, weapons = WEAPONS) {
  ensurePurse(e);
  let got = false;
  const on = e.slotOn || [1, 1, 1];
  for (let s = 0; s < e.slots.length; s++) {
    if (on[s] === 0) continue;
    const i = e.slots[s];
    const base = weapons[i]; if (!base || !(base.reserve > 0)) continue;
    const w = withPap(base, papTierOf(e, i));
    const cap = Math.ceil(w.reserve * INV_AMMO.reserveMul);
    if ((e.reserve[i] | 0) >= cap && (e.mag[i] | 0) >= w.mag) continue;
    e.reserve[i] = Math.min(cap, (e.reserve[i] | 0) + (base.rocket ? INV_AMMO.rockets : w.reserve));
    e.mag[i] = Math.max(e.mag[i] | 0, w.mag);
    got = true;
  }
  return got;
}

// ---------- layouts por mapa ----------
// Objeto mutável de propósito: registerSurvivalMap pluga um mapa novo sem editar este arquivo.
export const SURVIVAL_LAYOUTS = {};

export function registerSurvivalMap(id, layout) {
  if (!id || !layout) return null;
  SURVIVAL_LAYOUTS[id] = layout;
  return layout;
}
export function exclusiveSurvivalMap(knownIds) {
  for (const [id, lay] of Object.entries(SURVIVAL_LAYOUTS)) {
    if (lay && lay.exclusive && (!knownIds || knownIds.includes(id))) return id;
  }
  return null;
}

function wallFrom(raw, cat) {
  const src = cat || WALL_CATALOG.find((c) => c.w === raw.w) || WALL_CATALOG[0];
  return { w: raw.w | 0, x: raw.x, z: raw.z, yaw: raw.yaw || 0, price: raw.price > 0 ? raw.price : src.price, ammo: raw.ammo > 0 ? raw.ammo : src.ammo };
}

// Posições de TESTE, estáveis, a partir do tamanho e dos spawns. Não são o mapa final do Survival.
export function testStations(map) {
  const [hx, hz] = map.size || [20, 20];
  const sp = (map.spawns || [[0, 0]]).map((s) => ({ x: s[0], z: s[1] }));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const inside = (p, k) => {
    const dx = p.x === 0 ? 1 : -Math.sign(p.x), dz = p.z === 0 ? 0 : -Math.sign(p.z);
    return { x: clamp(p.x + dx * k, -hx + 3, hx - 3), z: clamp(p.z + dz * k, -hz + 3, hz - 3) };
  };
  const a = sp[0] || { x: 0, z: 0 };
  const b = sp[Math.min(sp.length - 1, Math.max(1, (sp.length / 2) | 0))] || { x: -a.x, z: -a.z };
  const pap = inside(a, 5);
  let box = inside(b, 7);
  if (Math.hypot(box.x - pap.x, box.z - pap.z) < 6) box = { x: clamp(-pap.x, -hx + 3, hx - 3), z: clamp(-pap.z, -hz + 3, hz - 3) };
  const guns = WALL_CATALOG;
  const rad = Math.max(6, Math.min(hx, hz) * 0.42);
  const walls = guns.map((g, i) => {
    const ang = (i / guns.length) * Math.PI * 2 + 0.4;
    return wallFrom({ w: g.w, x: clamp(Math.cos(ang) * rad, -hx + 3, hx - 3), z: clamp(Math.sin(ang) * rad, -hz + 3, hz - 3), yaw: ang + Math.PI }, g);
  });
  return { id: map.id, test: true, exclusive: false, papada: { x: pap.x, z: pap.z, yaw: Math.atan2(-pap.x, -pap.z) }, box: { x: box.x, z: box.z, yaw: 0 }, walls, doors: [] };
}

export function stationsFor(map) {
  const lay = map && SURVIVAL_LAYOUTS[map.id];
  if (lay && lay.papada && lay.box && Array.isArray(lay.walls) && lay.walls.length) {
    return {
      id: map.id,
      test: false,
      exclusive: !!lay.exclusive,
      papada: { x: lay.papada.x, z: lay.papada.z, yaw: lay.papada.yaw || 0 },
      box: { x: lay.box.x, z: lay.box.z, yaw: lay.box.yaw || 0 },
      walls: lay.walls.map((w) => wallFrom(w)),
      doors: (lay.doors || []).map((d) => ({ id: d.id, x: d.x, z: d.z, yaw: d.yaw || 0, price: d.price | 0 })),
    };
  }
  return testStations(map || { id: '?', size: [20, 20], spawns: [[0, 0]] });
}

// Empurra um ponto pra fora de parede, se a física disser que está preso. Layout exclusivo também passa por aqui.
export function settlePoint(point, map, phys) {
  const [hx, hz] = map.size;
  const ok = (x, z) => {
    if (Math.abs(x) > hx - 1.2 || Math.abs(z) > hz - 1.2) return false;
    const y = phys.groundAt(x, z, 2);
    if (phys.collides(x, y + 0.4, z)) return false;
    return y;
  };
  const y0 = ok(point.x, point.z);
  if (y0 !== false) return { ...point, y: y0 };
  for (let r = 1; r <= 10; r++) {
    for (let a = 0; a < 10; a++) {
      const nx = point.x + Math.cos(a * 0.63 + r) * r;
      const nz = point.z + Math.sin(a * 0.63 + r) * r;
      const y = ok(nx, nz);
      if (y !== false) return { ...point, x: nx, y, z: nz };
    }
  }
  return { ...point, y: phys.groundAt(point.x, point.z, 2) };
}
export function settleLayout(layout, map, phys) {
  return {
    ...layout,
    papada: settlePoint(layout.papada, map, phys),
    box: settlePoint(layout.box, map, phys),
    walls: layout.walls.map((w) => settlePoint(w, map, phys)),
    doors: (layout.doors || []).map((d) => settlePoint(d, map, phys)),
  };
}

export function nearPoint(pos, point, reach = SURV.reach) {
  if (!pos || !point) return false;
  const y = point.y || 0;
  return Math.hypot(pos.x - point.x, pos.z - point.z) <= reach && Math.abs((pos.y || 0) - y) < 2.4;
}

export function cornPopDmg(tier) {
  const m = tier ? tierMul(WEAPONS[CORN_W], tier) : null;
  return Math.round(CORN_POP * (m ? m.dmg : 1));
}
