// FAMAS da Pocilga: um clique = rajada de 3, segurar não vira automático, pausa entre rajadas, rajada curta no fim do pente, recarga com pente caindo.
// Uso: SITE=http://localhost:8124/ node test-famas.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8124/';
const errors = [], fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[error] ' + m.text()); });
await page.addInitScript(() => { localStorage.setItem('docao.primary', '15'); localStorage.setItem('docao.map', 'arena'); });
await page.goto(SITE, { waitUntil: 'load' }); await page.waitForTimeout(1500);
const G = (fn, a) => page.evaluate(fn, a);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 30000, polling: 16 }); };
await page.selectOption('#modeSel', 'dm'); await page.selectOption('#botCount', '4'); await page.click('#playBtn'); await page.waitForTimeout(800);
await page.waitForFunction(() => window.__docao.state === 'playing' && window.__docao.player.alive, null, { timeout: 15000 });
const FAMAS = await G(() => window.__docao.WEAPONS.findIndex((x) => x.key === 'famas'));
const W = await G((i) => window.__docao.WEAPONS[i], FAMAS);
ok(FAMAS === 15 && W.burst === 3, `FAMAS existe (índice ${FAMAS}, rajada ${W.burst})`);
await G(() => { const g = window.__docao; for (const e of g.entities) if (!e.isPlayer) { e.frozen = true; e.passive = true; e.pos.set(999, -50, 999); } g.player.invulnUntil = g.time + 999; });
await page.mouse.move(640, 360);
// registra o tempo de jogo de cada tiro do jogador
await G(() => { const g = window.__docao; window.__shotT = []; let last = window.__lastShot; const tick = () => { if (window.__lastShot !== last) { last = window.__lastShot; window.__shotT.push(g.time); } requestAnimationFrame(tick); }; tick(); });
const equip = async () => { await G((w) => { const g = window.__docao, p = g.player; p.primary = w; p.slots = [w, g.WEAPONS.findIndex((x) => x.key === 'pistol'), g.KNIFE]; if (p.weapon !== w) g.switchWeapon(p, w); p.reloadEnd = 0; p.mag = g.WEAPONS.map((x) => x.mag); }, FAMAS); await waitGame(0.6); };
const shots = () => G(() => window.__shotT.slice());
const clear = () => G(() => { window.__shotT.length = 0; });
const mag = () => G((w) => window.__docao.player.mag[w], FAMAS);
await equip();
ok(await G(() => window.__docao.player.weapon) === FAMAS, 'FAMAS na mão');

// 1) clique rápido = 3 tiros
await clear(); await page.mouse.down(); await page.waitForTimeout(20); await page.mouse.up(); await waitGame(0.5);
let s = await shots();
const gaps = s.slice(1).map((t, i) => t - s[i]);
ok(s.length === 3 && (await mag()) === 27, `clique = rajada de 3 (tiros ${s.length}, pente ${await mag()})`);
ok(gaps.every((d) => d >= W.rate * 0.8 && d < W.rate * 2.5), `tiros da rajada espaçados ~${W.rate}s (${gaps.map((d) => d.toFixed(3)).join(', ')})`);

// 2) segurar o botão = só uma rajada
await clear(); await page.mouse.down(); await waitGame(1.2); await page.mouse.up(); await waitGame(0.3);
s = await shots();
ok(s.length === 3, `segurando 1,2 s: só uma rajada (tiros ${s.length})`);

// 3) cliques seguidos respeitam a pausa entre rajadas
await clear();
for (let i = 0; i < 6; i++) { await page.mouse.down(); await page.waitForTimeout(15); await page.mouse.up(); await page.waitForTimeout(60); }
await waitGame(0.6);
s = await shots();
const pauses = s.slice(1).map((t, i) => t - s[i]).filter((d) => d > W.rate * 2.5);
ok(s.length >= 6 && s.length % 3 === 0, `cliques seguidos: rajadas inteiras (tiros ${s.length})`);
ok(pauses.every((d) => d >= W.burstDelay * 0.9), `pausa entre rajadas ≥ ${W.burstDelay}s (${pauses.map((d) => d.toFixed(3)).join(', ')})`);

// 4) fim do pente: 2 balas = rajada de 2 e recarrega sozinho (pente velho cai)
await G((w) => { const p = window.__docao.player; p.mag[w] = 2; p.reserve[w] = 120; p.nextFire = 0; }, FAMAS);
const drops0 = await G(() => window.__magDrops || 0);
await clear(); await page.mouse.down(); await page.waitForTimeout(20); await page.mouse.up(); await waitGame(0.4);
s = await shots();
ok(s.length === 2, `pente com 2: rajada de 2 (tiros ${s.length})`);
ok(await G(() => window.__docao.player.reloadEnd > window.__docao.time), 'pente vazio: recarrega sozinho');
await waitGame(W.reload + 0.3);
ok((await mag()) === 30 && (await G(() => window.__magDrops || 0)) > drops0, `recarga: pente cheio e pente velho caiu (pente ${await mag()})`);

// 5) trocar de arma no meio da rajada corta o resto
await clear(); await page.mouse.down(); await page.waitForTimeout(20); await page.mouse.up();
await page.waitForFunction(() => window.__shotT.length >= 1, null, { timeout: 5000, polling: 16 });
await page.keyboard.press('Digit2'); await waitGame(0.5);
s = await shots();
ok(s.length < 3, `troca no meio da rajada para de atirar (tiros ${s.length})`);
await page.keyboard.press('Digit1'); await waitGame(0.6);
await clear(); await waitGame(0.3);
ok((await shots()).length === 0, 'voltar pra FAMAS não termina a rajada antiga');

// 6) bots com FAMAS atiram em rajada sem erro
await G((w) => { const g = window.__docao; for (const e of g.entities) if (!e.isPlayer) { e.primary = w; e.slots = [w, e.slots[1], e.slots[2]]; g.switchWeapon(e, w); e.frozen = false; e.passive = false; } g.respawnAll && g.respawnAll(); }, FAMAS);
await waitGame(4);
ok(errors.length === 0, `sem erros no console${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
