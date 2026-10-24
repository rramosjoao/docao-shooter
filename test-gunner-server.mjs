// Chopper da granja no servidor (sem navegador): ciclo de streaks (10 = Chopper, 15 = nuke), banco que sobrevive à morte,
// helicóptero do dono com vida 2×, tiro 'gf' (sniper mata, cadência limitada, não conta pra sequência) e 'gx' (sai antes).
// Uso: node test-gunner-server.mjs
import { Game } from './server/src/game.js';
import { streakRewards, GUNNER, HELI } from './shared/killstreaks.js';
const fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };

ok(streakRewards(10).join() === 'gunner' && streakRewards(15).join() === 'nuke' && streakRewards(7).join() === 'heli', `ciclo: 7 Gavião, 10 Chopper, 15 nuke (${streakRewards(10)}, ${streakRewards(15)})`);
const g = new Game({ code: 'TEST', map: 'arena', max: 8, fillBots: true, mode: 'dm' }, { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} });
let fake = 1000; g.now = () => fake; const a = g.join({ name: 'A' }).ent; g.welcome(a); g.onMessage(a.id, { t: 'start' });
a.connected = true;
const step = (n = 1) => { for (let i = 0; i < n; i++) { fake += 0.05; g.tick(); } };
step(5);
if (!a.alive) { a.alive = true; a.hp = 100; }
a.invulnUntil = 1e9;
for (let i = 0; i < 10; i++) g.streakKill(a);
ok(a.ksBank.gunner === 1, `10 abates guardam um Chopper (${JSON.stringify(a.ksBank)})`);
g.kill(a, null, 0, false); // morreu: a sequência zera, o banco fica
ok(a.ksKills === 0 && a.ksBank.gunner === 1, `morrer zera a sequência mas mantém o Chopper guardado (${a.ksKills}, ${JSON.stringify(a.ksBank)})`);
a.alive = true; a.hp = 100; a.invulnUntil = 1e9;
g.events.length = 0;
g.onEvent(a, ['ks', 'g']);
const h = g.helis.find((x) => x.owner === a && x.gunner);
const hl = g.events.find((e) => e[0] === 'hl');
ok(h && h.hp === HELI.hp * 2 && hl && hl[8] === 1 && Math.round(h.until - g.T) === GUNNER.life, `F chama o Chopper: vida ${h && h.hp} (2× Gavião), ${GUNNER.life} s, evento marcado`);
g.onEvent(a, ['ks', 'g']);
ok(g.helis.filter((x) => x.owner === a && x.gunner).length === 1, 'sem Chopper guardado não chama outro');
// não atira sozinho
g.events.length = 0; step(40);
ok(!g.events.some((e) => e[0] === 'hs' && e[1] === h.id), 'o Chopper não atira sozinho (quem atira é o dono)');
// sniper: mira num bot parado embaixo e mata com um tiro; abate não conta pra sequência
const bot = [...g.ents.values()].find((e) => e.bot && e.alive);
const hp = g.heliAt(h), o = { x: hp.x, y: hp.y - 1.6, z: hp.z };
// acha um lugar no chão com linha livre do helicóptero (sem parede/telhado no caminho)
let d = null;
for (let i = 0; i < 200 && !d; i++) {
  const p = { x: (Math.random() * 2 - 1) * 14, z: (Math.random() * 2 - 1) * 14 }, y = g.P.groundAt(p.x, p.z, 3);
  const c = { x: p.x, y: y + 0.8, z: p.z }, dd = { x: c.x - o.x, y: c.y - o.y, z: c.z - o.z }, L = Math.hypot(dd.x, dd.y, dd.z);
  const w = g.P.rayWorld(o, { x: dd.x / L, y: dd.y / L, z: dd.z / L }, 200);
  if (w == null || w > L) { bot.pos = { x: p.x, y, z: p.z }; d = dd; }
}
bot.invulnUntil = 0; bot.hp = 100;
g.events.length = 0; const ks0 = a.ksKills;
g.onEvent(a, ['gf', 'sniper', [d.x, d.y, d.z]]);
const gs = g.events.find((e) => e[0] === 'gs'), k = g.events.find((e) => e[0] === 'k');
ok(!bot.alive && k && gs && gs[3] === 1 && a.ksKills === ks0, `sniper do Chopper mata (${bot.hp}) e não soma na sequência (${a.ksKills})`);
// cadência: dois tiros de sniper colados = o segundo é recusado
const before = a.rejectedShots || 0;
g.onEvent(a, ['gf', 'sniper', [0, -1, 0]]);
ok((a.rejectedShots || 0) === before + 1, 'cadência: sniper colado é recusado');
// minigun respeita a cadência dela
fake += 0.1; g.tick();
g.events.length = 0; g.onEvent(a, ['gf', 'mini', [0, -1, 0]]); const m1 = g.events.filter((e) => e[0] === 'gs').length;
fake += GUNNER.mini.rate; g.tick(); // o tick manda e limpa os eventos
g.events.length = 0; g.onEvent(a, ['gf', 'mini', [0, -1, 0]]); const m2 = g.events.filter((e) => e[0] === 'gs').length;
ok(m1 === 1 && m2 === 1, `minigun atira na cadência dela (${m1}, ${m2})`);
// sair antes: 'gx'
g.events.length = 0; g.onEvent(a, ['ks', 'gx']);
ok(!h.alive && g.events.some((e) => e[0] === 'hx' && e[1] === h.id), 'F sai: o Chopper vai embora');
g.onEvent(a, ['gf', 'mini', [0, -1, 0]]);
ok(!g.events.some((e) => e[0] === 'gs'), 'depois de sair não atira mais');
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
