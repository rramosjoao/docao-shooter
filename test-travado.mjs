// Morreu e não anda mais: morrer guiando o Chopper (ou com a bancada do Arsenal aberta) não pode deixar o WASD travado depois de renascer.
// Uso: SITE=http://localhost:8124/ node test-travado.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8124/';
const fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(SITE, { waitUntil: 'load' }); await page.waitForTimeout(1500);
const G = (fn, a) => page.evaluate(fn, a);
await page.selectOption('#modeSel', 'dm'); await page.selectOption('#botCount', '4');
await page.click('#playBtn'); await page.waitForTimeout(1200);
await G(() => { for (const b of window.__docao.entities) if (!b.isPlayer) { b.frozen = true; b.passive = true; } });
// 1) entra no Chopper e morre lá dentro
await G(() => window.__docao.grantGunner()); await page.waitForTimeout(400);
ok(await G(() => !!window.__docao.gunner), 'Chopper: entrou na porta do helicóptero');
await G(() => { const g = window.__docao; g.player.invulnUntil = 0; g.kill(g.player); });
await page.waitForTimeout(500);
ok(await G(() => !window.__docao.gunner), 'morreu no Chopper: a mira do helicóptero solta (vai pra câmera da morte)');
const t0 = await G(() => window.__docao.time);
await page.waitForFunction((t) => window.__docao.time >= t + 6, t0, { timeout: 40000 });
await page.click('#respawnBtn'); await page.waitForTimeout(600);
ok(await G(() => window.__docao.player.alive), 'renasceu');
const walk = async (key) => {
  const a = await G(() => { const p = window.__docao.player.pos; return [p.x, p.z]; });
  await page.keyboard.down(key); await page.waitForTimeout(900); await page.keyboard.up(key);
  const b = await G(() => { const p = window.__docao.player.pos; return [p.x, p.z]; });
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
};
let d1 = 0; for (const k of ['KeyW', 'KeyD']) d1 = Math.max(d1, await walk(k)); ok(d1 > 0.5, `depois de renascer, W/D andam (${d1.toFixed(2)} m)`);
let d2 = 0; for (const k of ['KeyS', 'KeyA', 'KeyD']) d2 = Math.max(d2, await walk(k)); ok(d2 > 0.5, `S/A/D andam (${d2.toFixed(2)} m)`);
// 2) morre e renasce de novo sem nada especial: continua andando
await G(() => { const g = window.__docao; g.player.invulnUntil = 0; g.kill(g.player); });
const t1 = await G(() => window.__docao.time);
await page.waitForFunction((t) => window.__docao.time >= t + 6, t1, { timeout: 40000 });
await page.keyboard.press('Space'); await page.waitForTimeout(600);
ok(await G(() => window.__docao.player.alive), 'Espaço renasce');
let d4 = 0; for (const k of ['KeyW', 'KeyS', 'KeyD']) d4 = Math.max(d4, await walk(k)); ok(d4 > 0.5, `segunda vida: WASD anda (${d4.toFixed(2)} m; parede na frente pode barrar uma direção)`);
// 3) Enter que renasce não abre o chat (senão W/A/S/D vira texto na caixinha e o Docão não anda)
await G(() => { const g = window.__docao; g.player.invulnUntil = 0; g.kill(g.player); });
const t2 = await G(() => window.__docao.time);
await page.waitForFunction((t) => window.__docao.time >= t + 6, t2, { timeout: 40000 });
await page.keyboard.press('Enter'); await page.waitForTimeout(150); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
ok(await G(() => window.__docao.player.alive), 'Enter renasce');
ok(await page.evaluate(() => document.activeElement?.id !== 'chatInput'), 'o 2º Enter logo depois de renascer não abriu o chat');
// 4) bancada do Arsenal aberta e a caixa fechada pelo botão: dentro da partida W/S não podem ficar presos nela
await G(() => window.__docao.toMenu()); await page.waitForTimeout(800);
ok(await page.evaluate(() => !document.getElementById('menu').classList.contains('hidden')), 'voltou ao menu');
await page.click('.arsenal-crate'); await page.waitForTimeout(2500);
await page.click('#temperBtn'); await page.waitForTimeout(400);
ok(await G(() => window.__docao.benchOpen()), 'bancada aberta no Arsenal');
await page.click('#menuBack'); await page.waitForTimeout(2500);
await page.click('#playBtn'); await page.waitForTimeout(1500);
await G(() => { for (const b of window.__docao.entities) if (!b.isPlayer) { b.frozen = true; b.passive = true; } });
ok(await G(() => !window.__docao.benchOpen()), 'a bancada não sobrevive ao Jogar');
let d5 = 0; for (const k of ['KeyW', 'KeyS']) d5 = Math.max(d5, await walk(k)); ok(d5 > 0.5, `W/S andam na partida nova (${d5.toFixed(2)} m)`);
ok(!errs.length, 'sem erros na página ' + errs.join(' | '));
await browser.close(); console.log(fails.length ? `${fails.length} FALHA(S)` : 'TUDO OK'); process.exit(fails.length ? 1 : 0);
