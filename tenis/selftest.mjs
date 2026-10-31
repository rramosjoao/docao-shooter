import { firstBounce, inServeBox, launchAt, makeBall, netHeight, stepBall } from './physics.js';
import { HALF } from './physics.js';
import { awardPoint, deuceCourt, faultServe, newMatch, pointLabel, teamOf } from './rules.js';

let failed = 0;
function check(name, cond) {
  if (!cond) {
    console.error('FALHOU', name);
    failed += 1;
  }
}

function match() {
  return newMatch({
    setsToWin: 2,
    seats: [
      { name: 'Docão', team: 0 },
      { name: 'Farofa', team: 1 },
    ],
  });
}

function giveGame(m, team) {
  const g = m.games[team];
  let guard = 0;
  while (m.games[team] === g && !m.over && !m.tiebreak && guard++ < 8) awardPoint(m, team);
}

const deuce = match();
for (let i = 0; i < 3; i++) awardPoint(deuce, 0);
for (let i = 0; i < 3; i++) awardPoint(deuce, 1);
check('iguais', pointLabel(deuce, 0) === '40' && pointLabel(deuce, 1) === '40' && deuceCourt(deuce));
awardPoint(deuce, 0);
check('vantagem e esquerda', pointLabel(deuce, 0) === 'Vant.' && pointLabel(deuce, 1) === '40' && !deuceCourt(deuce));
awardPoint(deuce, 0);
check('game e direita do outro', deuce.pts[0] === 0 && deuce.games[0] === 1 && teamOf(deuce, deuce.server) === 1 && deuceCourt(deuce));

const back = match();
for (let i = 0; i < 3; i++) awardPoint(back, 0);
for (let i = 0; i < 3; i++) awardPoint(back, 1);
awardPoint(back, 0);
awardPoint(back, 1);
check('volta a iguais', pointLabel(back, 0) === '40' && pointLabel(back, 1) === '40' && deuceCourt(back) && back.games[0] === 0);

const forty = match();
for (let i = 0; i < 3; i++) awardPoint(forty, 0);
for (let i = 0; i < 2; i++) awardPoint(forty, 1);
check('40-30', pointLabel(forty, 0) === '40' && pointLabel(forty, 1) === '30');
awardPoint(forty, 1);
check('40-30 vira iguais', pointLabel(forty, 0) === '40' && pointLabel(forty, 1) === '40');

const g = match();
giveGame(g, 0);
check('troca no 1º game', g.endsFlipped && g.games[0] === 1);
giveGame(g, 1);
check('não troca no 2º', g.endsFlipped && g.games[1] === 1);
giveGame(g, 0);
check('troca no 3º', !g.endsFlipped);

const set64 = match();
for (let i = 0; i < 4; i++) { giveGame(set64, 0); giveGame(set64, 1); }
giveGame(set64, 0);
check('5-4 segue', set64.games[0] === 5 && set64.games[1] === 4 && !set64.history.length);
giveGame(set64, 0);
check('6-4 fecha', set64.sets[0] === 1 && set64.history[0][0] === 6 && set64.history[0][1] === 4 && !set64.tiebreak);

const set65 = match();
for (let i = 0; i < 4; i++) { giveGame(set65, 0); giveGame(set65, 1); }
giveGame(set65, 0);
giveGame(set65, 0);
check('6-4 já testado no outro', set65.sets[0] === 1);

const to65 = match();
for (let i = 0; i < 5; i++) { giveGame(to65, 0); giveGame(to65, 1); }
giveGame(to65, 0);
check('6-5 não fecha', !to65.history.length && to65.games[0] === 6 && to65.games[1] === 5 && !to65.tiebreak);
giveGame(to65, 1);
check('6-6 abre tie-break', to65.tiebreak && to65.tb[0] === 0 && to65.games[0] === 6 && to65.games[1] === 6);

const tb70 = match();
for (let i = 0; i < 5; i++) { giveGame(tb70, 0); giveGame(tb70, 1); }
giveGame(tb70, 0);
giveGame(tb70, 1);
for (let i = 0; i < 7; i++) awardPoint(tb70, 0);
check('7-0 fecha 7-6', tb70.sets[0] === 1 && tb70.history[0][0] === 7 && tb70.history[0][1] === 6 && !tb70.tiebreak);

const tb = match();
for (let i = 0; i < 5; i++) { giveGame(tb, 0); giveGame(tb, 1); }
giveGame(tb, 0);
giveGame(tb, 1);
while (tb.tb[0] < 6 || tb.tb[1] < 6) {
  if (tb.tb[0] <= tb.tb[1]) awardPoint(tb, 0);
  else awardPoint(tb, 1);
}
check('6-6 no tie-break segue', tb.tiebreak && tb.tb[0] === 6 && tb.tb[1] === 6);
awardPoint(tb, 0);
check('7-6 segue', tb.tiebreak && tb.tb[0] === 7);
awardPoint(tb, 0);
check('8-6 fecha', !tb.tiebreak && tb.sets[0] === 1 && tb.history.at(-1)[0] === 7 && tb.history.at(-1)[1] === 6);

const ends = match();
for (let i = 0; i < 5; i++) { giveGame(ends, 0); giveGame(ends, 1); }
giveGame(ends, 0);
giveGame(ends, 1);
const before = ends.endsFlipped;
for (let i = 0; i < 6; i++) awardPoint(ends, i % 2);
check('troca depois de 6 pontos', ends.tiebreak && ends.endsFlipped !== before);
check('7º ponto é da direita', deuceCourt(ends));

const fault = match();
check('primeira falta', faultServe(fault).event === 'fault' && fault.serveBall === 1 && fault.pts[1] === 0);
const doubled = faultServe(fault);
check('dupla falta', doubled.double && fault.pts[1] === 1 && fault.serveBall === 0 && teamOf(fault, fault.server) === 0);

const b = makeBall({ x: 0, y: 0.5, z: -0.4, vz: 40 });
stepBall(b, 1 / 30, false);
check('bola não atravessa a rede', b.net === 'hit');

const corner = makeBall({ x: 4, y: 0.97, z: -0.3, vz: 30 });
stepBall(corner, 1 / 30, false);
check('rede no canto', corner.net === 'hit' && netHeight(4, false) > 0.97);

const drop = makeBall({ y: 2.54, z: 2 });
let bounces = 0;
for (let t = 0; t < 8; t += 1 / 60) {
  stepBall(drop, 1 / 60, false);
  if (drop.bounced) bounces += 1;
}
check('quique acaba', drop.dead && drop.vy === 0 && bounces > 4 && bounces < 20);

const from = { x: -3.05, y: 2.4, z: -(HALF - 0.05) };
const aim = { x: 2.1, z: 3.6 };
const shot = launchAt(from, aim, 'saque');
const land = firstBounce(makeBall({ ...from, ...shot }));
check('saque na caixa', !!land && land.net !== 'hit' && inServeBox(land.x, land.z, -1, true));

const stroke = launchAt({ x: 0, y: 1, z: -10.5 }, { x: 1.2, z: 9.5 }, 'liftado');
const ground = firstBounce(makeBall({ x: 0, y: 1, z: -10.5, ...stroke }));
check('liftado passa e cai dentro', !!ground && ground.net !== 'hit' && ground.z > 6.4 && ground.z < HALF + 0.2 && Math.abs(ground.x) < 4.2);

if (failed) {
  console.error(failed + ' falha(s)');
  process.exit(1);
}
console.log('tudo certo');
