// Animações de todas as armas: (1) balanço com inércia ao virar a mira e andar de lado; (2) sacar subindo de baixo e assentando.
// Uso: SITE=http://localhost:8123/ node test-anim.mjs
import { chromium } from 'playwright';
import { WEAPONS, PRIMARIES, SECONDARIES, MELEES } from './shared/rules.js';
const SITE = process.env.SITE || 'http://localhost:8123/';
const fails = [], errors = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(SITE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__docao && window.__docao.startGame, null, { timeout: 120000, polling: 250 });
const G = (fn, a) => page.evaluate(fn, a);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 180000, polling: 30 }); };
await G(() => { const g = window.__docao; g.startGame('arena'); for (const e of g.entities) if (!e.isPlayer) { e.frozen = true; e.pos.set(999, -50, 999); } g.player.invulnUntil = g.time + 9999; });
await waitGame(0.6);
const rest = await G(() => window.__docao.fpPose());
// (1) virar a mira: gira o yaw por uns quadros e lê a pose
await G(() => { const p = window.__docao.player; window.__spin = setInterval(() => { p.yaw -= 0.06; }, 16); });
await waitGame(0.25);
const turning = await G(() => window.__docao.fpPose());
await page.screenshot({ path: 'screenshots/anim-virando.png' });
await G(() => clearInterval(window.__spin));
await waitGame(0.6);
const settled = await G(() => window.__docao.fpPose());
ok(Math.abs(turning.sway) > 0.02 && turning.x < rest.x - 0.005 && Math.abs(settled.sway) < 0.01, `virar a mira: a arma atrasa e volta (sway ${turning.sway.toFixed(3)} → ${settled.sway.toFixed(3)})`);
// andar de lado inclina
await page.keyboard.down('KeyD'); await waitGame(0.4);
const strafe = await G(() => window.__docao.fpPose());
await page.keyboard.up('KeyD'); await waitGame(0.5);
ok(Math.abs(strafe.strafe) > 0.03, `andar de lado inclina a arma (${strafe.strafe.toFixed(3)})`);
// (2) sacar: logo depois da troca a arma está baixa e girada; no fim assenta
const all = [...new Set([...PRIMARIES, ...SECONDARIES, ...MELEES])];
let bad = [];
for (const w of all) {
  const other = w === 4 ? 0 : 4; // troca a partir de outra arma
  await G(([w, o]) => { const g = window.__docao, p = g.player; p.slots = [w, o, 7]; g.switchWeapon(p, o); }, [w, other]);
  await waitGame(0.5);
  // congela o tempo em 25% do saque pra ler a pose exata
  await G((w) => { const g = window.__docao; g.switchWeapon(g.player, w); window.__stopAt = g.time + g.player.switchDur * 0.25; }, w);
  await page.waitForFunction(() => window.__docao.time >= window.__stopAt - 1e-6, null, { timeout: 60000, polling: 30 });
  await page.waitForTimeout(150);
  const mid = await G(() => window.__docao.fpPose());
  await G(() => { window.__stopAt = null; });
  await waitGame(0.6);
  const end = await G(() => window.__docao.fpPose());
  const isKnife = WEAPONS[w].key === 'knife';
  if (!isKnife && !(mid.y < end.y - 0.03 && Math.abs(mid.rz) > Math.abs(end.rz) + 0.05)) bad.push(`${WEAPONS[w].key}(${mid.y.toFixed(2)}/${end.y.toFixed(2)})`);
  if (w === 0 || w === 16) { await G((w) => { const g = window.__docao; g.switchWeapon(g.player, g.player.slots[1]); }, w); await waitGame(0.5); await G((w) => window.__docao.switchWeapon(window.__docao.player, w), w); await waitGame(0.08); await page.screenshot({ path: `screenshots/anim-sacar-${w}.png` }); await waitGame(0.6); }
}
ok(bad.length === 0, `sacar: as ${all.length} armas sobem de baixo girando e assentam${bad.length ? ' — falhou: ' + bad.join(' ') : ''}`);
ok(errors.length === 0, `sem erro no console${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
