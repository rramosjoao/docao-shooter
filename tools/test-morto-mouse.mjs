// Morto (ou com o painel B aberto): clicar no jogo não recaptura o mouse; renascer recaptura. Uso: node tools/test-morto-mouse.mjs [urlDoSite]
import { chromium } from 'playwright';
const SITE = process.argv[2] || 'http://127.0.0.1:8170/';
const fails = [], errors = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { localStorage.setItem('docao.name', 'Matheus'); });
await page.goto(SITE, { waitUntil: 'load' }); await page.waitForTimeout(3000);
const G = (f, a) => page.evaluate(f, a), wait = (ms) => page.waitForTimeout(ms);
// conta quantas vezes o jogo pediu o lock (o headless pode não conceder o lock de verdade)
await page.selectOption('#modeSel', 'dm'); await page.click('#playBtn'); await wait(2500);
await G(() => { const g = window.__docao, p = g.player, k = g.entities.find((e) => !e.isPlayer && e.alive); p.invulnUntil = 0; g.damage(p, 500, k, 0, false); });
await page.waitForFunction(() => window.__docao.time - window.__docao.player.deathAt > 1.5, null, { timeout: 60000 }); await wait(300);
const c0 = await G(() => window.__lockCalls || 0);
await page.mouse.click(400, 300); await wait(300); await page.mouse.click(300, 200); await wait(300);
const c1 = await G(() => window.__lockCalls || 0);
ok(c1 === c0 && !(await G(() => !!document.pointerLockElement)), `morto: clicar no jogo não pede o mouse de novo (pedidos ${c0} → ${c1}) e o cursor fica livre`);
// o painel de armas continua clicável
const picked = await G(() => { const b = document.querySelector('#deathList button.clsrow:not(.on)'); if (!b) return false; b.click(); return true; });
ok(picked, 'morto: o painel de armas responde ao clique');
// renascer volta a capturar
await G(() => { window.__docao.player.respawnAt = 0; }); await page.waitForFunction(() => document.getElementById('respawnBtn') && !document.getElementById('respawnBtn').disabled, null, { timeout: 30000 });
const c2 = await G(() => window.__lockCalls || 0);
await page.keyboard.press('Space'); await wait(1500);
ok(await G(() => window.__docao.player.alive) && (await G(() => window.__lockCalls || 0)) > c2, 'renascer: o jogo volta a pedir o mouse');
// painel B da Invasão
await G(() => { const g = window.__docao; document.getElementById('pause') && 0; g.pause(); document.getElementById('quitBtn').click(); }); await wait(800);
await page.selectOption('#modeSel', 'inv'); await wait(400); await page.click('#playBtn'); await wait(2500);
await page.waitForFunction(() => window.__docao.state === 'playing' && window.__docao.player && window.__docao.player.alive, null, { timeout: 20000 });
await G(() => { const g = window.__docao; g.inv.phaseEnd = g.time; g.player.invulnUntil = 1e9; });
await page.waitForFunction(() => window.__docao.invView.phase === 'wave', null, { timeout: 30000 });
await G(() => { const g = window.__docao; g.inv.queue = []; for (const z of g.entities.filter((e) => e.zt && e.alive)) g.damage(z, 1e5, g.player, 0, false); });
await page.waitForFunction(() => window.__docao.invView.phase === 'break', null, { timeout: 20000 }); await wait(300);
if (!(await G(() => window.__docao.invPick))) { await page.keyboard.press('KeyB'); await wait(300); }
ok(await G(() => window.__docao.invPick), 'Invasão: painel B aberto na pausa');
const d0 = await G(() => window.__lockCalls || 0); await page.mouse.click(400, 300); await wait(300);
ok((await G(() => window.__lockCalls || 0)) === d0, 'Invasão com B aberto: clicar no jogo não recaptura o mouse');
await page.keyboard.press('KeyB'); await wait(300);
ok(await G(() => !window.__docao.invPick), 'B fecha o painel (e o jogo pode capturar o mouse de novo)');
ok(errors.length === 0, 'sem erro no console' + (errors.length ? ': ' + errors.slice(0, 2).join(' | ') : ''));
await browser.close(); console.log(fails.length ? 'FALHOU ' + fails.length : 'TUDO OK'); process.exit(fails.length ? 1 : 0);
