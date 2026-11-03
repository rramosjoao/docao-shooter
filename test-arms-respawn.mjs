import assert from 'node:assert/strict';
import { Game } from './server/src/game.js';
import { ARMS_RACE, ARMS_LAST, equipArmsRace } from './shared/arms-race.js';
const io = { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} };
for (const mode of ['arms', 'dm']) {
  const g = new Game({ mode, map: 'arena', fillBots: false }, io);
  const { ent: p } = g.join({ name: 'Teste' });
  g.startMatch('arena');
  p.armsStage = 4; p.armsKills = 1;
  g.kill(p, null, p.weapon, false);
  const delay = p.respawnAt - g.T;
  assert.equal(delay, mode === 'arms' ? ARMS_RACE.respawnTime : 5);
  if (mode === 'arms') {
    assert.equal(delay, 3);
    g.T = p.respawnAt;
    g.spawn(p);
    assert.equal(p.armsStage, 4);
    assert.equal(p.armsKills, 1);
  }
}
console.log('OK: Corrida Armada renasce em 3 s, mantém progresso; Mata-mata mantém 5 s.');

const final = { armsStage: ARMS_LAST, armsKills: 0 };
equipArmsRace(final);
assert.deepEqual(final.slots, [final.primary]);
assert.notEqual(final.primary, 7);
assert.equal(final.melee, final.primary);
final.armsStage--; equipArmsRace(final);
assert.equal(final.slots[2], 7);
console.log('OK: etapa final só com dourada; regredir devolve faca padrão.');
