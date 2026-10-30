// Munição na Invasão: mais caixas nos dois mapas (alcançáveis, fora de parede), respawn curto, mais munição por caixa
// e caixa que o zumbi solta. Só Node. Uso: node test-invasao-municao.mjs
import { Game } from './server/src/game.js';
import { getMap } from './maps.js';
import { mapSolids, createPhysics } from './shared/physics.js';
import { buildNav } from './nav.js';
import { WEAPONS, PISTOL, KNIFE } from './shared/rules.js';
import { INV_AMMO, DROP_KEYS, invRefillAmmo, INV } from './shared/invasion.js';
const fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };

// ---- regra pura ----
{
  const e = { slots: [0, PISTOL, KNIFE], mag: WEAPONS.map(() => 0), reserve: WEAPONS.map(() => 0) };
  ok(invRefillAmmo(e, WEAPONS) && e.reserve[0] === WEAPONS[0].reserve && e.mag[0] === WEAPONS[0].mag, `caixa em reserva zerada: reserva cheia (${e.reserve[0]}) e pente cheio (${e.mag[0]})`);
  invRefillAmmo(e, WEAPONS);
  ok(e.reserve[0] === Math.ceil(WEAPONS[0].reserve * INV_AMMO.reserveMul) && e.reserve[0] > WEAPONS[0].reserve, `segunda caixa leva a reserva a ${INV_AMMO.reserveMul}× (${e.reserve[0]} > ${WEAPONS[0].reserve})`);
  ok(!invRefillAmmo(e, WEAPONS), 'cheio de verdade: a caixa não é gasta à toa');
  ok(e.reserve[KNIFE] === 0 && !e.slots.includes(-1), 'faca não ganha munição');
  const r = { slots: [3, PISTOL, KNIFE], mag: WEAPONS.map((w) => w.mag), reserve: WEAPONS.map((w) => w.reserve) }; r.reserve[3] = 0; invRefillAmmo(r, WEAPONS);
  ok(r.reserve[3] === INV_AMMO.rockets, `bazuca: +${INV_AMMO.rockets} foguetes por caixa (${r.reserve[3]})`);
  ok(INV_AMMO.respawn <= 8 && DROP_KEYS.includes('ammo') && DROP_KEYS.indexOf('ammo') === 6, `respawn de ${INV_AMMO.respawn} s (antes 15 s) e 'ammo' no índice 6 do dp/dg`);
}

// ---- mapas: quantidade, chão livre e alcançável ----
const antes = { rodizio: 6, 'fazenda-assombrada': 4 };
for (const id of ['rodizio', 'fazenda-assombrada']) {
  const map = getMap(id), solids = mapSolids(map), P = createPhysics(solids, map.size);
  const spawns = map.spawns.map(([x, z, y = 0]) => ({ x, y: P.groundAt(x, z, y + 0.3), z }));
  const nav = buildNav({ hx: map.size[0], hz: map.size[1], spacing: map.navSpacing || 2, collides: P.collides, groundAt: P.groundAt, solids, topAt: P.topAt, seeds: spawns.map((s) => [s.x, s.y, s.z]), extra: map.waypoints || [] });
  const ammo = map.pickups.filter((p) => p[0] === 'ammo');
  ok(ammo.length >= antes[id] * 3, `${id}: ${ammo.length} caixas de munição (antes ${antes[id]})`);
  const bad = [], far = [];
  for (const [, x, z, y] of ammo) {
    const gy = P.groundAt(x, z, (y || 0) + 0.3);
    if (P.collides(x, gy, z) || Math.abs(x) > map.size[0] - 1 || Math.abs(z) > map.size[1] - 1) bad.push([x, z]);
    let d = 1e9; for (const n of nav.nodes) d = Math.min(d, Math.hypot(n.x - x, n.z - z) + Math.abs(n.y - gy) * 3);
    if (d > 2.2) far.push([x, z, +d.toFixed(1)]);
  }
  ok(bad.length === 0, `${id}: nenhuma caixa dentro de parede ou fora do mapa ${JSON.stringify(bad)}`);
  ok(far.length === 0, `${id}: todas ao alcance do nav (alcançáveis a pé) ${JSON.stringify(far)}`);
  const dm = (a, b) => Math.hypot(a[1] - b[1], a[2] - b[2]);
  const nearSpawn = ammo.filter((a) => map.spawns.some((s) => Math.hypot(a[1] - s[0], a[2] - s[1]) < 12)).length;
  const mid = ammo.filter((a) => Math.hypot(a[1], a[2]) < Math.max(map.size[0], map.size[1]) * 0.5).length;
  ok(nearSpawn >= 3 && mid >= 6, `${id}: ${nearSpawn} caixas perto dos spawns e ${mid} no meio do mapa`);
  void dm;
}

