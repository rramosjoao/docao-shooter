// Indicador de direção do dano: regras puras (fusão ≤30°, limite de 4, origem) e origem enviada pelo servidor ([7] do evento 'h').
// Sem GPU ou serviços externos: node test-damage-indicator.mjs
// Testes do servidor e a ideia da fusão: @felipe-cheers (PR #15), adaptados ao indicador de arcos da v1.12.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from './server/src/game.js';
import { addHit, hitBearing, hitPoint, hitAlpha, HIT_DIR_LIFE, HIT_DIR_CAP } from './damage-dir.js';

const zero = { x: 0, y: 0, z: 0 };
const point = (deg) => ({ x: Math.sin(deg * Math.PI / 180) * 10, y: 0, z: Math.cos(deg * Math.PI / 180) * 10 });
const deg = (rad) => rad * 180 / Math.PI;

test('direção no mundo: frente, direita, costas e esquerda', () => {
  for (const a of [0, 90, 180, -90]) assert.ok(Math.abs(Math.abs(deg(hitBearing(point(a), zero)) - a) % 360) < 1e-6 || Math.abs(Math.abs(deg(hitBearing(point(a), zero)) - a) - 360) < 1e-6);
  assert.equal(hitBearing(zero, zero), null);
});

test('golpes a ≤30° renovam o mesmo arco, inclusive ao cruzar 180 graus; mais longe vira outro arco', () => {
  const marks = [];
  addHit(marks, point(170), zero, 0); const r = addHit(marks, point(-170), zero, 0.6);
  assert.equal(marks.length, 1); assert.equal(r.mark.t, 0.6); assert.equal(r.dropped, null);
  addHit(marks, point(100), zero, 0.7); assert.equal(marks.length, 2);
  addHit(marks, point(160), zero, 0.8); assert.equal(marks.length, 2); // 160 funde com o de 180/-170
});

test('limite de quatro arcos: o mais antigo sai, os renovados ficam', () => {
  const marks = [];
  for (const [n, a] of [0, 60, 120, 180].entries()) addHit(marks, point(a), zero, n * 0.01);
  addHit(marks, point(0), zero, 0.04); // renova o de 0°
  const r = addHit(marks, point(-60), zero, 0.05);
  assert.equal(marks.length, HIT_DIR_CAP); assert.ok(r.dropped && Math.abs(deg(hitBearing(r.dropped, zero)) - 60) < 1e-6); // saiu o mais antigo (60°), não o de 0° renovado
  assert.ok(marks.some((m) => Math.abs(hitBearing(m, zero)) < 1e-6));
});

test('origem ausente, inválida ou em cima da vítima não cria arco; aceita {x,z} e [x,y,z]', () => {
  const marks = [];
  for (const o of [null, undefined, {}, [NaN, 0, 2], [0, 0], zero]) assert.equal(addHit(marks, o, zero, 0), null);
  assert.equal(marks.length, 0);
  assert.ok(addHit(marks, [10, 0, 0], zero, 0)); assert.ok(addHit(marks, { x: 0, z: -10 }, zero, 0)); assert.equal(marks.length, 2);
  assert.deepEqual(hitPoint([1, 2, 3]), { x: 1, z: 3 });
});

test('fade: cheio no começo, some em 1,5 s', () => {
  assert.equal(hitAlpha(0), 1); assert.equal(hitAlpha(0.3), 1);
  assert.ok(hitAlpha(0.9) > 0 && hitAlpha(0.9) < 1); assert.equal(hitAlpha(HIT_DIR_LIFE), 0);
});

function room(mode = 'dm') {
  const g = new Game({ code: 'TEST', mode, fillBots: false }, { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} });
  const a = g.makeEnt({ name: 'Atacante' }), t = g.makeEnt({ name: 'Vítima' });
  for (const e of [a, t]) { e.alive = true; e.invulnUntil = 0; }
  a.pos = { x: 12, y: 0, z: 3 }; g.P = { losClear: () => true };
  return { g, a, t };
}

test('servidor preserva dano, headshot e flags de parede e congela a origem', () => {
  const { g, a, t } = room();
  g.damage(t, 10, a, 0, true, false, null, 3);
  const ev = g.events.find((e) => e[0] === 'h');
  assert.deepEqual(ev, ['h', t.id, a.id, 90, 1, 10, 3, [12, 0, 3]]);
  a.pos.x = 99; assert.equal(ev[7][0], 12);
});

test('explosão própria aponta para a explosão; névoa e dano sem fonte não inventam direção', () => {
  const { g, t } = room();
  const c = { x: 2, y: 1, z: 0 };
  g.blast(c, t, { radius: 8, maxDmg: 10, selfMul: 0.4, knock: 0, lift: 0, wIdx: 0, kind: 'n' });
  assert.deepEqual(g.events.find((e) => e[0] === 'h')[7], [2, 1, 0]);
  g.events.length = 0; g.damage(t, 1, null, 0, false);
  assert.equal(g.events[0][7], null);
  g.events.length = 0; g.damage(t, 1, { fog: true, id: 0, pos: c }, 0, false);
  assert.equal(g.events[0][7], null);
});

test('invulnerabilidade e fogo amigo bloqueado não emitem evento de dano', () => {
  const { g, a, t } = room('dom');
  t.invulnUntil = 10; g.damage(t, 10, a, 0, false);
  assert.equal(g.events.length, 0);
  t.invulnUntil = 0; a.team = t.team = 0; g.damage(t, 10, a, 0, false);
  assert.equal(g.events.length, 0); assert.equal(t.hp, 100);
});

test('Gavião usa a posição do helicóptero em vez do dono', (test) => {
  test.mock.method(Math, 'random', () => 0.99);
  const { g, a, t } = room();
  const h = { id: 1, alive: true, owner: a, until: 10, cool: 0, born: 0, ang: 0, orbit: 15 };
  g.helis = [h];
  g.stepHelis(0.05);
  const ev = g.events.find((e) => e[0] === 'h');
  assert.ok(ev); assert.deepEqual(ev[7], Object.values(g.heliAt(h)));
  assert.notEqual(ev[7][0], a.pos.x);
});


test('pau de choque: o arco aponta pra estaca (origem = topo da estaca), não pro dono', () => {
  const { g, a, t } = room(); a.pos = { x: 50, y: 0, z: 50 }; t.pos = { x: 0, y: 0, z: 0 }; t.hp = 100; g.P = { ...g.P, rayWorldN: () => null, groundAt: () => 0 };
  g.shocks.push({ id: 1, owner: a, pos: { x: 2, y: 0, z: 0 }, n: { x: 0, y: 1, z: 0 }, vel: { x: 0, y: 0, z: 0 }, t: 0, stuck: true, until: 5, nextPulse: 0 });
  g.T = 0.1; g.stepShocks(0.05);
  assert.deepEqual(g.events.find((e) => e[0] === 'h')[7], [2, 0.5, 0]);
});
