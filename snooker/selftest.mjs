import { beginShot, createWorld, moving, step, strike } from './physics.js';
import { applyShot, ballOnIds, newMatch, rackBalls, resolveChoice, startBreak } from './rules.js';

let failed = 0;
function check(name, cond) {
  if (!cond) { failed++; console.error('FALHOU', name); }
  else console.log('ok', name);
}

function roll(world, power, angle) {
  beginShot(world);
  strike(world, { angle, power, spinX: 0, spinY: 0 });
  let t = 0;
  while (moving(world) && t < 8) { step(world, 1 / 60); t += 1 / 60; }
  return world;
}

{
  const balls = rackBalls('bola8');
  check('rack da bola 8', balls.filter((b) => b.id !== 'cue').length === 15);
  const eight = balls.find((b) => b.n === 8);
  const one = balls.find((b) => b.n === 1);
  check('a 8 fica atrás da 1', eight.x > one.x && Math.abs(eight.z) < 0.001);
  const cue = balls.find((b) => b.id === 'cue');
  const y = balls.find((b) => b.id === 'b1');
  cue.x = 0; cue.z = 0; cue.pocketed = false;
  y.x = 0; y.z = 0.22; y.pocketed = false;
  for (const b of balls) if (b !== cue && b !== y) b.pocketed = true;
  const world = createWorld(balls);
  roll(world, 0.55, Math.PI / 2);
  check('caçapa reta', world.potted.includes('b1') && !world.off.includes('b1'));
}

{
  const seats = [{ name: 'A', team: 0 }, { name: 'B', team: 1 }];
  const match = newMatch({ mode: 'bola8', seats, race: 2 });
  const balls = [];
  startBreak(match, balls);
  match.breakShot = false;
  match.inHand = false;
  const solid = balls.find((b) => b.n === 1);
  solid.pocketed = true;
  applyShot(match, balls, { firstId: 'b1', potted: ['b1'], off: [], cuePotted: false, legalIds: ['b1'], railAfter: true, railBalls: 2 });
  check('lisa define o grupo e continua', match.groups[0] === 'lisa' && match.groups[1] === 'listra' && match.turn === 0 && !match.open);
}

{
  const seats = [{ name: 'A', team: 0 }, { name: 'B', team: 1 }];
  const match = newMatch({ mode: 'bola8', seats, race: 2 });
  const balls = [];
  startBreak(match, balls);
  match.breakShot = false;
  match.open = false;
  match.groups = ['lisa', 'listra'];
  match.inHand = false;
  const eight = balls.find((b) => b.n === 8);
  eight.pocketed = true;
  applyShot(match, balls, { firstId: 'b8', potted: ['b8'], off: [], cuePotted: false, legalIds: ballOnIds(match, balls), railAfter: true, railBalls: 1 });
  check('8 cedo perde', match.frames[1] === 1 && match.frameOver);
}

{
  const seats = [{ name: 'A', team: 0 }, { name: 'B', team: 1 }];
  const match = newMatch({ mode: 'bola8', seats, race: 2 });
  const balls = [];
  startBreak(match, balls);
  match.breakShot = false;
  match.inHand = false;
  applyShot(match, balls, { firstId: null, potted: [], off: [], cuePotted: true, legalIds: ['b1'], railAfter: false, railBalls: 0 });
  check('suicídio passa a bola na mão', match.turn === 1 && match.inHand === 'table');
}

{
  const seats = [
    { name: 'A1', team: 0 }, { name: 'B1', team: 1 }, { name: 'A2', team: 0 }, { name: 'B2', team: 1 },
  ];
  const match = newMatch({ mode: 'bola8', seats, race: 2 });
  const balls = [];
  startBreak(match, balls);
  match.breakShot = false;
  match.open = false;
  match.groups = ['lisa', 'listra'];
  match.inHand = false;
  const solid = balls.find((b) => b.group === 'lisa' && b.n !== 8);
  solid.pocketed = true;
  applyShot(match, balls, { firstId: solid.id, potted: [solid.id], off: [], cuePotted: false, legalIds: [solid.id], railAfter: true, railBalls: 1 });
  check('dupla que encaçapa continua', match.turn === 0 && !match.frameOver);
}

{
  const seats = [{ name: 'A', team: 0 }, { name: 'B', team: 1 }];
  const match = newMatch({ mode: 'bolinho', seats, race: 5 });
  const balls = [];
  startBreak(match, balls);
  match.inHand = false;
  for (const id of ['b1', 'b2']) balls.find((b) => b.id === id).pocketed = true;
  applyShot(match, balls, { firstId: 'b3', potted: ['b3'], off: [], cuePotted: false });
  check('bolinho conta a última', match.bolinhos[0] === 1);
  const again = newMatch({ mode: 'bolinho', seats, race: 5 });
  const balls2 = [];
  startBreak(again, balls2);
  applyShot(again, balls2, { firstId: 'b1', potted: [], off: [], cuePotted: true });
  check('bolinho entrega na falta', again.bolinhos[1] === 1);
}

{
  const seats = [{ name: 'A', team: 0 }, { name: 'B', team: 1 }];
  const match = newMatch({ mode: 'bola8', seats, race: 2 });
  const balls = [];
  startBreak(match, balls);
  match.breakShot = false;
  match.inHand = false;
  const lisa = balls.find((b) => b.n === 1);
  const listra = balls.find((b) => b.n === 9);
  lisa.pocketed = true;
  listra.pocketed = true;
  applyShot(match, balls, { firstId: 'b1', potted: ['b1', 'b9'], off: [], cuePotted: false, legalIds: ['b1', 'b9'], railAfter: true, railBalls: 2 });
  check('pede o grupo', match.pending?.type === 'grupo' && match.turn === 0);
  resolveChoice(match, balls, 'listra');
  check('escolheu listrada', match.groups[0] === 'listra' && match.groups[1] === 'lisa' && !match.pending);
}

console.log(failed ? failed + ' falha(s)' : 'tudo certo');
process.exit(failed ? 1 : 0);