// ---- servidor ----
const mk = (map) => {
  const g = new Game({ code: 'TEST', map, max: 4, fillBots: false, mode: 'inv' }, { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} });
  let fake = 1000; g.now = () => fake; const a = g.join({ name: 'A' }).ent; g.welcome(a); g.onMessage(a.id, { t: 'start' }); a.connected = true;
  const step = (n = 1, d = 0.05) => { for (let i = 0; i < n; i++) { fake += d; a.vel = { x: 0, y: 0, z: 0 }; if (a.alive) { a.hp = 100; a.invulnUntil = 1e9; } g.tick(); } };
  step(5); return { g, a, step };
};
for (const id of ['rodizio', 'fazenda-assombrada']) {
  const { g, a, step } = mk(id);
  ok(g.mapId === id && g.pickups.filter((p) => p.type === 'ammo').length >= antes[id] * 3, `servidor (${id}): ${g.pickups.filter((p) => p.type === 'ammo').length} caixas de munição`);
  a.alive = true;
  const p = g.pickups.find((q) => q.type === 'ammo' && q.pos.y < 0.5);
  a.pos.x = p.pos.x; a.pos.y = p.pos.y; a.pos.z = p.pos.z; a.reserve[a.slots[0]] = 0; a.mag[a.slots[0]] = 0;
  const T0 = g.T; step(2);
  ok(!p.active && a.reserve[a.slots[0]] === WEAPONS[a.slots[0]].reserve && a.mag[a.slots[0]] === WEAPONS[a.slots[0]].mag, `servidor (${id}): pisou na caixa → reserva e pente cheios`);
  ok(Math.abs(p.respawnAt - T0 - INV_AMMO.respawn) < 0.5, `servidor (${id}): caixa volta em ${INV_AMMO.respawn} s (${(p.respawnAt - T0).toFixed(1)})`);
  a.pos.x = 0; a.pos.z = 0; step(Math.ceil((INV_AMMO.respawn + 1) / 0.05));
  ok(p.active, `servidor (${id}): a caixa reaparece depois do respawn curto`);
  // zumbi solta caixa
  const I = g.inv; a.pos.x = p.pos.x + 20; a.pos.z = p.pos.z; a.reserve[a.slots[0]] = 0; a.mag[a.slots[0]] = 0;
  const evs0 = g.events.length; const d = I.dropAmmo({ x: a.pos.x + 3, y: a.pos.y, z: a.pos.z }, 0);
  ok(g.events.slice(evs0).some((e) => e[0] === 'dp' && e[2] === 6), `servidor (${id}): zumbi solta caixa ('dp' com índice 6)`);
  a.pos.x = d.x; a.pos.z = d.z; a.pos.y = d.y; step(2);
  ok(!I.drops.includes(d) && a.reserve[a.slots[0]] > 0 && a.mag[a.slots[0]] === WEAPONS[a.slots[0]].mag, `servidor (${id}): pegou a caixa do zumbi → munição na hora`);
  ok(g.startMsg().drops.every((x) => x[1] >= 0), `servidor (${id}): 'start' leva os drops com índice válido`);
}
// zumbi que morre solta (chance) — força o sorteio
{
  const { g, a, step } = mk('rodizio'); const I = g.inv; let got = 0;
  for (let i = 0; i < 200; i++) { const n0 = I.drops.length; const z = { id: 9000 + i, zt: 'tank', pos: { x: 5, y: 0, z: 5 }, alive: true }; I.onZombieDeath(z, null); got += I.drops.slice(n0).filter((d) => d.kind === 'ammo').length; I.drops.length = 0; }
  ok(got > 40 && got < 120, `Barrigão solta caixa de munição em ~40% das mortes (${got}/200)`);
}
console.log(fails.length ? '\nFALHOU ' + fails.length : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
