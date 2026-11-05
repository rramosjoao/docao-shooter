// Grelha no servidor: 13 abates armam, o tiro 'af' continua autoritativo (dano e cadência iguais),
// a vida do avião agora desce quando alguém atira nele (antes o hp 420 não era ligado em nada).
// Uso: node test-grelha-server.mjs
import { Game } from './server/src/game.js';
import { streakRewards, AC130 } from './shared/killstreaks.js';
import { WEAPONS } from './shared/rules.js';
const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const SNIPER = WEAPONS.findIndex((w) => w.key === 'sniper');

ok(streakRewards(13).join() === 'ac130' && AC130.hit > 0, `ciclo 13 = Grelha, raio de acerto ${AC130.hit}`);
const g = new Game({ code: 'TEST', map: 'arena', max: 8, fillBots: true, mode: 'dm' }, { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} });
let fake = 1000; g.now = () => fake; const a = g.join({ name: 'Ana' }).ent; g.welcome(a); g.onMessage(a.id, { t: 'start' });
a.connected = true;
const step = (n = 1) => { for (let i = 0; i < n; i++) { fake += 0.05; g.tick(); } };
step(5);
if (!a.alive) { a.alive = true; a.hp = 100; }
a.invulnUntil = 1e9;
for (let i = 0; i < 13; i++) g.streakKill(a);
ok(a.ksBank.ac130 === 1 && a.ksKills === 13, `13 abates guardam a Grelha (${JSON.stringify(a.ksBank)})`);
g.events.length = 0;
g.onEvent(a, ['ks', 'a']);
const ship = g.gunships.find((h) => h.owner === a && h.alive);
const al = g.events.find((e) => e[0] === 'al');
ok(!!ship && ship.hp === AC130.hp && !!al, `F chama a Grelha com ${ship && ship.hp} de vida`);

const bot = [...g.ents.values()].find((e) => e.bot && e.alive);
const hp = g.heliAt(ship), o = { x: hp.x, y: hp.y - 1.2, z: hp.z };
let aim = null;
for (let i = 0; i < 240 && !aim; i++) {
  const p = { x: hp.x + (Math.random() * 2 - 1) * 6, z: hp.z + (Math.random() * 2 - 1) * 6 };
  const y = g.P.groundAt(p.x, p.z, 3);
  const c = { x: p.x, y: y + 0.9, z: p.z };
  const dd = { x: c.x - o.x, y: c.y - o.y, z: c.z - o.z };
  const L = Math.hypot(dd.x, dd.y, dd.z) || 1;
  const dir = { x: dd.x / L, y: dd.y / L, z: dd.z / L };
  const w = g.P.rayWorld(o, dir, 200);
  if (w == null || w > L - 0.4) { bot.pos = { x: p.x, y, z: p.z }; aim = [dir.x, dir.y, dir.z]; }
}
bot.invulnUntil = 0; bot.hp = 100;
const ks0 = a.ksKills;
g.events.length = 0;
g.onEvent(a, ['af', 'espeto', aim]);
const as = g.events.find((e) => e[0] === 'as');
ok(as && as[3] === 0 && bot.hp === 100 - AC130.espeto.dmg && a.ksKills === ks0, `espeto acerta ${AC130.espeto.dmg} e não soma sequência (hp ${bot.hp}, ks ${a.ksKills})`);
const rej = a.rejectedShots || 0;
g.onEvent(a, ['af', 'espeto', aim]);
ok((a.rejectedShots || 0) === rej + 1, 'cadência do espeto recusa o tiro colado');

fake += AC130.panela.rate;
g.events.length = 0;
bot.hp = 100; bot.alive = true; bot.invulnUntil = 0;
g.onEvent(a, ['af', 'panela', aim]);
const pan = g.events.find((e) => e[0] === 'as');
ok(pan && pan[3] === 1 && bot.hp < 100, `panela estoura (tipo ${pan && pan[3]}, hp ${bot.hp})`);

// alguém no chão acerta o avião: a vida desce de verdade
const before = ship.hp;
const up = { x: hp.x, y: hp.y - 12, z: hp.z };
g.events.length = 0;
g.hitscan(bot, up, [{ x: 0, y: 1, z: 0 }], SNIPER);
ok(ship.hp < before && g.events.some((e) => e[0] === 'ah' && e[1] === ship.id), `tiro de baixo tira vida da Grelha (${before} → ${ship.hp})`);

if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
