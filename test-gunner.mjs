// Chopper da granja (Chopper Gunner) offline: câmera no helicóptero, minigun esquenta e trava, sniper com zoom, abates, dura 60 s.
// Uso: SITE=http://localhost:8123/ node test-gunner.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8123/';
const fails = [], errors = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(SITE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__docao && window.__docao.startGame, null, { timeout: 120000, polling: 250 });
const G = (fn, a) => page.evaluate(fn, a);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 120000, polling: 50 }); };
await G(() => { const g = window.__docao; g.startGame('arena'); for (const e of g.entities) { e.invulnUntil = 0; if (!e.isPlayer) e.frozen = true; } g.player.invulnUntil = g.time + 9999; });
await waitGame(0.3);
await G(() => window.__docao.grantGunner());
await page.waitForFunction(() => window.__docao.gunner, null, { timeout: 120000, polling: 50 });
const on = await G(() => { const g = window.__docao, h = g.gunHeli; return { hp: h.hp, y: +h.pos.y.toFixed(1), life: +(h.until - g.time).toFixed(0), fpHidden: true, hud: !document.getElementById('gunnerHud').hidden, mode: g.gunner.mode }; });
ok(on.hp === 560 && on.y > 20 && on.life >= 58 && on.hud && on.mode === 'mini', `Chopper no ar: vida 560 (2× Gavião), 60 s, alto (${JSON.stringify(on)})`);
// roda em círculo: distância ao centro constante, ângulo muda
const a = await G(() => { const p = window.__docao.gunHeli.pos; return [Math.hypot(p.x, p.z), Math.atan2(p.z, p.x)]; });
await waitGame(2);
const b = await G(() => { const p = window.__docao.gunHeli.pos; return [Math.hypot(p.x, p.z), Math.atan2(p.z, p.x)]; });
ok(Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) > 0.3, `roda em círculo pelo mapa (raio ${a[0].toFixed(1)}→${b[0].toFixed(1)}, ângulo ${a[1].toFixed(2)}→${b[1].toFixed(2)})`);
await page.screenshot({ path: 'screenshots/gunner-mini.png' });
// minigun: segura e esquenta até travar
await page.mouse.move(480, 270);
await G(() => { window.__gunnerShots = 0; });
await page.mouse.down();
await page.waitForFunction(() => window.__docao.gunner.hot, null, { timeout: 120000, polling: 50 });
const hot = await G(() => ({ shots: window.__gunnerShots, heat: window.__docao.gunner.heat, text: document.querySelector('#gunnerHud .gh-heat').textContent }));
await waitGame(0.6);
const locked = await G(() => window.__gunnerShots);
await page.mouse.up();
ok(hot.shots >= 25 && hot.shots <= 40 && hot.text.includes('SUPERAQUECEU'), `minigun superaquece depois de ~31 tiros (${JSON.stringify(hot)})`);
ok(locked === hot.shots, `superaquecida não atira (${hot.shots} → ${locked})`);
await page.waitForFunction(() => !window.__docao.gunner.hot, null, { timeout: 120000, polling: 50 });
ok(true, 'esfria e destrava');
// sniper: tecla 2, zoom, mata com um tiro no corpo; abate não conta pra sequência
await page.keyboard.press('Digit2'); await waitGame(0.6);
const sn = await G(() => ({ mode: window.__docao.gunner.mode, fov: window.__docao.fov, scope: !document.querySelector('#gunnerHud .gh-scope').hidden }));
ok(sn.mode === 'sniper' && sn.fov < 30 && sn.scope, `tecla 2 = sniper com zoom (${JSON.stringify(sn)})`);
await page.screenshot({ path: 'screenshots/gunner-sniper.png' });
// o spawn muda a cada partida: tenta alguns lugares em volta do jogador até ter linha livre (árvore/telhado no caminho)
let shot = null, after = null;
for (const [ox, oz] of [[3, 0], [-3, 0], [0, 3], [0, -3], [5, 5]]) {
  await G(([ox, oz]) => {
    const g = window.__docao, bot = g.entities.find((e) => !e.isPlayer && e.alive), h = g.gunHeli;
    h.ang += h.spin * (g.time - h.born); h.born = g.time; h.spin = 0; // para o giro no lugar pro tiro ser exato
    bot.pos.set(g.player.pos.x + ox, g.player.pos.y, g.player.pos.z + oz); bot.vel.set(0, 0, 0); bot.hp = 100;
  }, [ox, oz]);
  await waitGame(0.3);
  shot = await G(() => {
    const g = window.__docao, gn = g.gunner, bot = g.entities.find((e) => !e.isPlayer && e.alive);
    const [x, y, z] = g.camPos(), c = { x: bot.pos.x, y: bot.pos.y + 0.8, z: bot.pos.z }, cam = { x, y, z };
    const dx = c.x - cam.x, dy = c.y - cam.y, dz = c.z - cam.z;
    gn.yaw = Math.atan2(-dx, -dz); gn.pitch = Math.atan2(dy, Math.hypot(dx, dz)); gn.kick = 0;
    return { name: bot.name, kills: g.rewardKills };
  });
  await waitGame(0.3);
  await page.mouse.down(); await page.waitForTimeout(30); await page.mouse.up();
  await waitGame(1.0);
  after = await G((n) => { const g = window.__docao, bot = g.entities.find((e) => e.name === n); return { alive: bot.alive, hp: bot.hp, shots: window.__gunnerShots, kills: g.rewardKills, feed: (window.__feedLog || []).slice(-1)[0] || '' }; }, shot.name);
  if (!after.alive) break;
}
ok(!after.alive && after.feed.includes('Chopper da granja') && after.kills === shot.kills, `sniper do Chopper mata e não soma na sequência (${JSON.stringify(after)})`);
// bots derrubam: 560 de vida = dobro do Gavião
await G(() => { const g = window.__docao; g.gunHeli.hp = 10; });
await G(() => { const g = window.__docao, bot = g.entities.find((e) => !e.isPlayer && e.alive); bot.frozen = false; });
await G(() => window.__docao.endGunner(true));
const left = await G(() => ({ gunner: !!window.__docao.gunner, leaving: window.__docao.gunHeli && !window.__docao.gunHeli.alive, filter: document.getElementById('game').style.filter }));
ok(!left.gunner && left.leaving && !left.filter, `F sai do Chopper e ele vai embora (${JSON.stringify(left)})`);
ok(errors.length === 0, `sem erro no console${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
