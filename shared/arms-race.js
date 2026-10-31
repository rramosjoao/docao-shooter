// Corrida Armada: regras compartilhadas pelo offline e pelo servidor autoritativo.
import { WEAPONS, KNIFE, GOLD_KNIFE, COMMANDO, FAMAS, UZI, P90, SEMI, PISTOL, REV, REV2 } from './rules.js';

export const ARMS_RACE = Object.freeze({ mode: 'arms', killsPerStage: 2, respawnTime: 3 });
export const isArmsRace = (mode) => mode === ARMS_RACE.mode;
// Sequência fixa: todos percorrem as mesmas armas, inclusive quem entra no meio.
const categories = [
  ['Snipers', [2, 5, 6]],
  ['Rifles', [0, COMMANDO, FAMAS]],
  ['Submetralhadoras', [UZI, P90]],
  ['Escopetas', [1, SEMI]],
  ['Pistolas', [PISTOL, REV, REV2]],
  ['Faca dourada', [GOLD_KNIFE]],
];
export const ARMS_STAGES = Object.freeze(categories.flatMap(([category, weapons]) => weapons.map(weapon => Object.freeze({ category, weapon }))));
export const ARMS_LAST = ARMS_STAGES.length - 1;
export const armsStage = (e) => ARMS_STAGES[e.armsStage | 0] || ARMS_STAGES[0];
export const armsScore = (e) => (e.armsStage | 0) * ARMS_RACE.killsPerStage + (e.armsKills | 0);
export function resetArmsRace(e) { e.armsStage = 0; e.armsKills = 0; }

// Sem secundária livre: 1/2 sacam a arma da etapa; 3/V sacam a faca padrão.
// Na última etapa só existe a faca dourada, sem faca padrão para roubo.
export function equipArmsRace(e) {
  const w = armsStage(e).weapon;
  e.primary = e.secondary = w; e.melee = w === GOLD_KNIFE ? GOLD_KNIFE : KNIFE;
  e.slots = w === GOLD_KNIFE ? [w] : [w, w, KNIFE];
  e.weapon = w; e.prevWeapon = w; e.kit = {}; e.knifeMode = false;
  e.mag = WEAPONS.map(x => x.mag); e.reserve = WEAPONS.map(x => x.reserve);
  e.reload = null; e.reloadEnd = 0; e.switchEnd = 0; e.actionEnd = 0; e.burstLeft = 0;
  e.nades = e.smokeNades = e.stunNades = e.shocks = e.pokeballs = 0;
}

// Só chama uma vez por morte confirmada. Roubo substitui o abate de progresso.
// Devolve quem precisa receber a arma nova; o contador da vítima só zera se ela recuar.
export function armsRaceKill(attacker, victim, weapon) {
  if (!attacker || !victim || attacker === victim || ![0, 1].includes(attacker.team) || ![0, 1].includes(victim.team) || attacker.team === victim.team) return { changed: [], winner: null };
  if (weapon === GOLD_KNIFE && attacker.armsStage === ARMS_LAST) return { changed: [], winner: attacker };
  const changed = [];
  if (weapon === KNIFE) {
    if (attacker.armsStage < ARMS_LAST) { attacker.armsStage++; attacker.armsKills = 0; changed.push(attacker); }
    if (victim.armsStage > 0) { victim.armsStage--; victim.armsKills = 0; changed.push(victim); }
  } else if (weapon === armsStage(attacker).weapon && attacker.armsStage < ARMS_LAST) {
    attacker.armsKills++;
    if (attacker.armsKills >= ARMS_RACE.killsPerStage) { attacker.armsStage++; attacker.armsKills = 0; changed.push(attacker); }
  }
  return { changed, winner: null };
}
