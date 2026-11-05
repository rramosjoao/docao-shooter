// Besta (13) em 1ª pessoa: reta pra frente, braços do arco abaixo da mira, coronha sem atravessar a câmera, ADS centrado,
// mão esquerda na telha (só vai na corda durante a recarga). Arco (14) e estilingue (19) não mudam.
// Uso: SITE=http://localhost:8125/ node test-besta.mjs   (OUT=pasta pros prints, opcional)
import { chromium } from 'playwright';
import fs from 'fs';
const SITE = process.env.SITE || 'http://localhost:8123/', OUT = process.env.OUT || 'screenshots/besta/';
fs.mkdirSync(OUT, { recursive: true });
const fails = [], errors = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(SITE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__docao && window.__docao.startGame, null, { timeout: 120000, polling: 250 });
const G = (fn, a) => page.evaluate(fn, a);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 180000, polling: 30 }); };
const freeze = async (sec) => { await G((s) => { window.__stopAt = window.__docao.time + s; }, sec); await page.waitForFunction(() => window.__docao.time >= window.__stopAt - 1e-6, null, { timeout: 180000, polling: 30 }); await page.waitForTimeout(400); };
const thaw = () => G(() => { window.__stopAt = null; });
const shot = (name) => page.screenshot({ path: OUT + name + '.png' });
const cross = () => G(() => ({ ...window.__docao.fpCross(), err: window.__docao.fpHandErr() }));
const f3 = (o) => JSON.stringify(o, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v);
await G(() => { const g = window.__docao; g.startGame('arena'); for (const e of g.entities) if (!e.isPlayer) { e.frozen = true; e.pos.set(999, -50, 999); } g.player.invulnUntil = g.time + 9999; });
await waitGame(0.6);
// referência: arco antes de mexer na besta (pose do root e erro da mão)
await G(() => { const g = window.__docao, p = g.player; p.slots = [0, 14, 7]; g.switchWeapon(p, 14); p.switchEnd = 0; p.mag[14] = 1; });
await waitGame(0.8); await freeze(0.05);
const bow = await G(() => ({ pose: window.__docao.fpPose(), err: window.__docao.fpHandErr() })); await shot('ref-arco'); await thaw();
ok(bow.err < 1e-3 && Math.abs(bow.pose.x - 0.2) < 0.03 && Math.abs(bow.pose.y + 0.2) < 0.03, `arco: pose e mão no cabo iguais (${f3(bow)})`);
await G(() => { const g = window.__docao, p = g.player; p.slots = [0, 13, 7]; g.switchWeapon(p, 13); p.switchEnd = 0; p.reloadEnd = 0; p.mag[13] = 1; p.reserve[13] = 30; });
await waitGame(0.8); await freeze(0.05);
let c = await cross(); await shot('besta-parado'); await thaw();
ok(c.tip[0] > 0.1 && c.tip[0] < 0.4 && c.tip[1] > -0.45 && c.tip[1] < -0.15, `parado: ponta à direita/abaixo da mira (${f3(c.tip)})`);
ok(c.limbL[1] < -0.1, `parado: braço esquerdo do arco abaixo da mira (${c.limbL[1].toFixed(3)})`);
ok(c.butt[2] < -0.1, `parado: coronha na frente da câmera (z ${c.butt[2].toFixed(3)})`);
ok(c.fore < 0.01 && c.err < 1e-3, `parado: mão esquerda na telha e direita no cabo (${f3({ fore: c.fore, err: c.err })})`);
// ADS
await page.mouse.move(480, 270); await page.mouse.down({ button: 'right' }); await waitGame(0.5); await freeze(0.05);
const ads = await G(() => window.__docao.ads); c = await cross(); await shot('besta-ads'); await thaw();
ok(ads > 0.95 && Math.abs(c.tip[0]) < 0.03 && c.tip[1] > -0.25 && c.tip[1] < -0.03, `ADS: ponta centrada logo abaixo da cruz (ads ${ads.toFixed(2)}, ${f3(c.tip)})`);
ok(c.butt[2] < -0.1 && c.fore < 0.01, `ADS: coronha na frente da câmera e mão na telha (${f3({ z: c.butt[2], fore: c.fore })})`);
await page.mouse.up({ button: 'right' }); await waitGame(0.5);
// andando
await page.keyboard.down('KeyW'); await waitGame(0.35); await freeze(0.02);
c = await cross(); await shot('besta-andando'); await thaw(); await page.keyboard.up('KeyW');
ok(c.fore < 0.01 && c.err < 1e-3, `andando: mãos no lugar (${f3({ fore: c.fore, err: c.err })})`);
await waitGame(0.5);
// atirando
await G(() => { const p = window.__docao.player; p.mag[13] = 2; p.reloadEnd = 0; p.nextFire = 0; window.__lastShot = null; }); // 2: sem recarga automática logo após o tiro
await page.mouse.down(); await waitGame(0.02); await page.mouse.up(); await freeze(0.04);
const ls = await G(() => window.__lastShot); c = await cross(); await shot('besta-atirando'); await thaw();
ok(ls && ls.w === 13, `atirando: disparou a besta (${ls && ls.w})`);
ok(c.fore < 0.01 && !(await G(() => window.__docao.player.reloadEnd > window.__docao.time)), `atirando: mão na telha (${c.fore.toFixed(3)})`);
await waitGame(1.6);
// recarga
for (const f of [0.05, 0.3, 0.45, 0.65, 0.95]) {
  await G(() => { const g = window.__docao, p = g.player; p.mag[13] = 0; p.reloadStartT = g.time; p.reloadEnd = g.time + g.WEAPONS[13].reload; });
  await freeze(1.35 * f); c = await cross(); await shot('besta-recarga-' + Math.round(f * 100)); await thaw();
  if (f >= 0.3 && f <= 0.65) ok(c.knot < 0.08 && c.fore > 0.1 && c.err < 1e-3, `recarga ${f * 100}%: mão pinçando a corda (${f3({ knot: c.knot, fore: c.fore })})`);
  else ok(c.fore < 0.01 && c.err < 1e-3, `recarga ${f * 100}%: mão na telha (${f3({ fore: c.fore, err: c.err })})`);
  await waitGame(1.6);
}
// saque
await G(() => { const g = window.__docao, p = g.player; g.switchWeapon(p, 0); }); await waitGame(0.6);
await G(() => { const g = window.__docao, p = g.player; g.switchWeapon(p, 13); window.__stopAt = g.time + p.switchDur * 0.25; });
await page.waitForFunction(() => window.__docao.time >= window.__stopAt - 1e-6, null, { timeout: 180000, polling: 30 }); await page.waitForTimeout(300);
await shot('besta-saque'); await thaw();
ok(errors.length === 0, `sem erro no console${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
