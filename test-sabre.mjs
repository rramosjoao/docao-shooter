// Sabre (guarda de cavaleiro, anda 15% mais devagar) e Sabre Duplo (um em cada mão, golpes alternados, 30% mais devagar).
// Uso: SITE=http://localhost:8123/ node test-sabre.mjs
import { chromium } from 'playwright';
import { WEAPONS, SABER, SABER2, MELEES, SPEED } from './shared/rules.js';
const SITE = process.env.SITE || 'http://localhost:8123/';
const fails = [], errors = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
ok(WEAPONS[SABER].move === 0.85 && WEAPONS[SABER2].move === 0.7 && MELEES.includes(SABER2), `regras: sabre 15%, duplo 30%, duplo no menu (${WEAPONS[SABER].move}, ${WEAPONS[SABER2].move})`);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(SITE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__docao && window.__docao.startGame, null, { timeout: 120000, polling: 250 });
const G = (fn, a) => page.evaluate(fn, a);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 180000, polling: 50 }); };
await G(() => { const g = window.__docao; g.startGame('arena'); for (const e of g.entities) if (!e.isPlayer) { e.frozen = true; e.pos.set(999, -50, 999); } g.player.invulnUntil = g.time + 9999; });
await waitGame(0.5);
const equip = async (w) => { await G((w) => { const g = window.__docao, p = g.player; p.slots = [p.slots[0], p.slots[1], w]; g.switchWeapon(p, w); }, w); await waitGame(0.5); };
const speed = async () => { // velocidade logo depois de acelerar (~2 m andados, dentro do trecho livre de 6 m)
  await page.keyboard.down('KeyW'); await waitGame(0.3);
  const v = await G(() => Math.hypot(window.__docao.player.vel.x, window.__docao.player.vel.z));
  await page.keyboard.up('KeyW'); await waitGame(0.3);
  return v;
};
await page.mouse.move(480, 270);
// vira pra uma direção livre (um bot de teste a 6 m tem que ficar à vista) e mede a velocidade com a pistola como base
await G(() => {
  const g = window.__docao, p = g.player, b = g.entities.find((e) => !e.isPlayer);
  for (let i = 0; i < 24; i++) { p.yaw = i / 24 * Math.PI * 2; b.pos.set(p.pos.x - Math.sin(p.yaw) * 6, p.pos.y, p.pos.z - Math.cos(p.yaw) * 6); if (g.visible(b)) break; }
  b.pos.set(999, -50, 999); p.pitch = 0;
});
const home = await G(() => window.__docao.player.pos.toArray());
const back = () => G((h) => { const p = window.__docao.player; p.pos.set(...h); p.vel.set(0, 0, 0); }, home);
await equip(4); const v0 = await speed(); await back();
for (const [w, name, mul] of [[SABER, 'Sabre', 0.85], [SABER2, 'Sabre Duplo', 0.7]]) {
  await equip(w);
  const v = await speed(); await back();
  ok(Math.abs(v / v0 - mul) < 0.05, `${name}: anda a ${(v / v0 * 100).toFixed(0)}% da velocidade da pistola (esperado ${mul * 100}%)`);
  await page.screenshot({ path: `screenshots/sabre-${w}-guarda.png` });
  // inimigo colado na frente: um corte mata
  const name0 = await G(() => { const g = window.__docao, p = g.player, b = g.entities.find((e) => !e.isPlayer); const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); b.pos.set(p.pos.x + fx * 1.5, p.pos.y, p.pos.z + fz * 1.5); b.alive = true; b.hp = 100; b.invulnUntil = 0; return b.name; });
  await page.mouse.down(); await page.waitForTimeout(30); await page.mouse.up();
  await waitGame(0.12); await page.screenshot({ path: `screenshots/sabre-${w}-corte.png` });
  await waitGame(0.4);
  const dead = await G((n) => !window.__docao.entities.find((e) => e.name === n).alive, name0);
  ok(dead, `${name}: um corte na frente mata`);
}
// duplo: golpes alternam a mão
const sides = [];
for (let i = 0; i < 3; i++) { await page.mouse.down(); await page.waitForTimeout(30); await page.mouse.up(); await waitGame(0.45); sides.push(await G(() => window.__docao.fpSaberSide)); }
ok(new Set(sides).size === 2 && sides[0] !== sides[1], `Sabre Duplo alterna a mão a cada golpe (${sides.join(',')})`);
ok(errors.length === 0, `sem erro no console${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
