// Teste offline do modo Treino (Estande do Docão): alvos passivos, números de dano, renascer em 2 s, B troca a arma, sem fim de partida.
// Uso: SITE=http://localhost:8124/ SHOTS=screenshots node test-treino.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8124/', SHOTS = process.env.SHOTS || 'screenshots';
const errors = [], fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
await page.addInitScript(() => { localStorage.setItem('docao.primary', '0'); localStorage.setItem('docao.name', 'Matheus'); });
await page.goto(SITE, { waitUntil: 'load' }); await page.waitForTimeout(2000);
const G = (fn, a) => page.evaluate(fn, a); const wait = (ms) => page.waitForTimeout(ms);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 60000, polling: 16 }); }; // tempo de jogo (headless roda devagar)
await page.selectOption('#modeSel', 'treino');
ok(await G(() => !document.getElementById('menuTrain').classList.contains('hidden')), 'aviso do Treino aparece no menu');
await page.click('#playBtn'); await wait(1500);
const st = await G(() => { const g = window.__docao; return { map: g.map.id, mode: g.mode, n: g.entities.length, dummies: g.entities.filter((e) => e.dummy).length, timer: document.getElementById('timer').textContent }; });
ok(st.map === 'estande' && st.mode === 'treino', `abre no Estande (${JSON.stringify(st)})`);
ok(st.dummies === 18 && st.n === 19, 'um alvo por posição do mapa');
ok(st.timer.includes('∞'), 'sem tempo');
// jogador na linha de tiro, olhando pras raias
await G(() => { const g = window.__docao, p = g.player; p.pos.set(-28, 0, 23); p.yaw = 0; p.pitch = -0.02; });
const x0 = await G(() => window.__docao.entities.filter((e) => e.dummy && e.dummy.move).map((e) => e.pos.x));
await waitGame(3);
const after = await G(() => { const g = window.__docao, p = g.player; return { hp: p.hp, alive: p.alive, x: g.entities.filter((e) => e.dummy && e.dummy.move).map((e) => e.pos.x), shots: g.entities.filter((e) => e.dummy).every((e) => e.weapon === 4) }; });
ok(after.hp === 100 && after.alive, `alvos não atacam (vida ${after.hp})`);
ok(after.x.some((x, i) => Math.abs(x - x0[i]) > 0.5), 'alvos do trilho andam');
// dano: números + painel
const dmg = await G(() => { const g = window.__docao, p = g.player, t = g.entities.find((e) => e.name === 'Alvo 20 m'); g.damage(t, 40, p, 0, true); g.damage(t, 20, p, 0, false); return { hp: t.hp, info: document.getElementById('trainInfo').textContent, vis: !document.getElementById('trainInfo').classList.contains('hidden') }; });
ok(dmg.hp === 40 && dmg.vis && /40.*CABEÇA|20.*corpo/.test(dmg.info), `números de dano + painel (${dmg.info})`);
await page.screenshot({ path: `${SHOTS}/estande-linha-de-tiro.png` });
// morre e volta em ~2 s, no mesmo lugar
const k = await G(() => { const g = window.__docao, p = g.player, t = g.entities.find((e) => e.name === 'Alvo 20 m'); g.damage(t, 100, p, 0, false); window.__t = t; return { alive: t.alive, at: t.respawnAt - g.time }; });
ok(!k.alive && Math.abs(k.at - 2) < 0.05, `alvo renasce em 2 s (${k.at.toFixed(2)})`);
await waitGame(2.3);
const back = await G(() => { const t = window.__t; return { alive: t.alive, hp: t.hp, x: t.pos.x, z: t.pos.z }; });
ok(back.alive && back.hp === 100 && Math.abs(back.x + 31) < 0.01 && Math.abs(back.z - 2) < 0.01, `alvo voltou no lugar (${JSON.stringify(back)})`);
// troca de arma na hora (B)
const w0 = await G(() => window.__docao.player.weapon);
await page.keyboard.press('KeyB'); await wait(300);
const w1 = await G(() => { const p = window.__docao.player; return { w: p.weapon, prim: p.slots[0], mag: p.mag[p.slots[0]] }; });
ok(w1.prim !== w0 && w1.w === w1.prim && w1.mag > 0, `B troca a primária na hora (${w0} → ${w1.prim})`);
// munição infinita e Copo Bomba volta
const ammo = await G(() => { const p = window.__docao.player; p.reserve[p.slots[0]] = 0; p.nades = 0; p.lastNadeT = window.__docao.time; return 1; });
await waitGame(2.0);
const ammo2 = await G(() => { const p = window.__docao.player; return { r: p.reserve[p.slots[0]], n: p.nades }; });
ok(ammo2.r > 0 && ammo2.n === 3, `munição infinita e Copo Bomba volta (${JSON.stringify(ammo2)})`);
// visão de cima das raias
await G(() => { const g = window.__docao, p = g.player; p.pos.set(12, 0, 23); p.yaw = 0; p.pitch = -0.05; const t = g.entities.find((e) => e.name === 'Trio 2'); g.blastAt(t.pos.x, t.pos.y + 0.3, t.pos.z, 'r', p); });
await wait(250); await page.screenshot({ path: `${SHOTS}/estande-explosivos.png` });
await G(() => { const p = window.__docao.player; p.pos.set(31, 0, 17); p.yaw = 0; p.pitch = -0.25; });
await wait(400); await page.screenshot({ path: `${SHOTS}/estande-faca-sabre.png` });
// sem fim de partida: 25 abates
const end = await G(() => { const g = window.__docao, p = g.player; for (let i = 0; i < 25; i++) { const t = g.entities.find((e) => e.dummy && e.alive); if (t) g.damage(t, 999, p, 0, false); } return { state: g.state, kills: p.kills }; });
ok(end.state === 'playing', `não acaba com ${end.kills} abates`);
ok(!errors.length, 'sem erro no console' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
console.log(fails.length ? `FALHOU ${fails.length}` : 'TUDO OK');
await browser.close(); process.exit(fails.length ? 1 : 0);
