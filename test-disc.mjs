// Disco Voador: o disco quica 3 vezes e some no 4º contato; acertar alguém tira 60 (2 discos matam); servidor faz igual.
// Uso: SITE=http://localhost:8123/ node test-disc.mjs
import { chromium } from 'playwright';
import { Game } from './server/src/game.js';
import { WEAPONS, DISC_W } from './shared/rules.js';
const SITE = process.env.SITE || 'http://localhost:8123/';
const fails = [], errors = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };

// ---- servidor (sem navegador) ----
{
  const g = new Game({ code: 'TEST', map: 'arena', max: 8, fillBots: true, mode: 'dm' }, { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} });
  let fake = 1000; g.now = () => fake; const a = g.join({ name: 'A' }).ent; g.welcome(a); g.onMessage(a.id, { t: 'start' }); a.connected = true;
  for (let i = 0; i < 5; i++) { fake += 0.05; g.tick(); }
  a.alive = true; a.hp = 100; a.slots = [DISC_W, 4, 7]; a.mag[DISC_W] = 4; a.reload = null;
  for (const b of g.ents.values()) if (b.bot) { b.alive = false; b.respawnAt = 1e9; } // ninguém no caminho
  const eye = { x: a.pos.x, y: a.pos.y + 1.6, z: a.pos.z };
  const all = []; const keep = g.io.broadcast; g.io.broadcast = (m) => { if (m && Array.isArray(m.ev)) all.push(...m.ev); };
  g.onEvent(a, ['dk', [eye.x, eye.y, eye.z], [1, -0.15, 0.3], g.now()]);
  for (let i = 0; i < 200; i++) { fake += 0.05; g.tick(); }
  const db = all.filter((e) => e[0] === 'db').length, dx = all.filter((e) => e[0] === 'dx').length, dl = all.filter((e) => e[0] === 'dl').length;
  ok(dl === 1 && db === 3 && dx === 1 && g.discs.length === 0 && a.mag[DISC_W] === 3, `servidor: disco sai, quica 3 vezes e some (dl ${dl}, db ${db}, dx ${dx}, pente ${a.mag[DISC_W]})`);
}

// ---- cliente ----
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { localStorage.setItem('docao.primary', '16'); });
await page.goto(SITE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__docao && window.__docao.startGame, null, { timeout: 120000, polling: 250 });
const G = (fn, a) => page.evaluate(fn, a);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 180000, polling: 50 }); };
await G(() => { const g = window.__docao; g.startGame('arena'); for (const e of g.entities) if (!e.isPlayer) { e.frozen = true; e.pos.set(999, -50, 999); } g.player.invulnUntil = g.time + 9999; });
await waitGame(0.6);
const w = await G(() => ({ weapon: window.__docao.player.weapon, mag: window.__docao.player.mag[16] }));
ok(w.weapon === DISC_W && w.mag === WEAPONS[DISC_W].mag, `Disco Voador na mão (${JSON.stringify(w)})`);
await G(() => { window.__discLog = []; const p = window.__docao.player; p.pitch = -0.25; });
await page.mouse.move(480, 270); await page.mouse.down(); await page.waitForTimeout(30); await page.mouse.up();
await page.waitForFunction(() => window.__docao.discs.length > 0, null, { timeout: 60000, polling: 50 });
await waitGame(0.25); await page.screenshot({ path: 'screenshots/disco-voando.png' });
await page.waitForFunction(() => window.__docao.discs.length === 0, null, { timeout: 180000, polling: 100 });
const log = await G(() => window.__discLog.join(','));
ok(log === 'b,b,b,x' || (log.startsWith('b') && log.endsWith('x') && log.split('b').length - 1 <= 3), `quica até 3 vezes e some no contato seguinte (${log})`);
// acerta um bot parado na frente: 60 de dano
await waitGame(0.8);
const target = await G(() => {
  const g = window.__docao, p = g.player, bot = g.entities.find((e) => !e.isPlayer);
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  bot.pos.set(p.pos.x + fx * 4, p.pos.y, p.pos.z + fz * 4); bot.alive = true; bot.hp = 100; bot.invulnUntil = 0; p.pitch = -0.12;
  window.__discLog = []; return bot.name;
});
await waitGame(0.2);
await page.mouse.down(); await page.waitForTimeout(30); await page.mouse.up();
await page.waitForFunction(() => (window.__discLog || []).some((x) => x !== 'b'), null, { timeout: 120000, polling: 50 });
const hit = await G((n) => { const b = window.__docao.entities.find((e) => e.name === n); return { hp: Math.round(b.hp), log: window.__discLog.join(',') }; }, target);
ok(hit.log.includes('hit') && (hit.hp === 40 || hit.hp === 10), `disco acerta o bot e some (${JSON.stringify(hit)})`);
await page.screenshot({ path: 'screenshots/disco-fp.png' });
ok(errors.length === 0, `sem erro no console${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
