// ============================================================
//  Memória do loadout e limites da sala. Sem DOM, sem Three.js.
//  weapons/powers null = tudo liberado. Lista = só o que está nela.
//  Cada slot (primária, secundária, corpo a corpo) fica com pelo menos uma arma.
// ============================================================
import { CATEGORIES, PRIMARIES, SECONDARIES, MELEES, PISTOL, KNIFE, BOT_PRIMARIES } from './rules.js';

export const POWER_UPS = [
  { id: 'uav', title: 'Olho da granja' },
  { id: 'missile', title: 'Míssil' },
  { id: 'heli', title: 'Gavião' },
  { id: 'gunner', title: 'Chopper' },
  { id: 'ac130', title: 'Grelha' },
  { id: 'nuke', title: 'Fim da chapa' },
  { id: 'health', title: 'Vida' },
  { id: 'ammo', title: 'Munição' },
  { id: 'grenade', title: 'Copo Bomba' },
  { id: 'smoke', title: 'Fumaça' },
  { id: 'stun', title: 'Pau de choque' },
];
export const POWER_IDS = POWER_UPS.map((p) => p.id);
const CAT_IDS = CATEGORIES.map((c) => c.id);
const inSlot = (i) => PRIMARIES.includes(i) || SECONDARIES.includes(i) || MELEES.includes(i);

function ensureSlots(ids) {
  const out = ids.filter(inSlot);
  if (!out.some((i) => PRIMARIES.includes(i))) out.push(PRIMARIES[0]);
  if (!out.some((i) => SECONDARIES.includes(i))) out.push(PISTOL);
  if (!out.some((i) => MELEES.includes(i))) out.push(KNIFE);
  return out;
}
function isFullWeapons(ids) {
  return PRIMARIES.every((i) => ids.includes(i)) && SECONDARIES.every((i) => ids.includes(i)) && MELEES.every((i) => ids.includes(i));
}

export function weaponsOfCats(catIds) {
  const on = new Set(catIds);
  const ids = [];
  for (const c of CATEGORIES) if (on.has(c.id)) for (const w of c.weapons) if (!ids.includes(w)) ids.push(w);
  return ensureSlots(ids);
}

// null = todas. Lista inválida ou vazia vira o mínimo jogável (uma de cada slot).
export function normWeapons(list) {
  if (list == null) return null;
  if (!Array.isArray(list)) return null;
  const ids = [];
  for (const n of list) { const i = n | 0; if (inSlot(i) && !ids.includes(i)) ids.push(i); }
  const fixed = ensureSlots(ids);
  return isFullWeapons(fixed) ? null : fixed;
}
// null = todos. [] = nenhum.
export function normPowers(list) {
  if (list == null) return null;
  if (!Array.isArray(list)) return null;
  const ids = [];
  for (const id of list) if (POWER_IDS.includes(id) && !ids.includes(id)) ids.push(id);
  return ids.length === POWER_IDS.length ? null : ids;
}
export function normHand(v) { return v === 'secondary' || v === 'melee' ? v : 'primary'; }
export function weaponOn(i, weapons) { return !weapons || weapons.includes(i); }
export function powerOn(id, powers) { return !powers || powers.includes(id); }

export function clampLoadout(primary, secondary, melee, weapons) {
  const pick = (cur, pool) => (pool.includes(cur) && weaponOn(cur, weapons) ? cur : ((weapons || pool).find((i) => pool.includes(i)) ?? pool[0]));
  return { primary: pick(primary, PRIMARIES), secondary: pick(secondary, SECONDARIES), melee: pick(melee, MELEES) };
}
export function botPool(weapons) {
  const pool = BOT_PRIMARIES.filter((i) => weaponOn(i, weapons));
  if (pool.length) return pool;
  const any = (weapons || PRIMARIES).filter((i) => PRIMARIES.includes(i));
  return any.length ? any : [PRIMARIES[0]];
}
export function catsFromWeapons(weapons) {
  if (!weapons) return CAT_IDS.slice();
  return CATEGORIES.filter((c) => c.weapons.some((w) => weapons.includes(w))).map((c) => c.id);
}

// Forma salva no navegador, por modo: { cats, powers }. Ausente = tudo liberado.
export function savedToLimits(row) {
  if (!row || !Array.isArray(row.cats) || !Array.isArray(row.powers)) return { weapons: null, powers: null };
  const cats = row.cats.filter((id) => CAT_IDS.includes(id));
  const weapons = cats.length === CAT_IDS.length ? null : normWeapons(weaponsOfCats(cats));
  return { weapons, powers: normPowers(row.powers) };
}
export function limitsToSaved(limits) {
  const powers = limits && limits.powers ? limits.powers.filter((id) => POWER_IDS.includes(id)) : POWER_IDS.slice();
  return { cats: catsFromWeapons(limits && limits.weapons), powers };
}
