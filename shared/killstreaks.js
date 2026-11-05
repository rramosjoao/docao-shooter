// ============================================================
//  Killstreaks online (servidor autoritativo). Mesmas regras/números do cliente offline (main.js: STREAK_LAP, PREDATOR, HELI).
//  Abates sem morrer: o ciclo dá 3 (Olho da granja, só no cliente), 5 (Míssil), 7 (Gavião), 10 (Chopper da granja), 13 (Grelha da granja) e volta depois do 15; cada 15 = nuke.
//  Abates do Gavião, do Chopper, da Grelha e do nuke não contam pra sequência.
// ============================================================
export const STREAK_LAP = 15;
export const streakCycle = (kills) => (kills <= 0 ? 0 : ((kills - 1) % STREAK_LAP) + 1);
// o que a sequência `kills` libera (o 15 fecha o ciclo e só dá o nuke)
export function streakRewards(kills) {
  const out = [], c = streakCycle(kills);
  if (c === 3) out.push('uav'); else if (c === 5) out.push('missile'); else if (c === 7) out.push('heli'); else if (c === 10) out.push('gunner'); else if (c === 13) out.push('ac130');
  if (kills > 0 && kills % STREAK_LAP === 0) out.push('nuke');
  return out;
}
export const PREDATOR = { radius: 26, maxDmg: 460, selfMul: 0.4, knock: 20, lift: 14, speed: 28, boost: 1.85, life: 16, height: 98, laptop: 0.7, back: 8 };
export const HELI = { hp: 280, life: 30, height: 17, hit: 3.1, dmg: 16, rate: 0.22, spin: 0.42, points: 25, miss: 0.3 }; // miss = chance de errar o tiro (passa do lado)
// Chopper da granja (Chopper Gunner): você pilota a arma de um helicóptero que roda o mapa em círculo por 60 s.
// Dobro da vida do Gavião. Minigun esquenta (heat por tiro, esfria sozinha; no talo trava até zerar). Sniper: 1 tiro forte com zoom.
export const GUNNER = {
  hp: HELI.hp * 2, life: 60, height: 24, spin: 0.3, orbit: 1.15, range: 170, hit: HELI.hit * 1.15,
  mini: { dmg: 20, headMul: 1.3, rate: 0.075, spread: 0.014, heat: 0.032, cool: 0.5, fov: 62 },
  sniper: { dmg: 140, headMul: 1.5, rate: 0.9, spread: 0, fov: 20 },
};
export const NUKE = { delay: 5 }; // Fim da chapa: conta 5 s e estoura. Não usa rádio. O estouro acaba a partida (stepNukes).
// Grelha da granja: avião alto que roda o mapa; quem chamou só aponta as armas (espeto, panela, caldeirão).
export const AC130 = { life: 40, height: 62, spin: 0.16, orbit: 1.45, hp: 420, hit: 4.6,
  espeto: { dmg: 18, rate: 0.12, spread: 0.01, radius: 0 },
  panela: { dmg: 70, rate: 0.8, spread: 0, radius: 3.2 },
  caldeirao: { dmg: 160, rate: 2.8, spread: 0, radius: 6.5 } };
// órbita do Gavião (sem o balanço visual): ângulo inicial + 0,42 rad/s ao redor do centro do mapa
export const heliOrbit = (size) => Math.min(18, Math.max(10, Math.min(size[0] || 24, size[1] || 24) * 0.42));
export function heliPos(h, T) { const a = h.ang + (h.spin ?? HELI.spin) * (T - h.born); return { x: Math.cos(a) * h.orbit, y: h.height ?? HELI.height, z: Math.sin(a) * h.orbit }; } // Chopper: spin/height próprios
// nome no kill feed (evento 'k', ev[8])
export const KS_KILL_NAME = { p: 'Míssil da granja', h: 'Gavião da granja', x: 'Fim da chapa', g: 'Chopper da granja', a: 'Grelha da granja', pk: 'Pokébola' };
