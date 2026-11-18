// Sabre (duelista, velocidade normal) e Sabre Duplo (área, golpes alternados, velocidade normal).
// Uso: SITE=http://localhost:8123/ node test-sabre.mjs
import { chromium } from 'playwright';
import { WEAPONS, SABER, SABER2, MELEES, SPEED } from './shared/rules.js';
const SITE = process.env.SITE || 'http://localhost:8123/';
const fails = [], errors = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
ok(WEAPONS[SABER].move == null && WEAPONS[SABER2].move == null && MELEES.includes(SABER2), `regras: sabres sem punição de movimento, duplo no menu (${WEAPONS[SABER].move}, ${WEAPONS[SABER2].move})`);
ok(WEAPONS[SABER].dmg === 52 && WEAPONS[SABER2].dmg === 42, `regras: o número da arma é o golpe final (${WEAPONS[SABER].dmg}/${WEAPONS[SABER2].dmg})`);
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(SITE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__docao && window.__docao.startGame, null, { timeout: 120000, polling: 250 });
const G = (fn, a) => page.evaluate(fn, a);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 180000, polling: 50 }); };
await G(() => { const g = window.__docao; g.startGame('arena'); for (const e of g.entities) if (!e.isPlayer) { e.frozen = true; e.pos.set(999, -50, 999); } g.player.invulnUntil = g.time + 9999; });
await waitGame(0.5);
const equip = async (w) => { await G((w) => { const g = window.__docao, p = g.player; p.slots = [p.slots[0], p.slots[1], w]; g.switchWeapon(p, w); }, w); await waitGame(0.5); };
const speed = async () => {
  await page.keyboard.down('KeyW'); await waitGame(0.3);
  const v = await G(() => Math.hypot(window.__docao.player.vel.x, window.__docao.player.vel.z));
  await page.keyboard.up('KeyW'); await waitGame(0.3);
  return v;
};
await page.mouse.move(480, 270);
await G(() => {
  const g = window.__docao, p = g.player, b = g.entities.find((e) => !e.isPlayer);
  for (let i = 0; i < 24; i++) { p.yaw = i / 24 * Math.PI * 2; b.pos.set(p.pos.x - Math.sin(p.yaw) * 6, p.pos.y, p.pos.z - Math.cos(p.yaw) * 6); if (g.visible(b)) break; }
  b.pos.set(999, -50, 999); p.pitch = 0;
});
const home = await G(() => window.__docao.player.pos.toArray());
const back = () => G((h) => { const p = window.__docao.player; p.pos.set(...h); p.vel.set(0, 0, 0); }, home);
await equip(4); const v0 = await speed(); await back();
ok(v0 > SPEED * 0.9, `pistola anda perto de ${SPEED} m/s (${v0.toFixed(2)})`);
for (const [w, name, one] of [[SABER, 'Sabre', 36], [SABER2, 'Sabre Duplo', 28]]) {
  await equip(w);
  const v = await speed(); await back();
  ok(Math.abs(v / v0 - 1) < 0.05, `${name}: anda a ${(v / v0 * 100).toFixed(0)}% da pistola (esperado 100%)`);
  const mode = await G(() => document.getElementById('wmode').textContent);
  ok(mode === (w === SABER ? 'DUELO' : 'ÁREA'), `${name}: modo no HUD é ${mode}`);
  await page.screenshot({ path: `screenshots/sabre-${w}-guarda.png` });
  const name0 = await G(() => { const g = window.__docao, p = g.player, b = g.entities.find((e) => !e.isPlayer); const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); b.pos.set(p.pos.x + fx * 1.5, p.pos.y, p.pos.z + fz * 1.5); b.alive = true; b.hp = 100; b.invulnUntil = 0; b.frozen = true; return b.name; });
  await page.mouse.down(); await page.waitForTimeout(30); await page.mouse.up();
  await waitGame(0.12);
  const hp1 = await G((n) => window.__docao.entities.find((e) => e.name === n).hp, name0);
  ok(hp1 === 100 - one, `${name}: um corte tira ${100 - hp1} (esperado ${one}), não mata`);
  await G(() => { window.__stopAt = window.__docao.time; });
  await page.screenshot({ path: `screenshots/sabre-${w}-corte.png` });
  await G(() => { window.__stopAt = null; });
  await waitGame(0.34);
  await page.mouse.down(); await page.waitForTimeout(30); await page.mouse.up();
  await waitGame(0.36);
  await page.mouse.down(); await page.waitForTimeout(30); await page.mouse.up();
  await waitGame(0.25);
  const dead = await G((n) => !window.__docao.entities.find((e) => e.name === n).alive, name0);
  ok(dead, `${name}: o combo de três golpes mata`);
}
await waitGame(0.6);
const sides = [];
for (let i = 0; i < 3; i++) { await page.mouse.down(); await page.waitForTimeout(30); await page.mouse.up(); await waitGame(0.36); sides.push(await G(() => window.__docao.fpSaberSide)); }
ok(new Set(sides).size === 2 && sides[0] !== sides[1], `Sabre Duplo alterna a mão a cada golpe (${sides.join(',')})`);
const dashOk = await G(() => window.__docao.saberDash());
await waitGame(0.05);
const dash = await G(() => { const g = window.__docao, p = g.player; return { moved: Math.hypot(p.vel.x, p.vel.z), cd: p.saber.dashReady - g.time }; });
ok(dashOk && dash.moved > 10, `investida do duplo sai (${dash.moved.toFixed(1)} m/s, recarga ${dash.cd.toFixed(1)} s)`);
await G(() => { const p = window.__docao.player; p.slots[2] = window.__docao.WEAPONS.findIndex((w) => w.saber && !w.dual); window.__docao.switchWeapon(p, p.slots[2]); });
await waitGame(0.3);
const thrown = await G(() => { const g = window.__docao; const okThrow = g.saberSpecial(); return { okThrow, n: g.blades.length, out: !!(g.saber && g.saber.bladeOut) }; });
ok(thrown.okThrow && thrown.n === 1 && thrown.out, `arremesso do simples cria uma lâmina (${thrown.n})`);
await waitGame(0.2);
await page.screenshot({ path: 'screenshots/sabre-arremesso.png' });
ok(errors.length === 0, `sem erro no console${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
