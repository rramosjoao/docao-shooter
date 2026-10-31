// ============================================================
//  Regras compartilhadas (cliente + servidor). Sem DOM, sem Three.js.
//  Armas, Copo Bomba, física do Docão, tempos de partida e nomes dos bots.
// ============================================================
export const KILL_LIMIT = 20, TIME_LIMIT = 300, RESPAWN_TIME = 3, INVULN = 2;
export const GRAV = -24, JUMP = 8.5, SPEED = 6.8, BOT_SPEED = 5.4, STEP = 0.45, RADIUS = 0.42, HEIGHT = 2.0, EYE = 1.6;

// Armas. Primárias (escolhidas no menu): 0 Fuzil, 1 Calibre 12, 2 Sniper, 3 Bazuca. Secundária de todos: 4 Pistolinha.
export const WEAPONS = [
  { key: 'rifle', name: 'Fuzil Pururuca', short: 'Fuzil Pururuca', chip: 'Fuzil', mag: 30, reserve: 120, dmg: 20, headMul: 2, rate: 0.1, auto: true, pellets: 1, spread: 0.01, reload: 1.6, range: 140, recoil: 0.018, adsFov: 40, adsSpread: 0.12, flashZ: -0.76,
    desc: 'Automático · 30/120 · 20 dano' },
  { key: 'shotgun', name: 'Escopeta Chiqueiro · Calibre 12', short: 'Calibre 12', chip: 'Calibre 12', mag: 8, reserve: 32, dmg: 15, headMul: 1.5, rate: 0.8, auto: false, pellets: 8, spread: 0.06, reload: 0.45, shellReload: true, reloadStart: 0.25, range: 45, recoil: 0.07, adsFov: 55, adsSpread: 0.6, flashZ: -0.86,
    falloff: [7, 30, 0.3], pump: true, desc: 'Calibre 12 · pump · 8/32 · forte de perto' },
  { key: 'sniper', name: 'Sniper Torresmo', short: 'Sniper Torresmo', chip: 'Sniper', mag: 5, reserve: 20, dmg: 115, headMul: 250 / 115, rate: 1.4, auto: false, pellets: 1, spread: 0.08, reload: 2.4, range: 220, recoil: 0.06, adsFov: 15, adsSpread: 0, flashZ: -1.1,
    scope: true, bolt: true, beam: true, desc: 'Ferrolho · 5/20 · 1 tiro mata · Shift = luneta' },
  { key: 'bazooka', name: 'Bazuca do Chiqueiro', short: 'Bazuca', chip: 'Bazuca', mag: 1, reserve: 4, dmg: 0, headMul: 1, rate: 0.6, auto: false, pellets: 0, spread: 0.004, reload: 2.5, range: 0, recoil: 0.09, adsFov: 55, adsSpread: 0.5, flashZ: -0.9,
    rocket: { speed: 24, radius: 5, maxDmg: 120, selfMul: 0.4, knock: 11, lift: 13 }, desc: 'Foguete · 1/4 · dano em área · rocket jump' },
  { key: 'pistol', name: 'Pistolinha Leitão', short: 'Pistolinha', chip: 'Pistola', mag: 12, reserve: 60, dmg: 25, headMul: 2, rate: 0.16, auto: false, pellets: 1, spread: 0.007, reload: 1.1, range: 110, recoil: 0.03, adsFov: 50, adsSpread: 0.4, flashZ: -0.42,
    desc: 'Semiautomática · 12/60 · 25 dano' },
];
export const PRIMARIES = [0, 1, 2, 3], PISTOL = 4, W_NADE = -1, W_FALL = -3;

// Copo Bomba (granada)
export const NADE = { max: 3, spawnWith: 1, fuse: 2.5, charge: 1.2, radius: 6, maxDmg: 130, selfMul: 0.4, grav: -20, r: 0.14, pickupRespawn: 20, knock: 14, lift: 7 };
export const WEAPON_SHORT = (i) => (i === W_NADE ? 'Copo Bomba' : i === W_FALL ? 'Penhasco' : WEAPONS[i] ? WEAPONS[i].short : '?');
export const BOT_DEFS = [
  { name: 'Farofa' }, { name: 'Pipoca' }, { name: 'Trufa' }, { name: 'Bolota' }, { name: 'Torresmo' }, { name: 'Paçoca' }, { name: 'Linguiça' }, { name: 'Quindim' },
];

export const BOT_RANGE = [14, 4.5, 26, 14, 10]; // distância preferida dos bots por arma
export const TAG_COLORS = ['#7DF9FF', '#ffd27a', '#ff9fb6', '#9be37a', '#c9a4ff', '#ffb36b', '#9fd0ff', '#ffa3d8'];
