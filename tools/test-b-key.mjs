// B: dança fora da Invasão, painel de armas na Invasão (sem dança), Treino com B, Docão do menu gira ao arrastar. Uso: node tools/test-b-key.mjs [urlDoSite]
import { chromium } from 'playwright';
const SITE = process.argv[2] || 'http://127.0.0.1:8170/';
const errors = [], fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
await page.addInitScript(() => { localStorage.setItem('docao.name', 'Matheus'); });
await page.goto(SITE, { waitUntil: 'load' }); await page.waitForTimeout(3000);
const G = (fn, a) => page.evaluate(fn, a), wait = (ms) => page.waitForTimeout(ms);
async function until(fn, ms = 8000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await wait(100); } return false; }
async function toMenu() { await G(() => { const g = window.__docao; if (g.state === 'playing') g.pause(); }); await wait(200); await G(() => document.getElementById('quitBtn').click()); await until(() => window.__docao.state === 'menu'); await wait(500); }
const inGame = () => until(() => window.__docao.state === 'playing' && window.__docao.player && window.__docao.player.alive);

{ // 1) Docão do menu gira ao arrastar
  const s0 = await G(() => window.__docao.menuSpin);
  await page.mouse.move(880, 367); await page.mouse.down(); await page.mouse.move(960, 367, { steps: 6 }); await page.mouse.move(1010, 367, { steps: 6 });
  const mid = await G(() => window.__docao.menuSpin); await page.mouse.up();
  ok(mid.drag && Math.abs(mid.spin - s0.spin) > 0.8, `Docão do menu gira ao arrastar (giro ${s0.spin} → ${mid.spin})`);
  await wait(300); ok(!(await G(() => window.__docao.menuSpin.drag)), 'soltar encerra o arrasto');
}
// 2) partida normal: B dança
await page.selectOption('#modeSel', 'dm'); await page.click('#playBtn'); await wait(1500); await inGame();
await G(() => { window.__docao.player.invulnUntil = 1e9; });
await page.keyboard.press('KeyB'); await wait(300);
ok(await G(() => window.__docao.emoting), 'partida normal: B dança');
ok(await until(() => !window.__docao.emoting, 25000), 'dança termina sozinha');
await page.keyboard.press('Enter'); await wait(300);
const typing = await G(() => !!(document.activeElement && document.activeElement.tagName === 'INPUT'));
await page.keyboard.press('KeyB'); await wait(300);
ok(!(await G(() => window.__docao.emoting)), `chat aberto (campo em foco: ${typing}): B não dança`);
await page.keyboard.press('Escape'); await wait(300);
await toMenu();
// 3) Treino: B troca a arma
await page.selectOption('#modeSel', 'treino'); await wait(300); await page.click('#playBtn'); await wait(1500); await inGame();
const p0 = await G(() => window.__docao.player.slots[0]);
await page.keyboard.press('KeyB'); await wait(400);
const t1 = await G(() => ({ p: window.__docao.player.slots[0], alive: window.__docao.player.alive, emote: window.__docao.emoting }));
ok(t1.p !== p0 && t1.alive && !t1.emote, `Treino: B troca a primária na hora (${p0} → ${t1.p}), sem dançar e sem morrer`);
await toMenu();
// 4) Invasão
await page.selectOption('#modeSel', 'inv'); await wait(500); await page.click('#playBtn'); await wait(1500); await inGame();
await G(() => { const g = window.__docao; g.player.invulnUntil = 1e9; g.inv.phaseEnd = g.time; });
ok(await until(() => window.__docao.invView.phase === 'wave', 25000), 'Invasão: wave começou');
await page.keyboard.press('KeyB'); await wait(300);
ok(!(await G(() => window.__docao.emoting || window.__docao.invPick)), 'Invasão em wave: B não dança nem abre painel');
await G(() => { const g = window.__docao; g.inv.queue = []; for (const z of g.entities.filter((e) => e.zt && e.alive)) g.damage(z, 1e5, g.player, 0, false); });
ok(await until(() => window.__docao.invView.phase === 'break', 8000), 'Invasão: pausa entre waves');
await wait(300);
if (await G(() => window.__docao.invPick)) { await page.keyboard.press('KeyB'); await wait(200); }
await page.keyboard.press('KeyB'); await wait(400);
const iv = await G(() => ({ pick: window.__docao.invPick, emote: window.__docao.emoting, alive: window.__docao.player.alive }));
ok(iv.pick && !iv.emote && iv.alive, 'Invasão na pausa: B abre o painel de armas e não dança');
await page.screenshot({ path: '/tmp/p14c/inv-painel.png' });
await page.keyboard.press('KeyB'); await wait(300);
ok(await G(() => !window.__docao.invPick && !window.__docao.emoting), 'B de novo fecha o painel, sem dança');
await page.keyboard.press('Escape'); await wait(400);
ok(await G(() => document.getElementById('pauseDance').classList.contains('hidden') && document.getElementById('pauseClass').classList.contains('hidden') && document.getElementById('pauseClassBtn').classList.contains('hidden')), 'Invasão: menu de pausa sem escolha de dança e sem troca de arma');
ok(errors.length === 0, 'sem erro no console' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close();
console.log(fails.length ? 'FALHOU ' + fails.length : 'TUDO OK'); process.exit(fails.length ? 1 : 0);
