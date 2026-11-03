// Pokébola: "pokebola" no chat dá uma; Q joga ela no lugar do copo; ao abrir engole os inimigos no raio (somem, sem bacon).
// Uso: SITE=http://localhost:8123/ node test-pokebola.mjs
import { chromium } from 'playwright';
import { Game } from './server/src/game.js';
import { POKE, isPokeCode } from './shared/rules.js';
const SITE = process.env.SITE || 'http://localhost:8123/';
const fails = [], errors = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
ok(isPokeCode('pokebola') && isPokeCode('POKÉBOLA!') && isPokeCode('quero uma poke bola') && !isPokeCode('bola'), 'código: pokebola, pokébola, poke bola');

// ---- servidor ----
{
  const sent = []; const g = new Game({ code: 'TEST', map: 'arena', max: 8, fillBots: true, mode: 'dm' }, { send(id, m) { sent.push(m); }, broadcast() {}, startLoop() {}, stopLoop() {} });
  let fake = 1000; g.now = () => fake; const a = g.join({ name: 'A' }).ent; g.welcome(a); g.onMessage(a.id, { t: 'start' }); a.connected = true;
  for (let i = 0; i < 5; i++) { fake += 0.05; g.tick(); }
  a.alive = true; a.hp = 100; a.invulnUntil = 1e9;
  g.onMessage(a.id, { t: 'say', text: 'pokebola' });
  ok(a.pokeballs === 1, `servidor: "pokebola" no chat dá uma Pokébola (${a.pokeballs})`);
  // dois bots perto do ponto onde a bola vai cair, um longe
  const bots = [...g.ents.values()].filter((e) => e.bot); const spot = { x: a.pos.x, y: a.pos.y, z: a.pos.z };
  for (const b of bots) { b.alive = true; b.hp = 100; b.invulnUntil = 0; b.frozenTest = true; }
  bots[0].pos = { ...spot, x: spot.x + 1.5 }; bots[1].pos = { ...spot, z: spot.z + 1.5 }; bots[2].pos = { ...spot, x: spot.x + POKE.radius + 6 };
  const all = []; g.io.broadcast = (m) => { if (m && Array.isArray(m.ev)) all.push(...m.ev); };
  g.onEvent(a, ['n', [spot.x, spot.y + 1.6, spot.z], [0, 0.1, 0], 'p']);
  ok(a.pokeballs === 0 && g.nades.some((n) => n.poke), 'servidor: Q com Pokébola joga ela (sem gastar copo)');
  for (let i = 0; i < 40; i++) { for (const b of bots.slice(0, 3)) if (b.alive) { b.pos = b === bots[0] ? { ...spot, x: spot.x + 1.5 } : b === bots[1] ? { ...spot, z: spot.z + 1.5 } : { ...spot, x: spot.x + POKE.radius + 6 }; b.vel = { x: 0, y: 0, z: 0 }; } fake += 0.05; g.tick(); }
  const pke = all.find((e) => e[0] === 'pke');
  ok(pke && !bots[0].alive && !bots[1].alive && bots[2].alive && pke[3].length === 2, `servidor: abre e engole os 2 de perto, o de longe escapa (${pke && pke[3].length})`);
}

// ---- cliente (offline, pelo chat) ----
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(SITE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__docao && window.__docao.startGame, null, { timeout: 120000, polling: 250 });
const G = (fn, a) => page.evaluate(fn, a);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 180000, polling: 50 }); };
await G(() => { const g = window.__docao; g.startGame('arena'); for (const e of g.entities) if (!e.isPlayer) { e.frozen = true; e.pos.set(999, -50, 999); } g.player.invulnUntil = g.time + 9999; });
await waitGame(0.5);
await page.keyboard.press('KeyT'); await page.waitForTimeout(200);
const open = await G(() => !document.getElementById('chatForm').classList.contains('hidden'));
await page.keyboard.type('pokebola'); await page.keyboard.press('Enter'); await waitGame(0.2);
const got = await G(() => window.__docao.player.pokeballs);
ok(open && got === 1, `offline: T abre o chat e "pokebola" dá a Pokébola (${open}, ${got})`);
// bots perto do ponto de queda: joga reto pra baixo na frente dos pés
const names = await G(() => {
  const g = window.__docao, p = g.player, bs = g.entities.filter((e) => !e.isPlayer);
  for (let i = 0; i < 24; i++) { p.yaw = i / 24 * Math.PI * 2; bs[0].pos.set(p.pos.x - Math.sin(p.yaw) * 4, p.pos.y, p.pos.z - Math.cos(p.yaw) * 4); if (g.visible(bs[0])) break; }
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), bx = p.pos.x + fx * 4, bz = p.pos.z + fz * 4;
  bs[0].pos.set(bx + 1, p.pos.y, bz); bs[1].pos.set(bx - 1, p.pos.y, bz + 0.5); bs[2].pos.set(p.pos.x - fx * 30, p.pos.y, p.pos.z - fz * 30);
  for (const b of bs) { b.alive = true; b.hp = 100; b.invulnUntil = 0; }
  p.pitch = -0.55; window.__pokeEaten = 0;
  return bs.slice(0, 3).map((b) => b.name);
});
await page.mouse.move(480, 270);
await page.keyboard.down('KeyQ'); await waitGame(0.15); await page.keyboard.up('KeyQ');
await waitGame(0.3); await page.screenshot({ path: 'screenshots/pokebola-voando.png' });
await page.waitForFunction(() => window.__docao.pokeFx.length > 0, null, { timeout: 120000, polling: 50 });
await waitGame(0.3); await page.screenshot({ path: 'screenshots/pokebola-abriu.png' });
await waitGame(0.5);
const res = await G((ns) => { const g = window.__docao; return { eaten: window.__pokeEaten, alive: ns.map((n) => g.entities.find((e) => e.name === n).alive), visible: ns.map((n) => g.entities.find((e) => e.name === n).model.group.visible), balls: g.player.pokeballs, nades: g.player.nades, feed: (window.__feedLog || []).slice(-2) }; }, names);
ok(res.eaten >= 1 && !res.alive[0] && !res.visible[0] && res.alive[2] && res.balls === 0, `offline: engole quem tá perto, some sem bacon, o de longe escapa (${JSON.stringify(res)})`);
ok(res.feed.some((f) => f.includes('[Pokébola]')), 'killfeed mostra Pokébola');
ok(errors.length === 0, `sem erro no console${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
