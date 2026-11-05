// node test-grenade.mjs — preview × cliente em vários FPS × servidor real.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createPhysics } from './shared/physics.js';
import { NADE, POKE } from './shared/rules.js';
import { Game } from './server/src/game.js';

const vector = (x = 0, y = 0, z = 0) => ({ x, y, z });
const box = (a, b) => ({ min: vector(...a), max: vector(...b) });
const cases = [
  ['chão e quiques', [], vector(0, 1.5, 0), vector(0, 6, -18)],
  ['parede fina', [box([-5, 0, -4], [5, 8, -3.9])], vector(0, 1.5, 0), vector(0, 3, -22)],
  ['teto baixo', [box([-8, 2.2, -8], [8, 3, 8])], vector(0, 1.5, 0), vector(2, 18, -2)],
  ['rampa', [{ ...box([-4, 0, -8], [4, 2, 0]), ramp: { axis: 'z', dir: 1 } }], vector(0, 3, -6), vector(0, -2, 4)],
];
const close = (a, b) => { for (const k of ['x', 'y', 'z']) assert.ok(Math.abs(a[k] - b[k]) < 1e-7, `${k}: ${a[k]} ≠ ${b[k]}`); };
for (const [name, solids, pos, vel] of cases) test(`${name}: mesma trajetória em 20/30/60/144 FPS e frames irregulares`, () => {
  const p = createPhysics(solids, [50, 50]);
  for (const poke of [false, true]) {
    const life = poke ? POKE.fuse : NADE.fuse;
    const expected = { pos: { ...pos }, vel: { ...vel } };
    for (let i = 0; i < Math.round(life / NADE.step); i++) p.stepNade(expected.pos, expected.vel, NADE.step);
    for (const pattern of [[1 / 20], [1 / 30], [1 / 60], [1 / 144], [0.013, 0.041, 0.006, 0.12]]) {
      const actual = { poke, pos: { ...pos }, vel: { ...vel } }; let time = 0, i = 0;
      while (time < life + 0.2) { const dt = pattern[i++ % pattern.length]; p.advanceNade(actual, dt); time += dt; }
      close(actual.pos, expected.pos); close(actual.vel, expected.vel);
    }
  }
});

test('preview continua depois do primeiro quique e termina exatamente na explosão', () => {
  const p = createPhysics([], [50, 50]);
  const pos = vector(0, 1.5, 0), vel = vector(0, 3, -18); let first;
  for (let i = 0; i < Math.round(NADE.fuse / NADE.step); i++) {
    if (p.stepNade(pos, vel, NADE.step) && !first) first = { ...pos };
  }
  assert.ok(first && Math.abs(first.z - pos.z) > 2);
});

test('servidor usa a mesma previsão, inclusive com um tick que passa do pavio', () => {
  const g = new Game({ code: 'NADE', map: 'arena', max: 2, fillBots: false, mode: 'dm' }, { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} });
  const owner = g.join({ name: 'Teste' }).ent; g.welcome(owner); g.onMessage(owner.id, { t: 'start' });
  for (const poke of [false, true]) {
    const origin = vector(-25, 1.5, -25), velocity = vector(5, 6, -8), life = poke ? POKE.fuse : NADE.fuse;
    const expected = { pos: { ...origin }, vel: { ...velocity } };
    for (let i = 0; i < Math.round(life / NADE.step); i++) g.P.stepNade(expected.pos, expected.vel, NADE.step);
    g.T = 0; g.throwNade(owner, origin, velocity, poke); const n = g.nades.at(-1); let actual;
    g.blast = (p) => { actual = { ...p }; }; g.pokeOpen = (n) => { actual = { ...n.pos }; };
    for (let i = 1; i < 100 && g.nades.includes(n); i++) { g.T = i * 0.047; g.stepProjectiles(0.047); }
    assert.ok(actual); close(actual, expected.pos); assert.ok(!g.nades.includes(n));
  }
});
