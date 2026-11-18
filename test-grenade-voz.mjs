// Vozes do Copo Bomba: "granada" quando sai da mão, "banana" quando explode (offline e online); Pokébola não tem voz.
// Uso: node test-grenade-voz.mjs [urlSite] [urlServidor]   (a parte online precisa de `wrangler dev` em 8787; SKIP_ONLINE=1 pula)
import { chromium } from 'playwright';
const SITE = process.argv[2] || 'http://localhost:8124/', SERVER = process.argv[3] || 'ws://127.0.0.1:8787';
const fails = []; const ok = (c, m) => { console.log((c ? 'OK    ' : 'FALHA ') + m); if (!c) fails.push(m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const errors = [], files = {};
async function open(q = '') {
  const page = await (await browser.newContext({ viewport: { width: 900, height: 520 } })).newPage();
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' || /voz do copo/.test(m.text())) errors.push(m.text()); });
  page.on('response', (r) => { if (/assets\/audio\//.test(r.url())) files[r.url().split('/').pop()] = r.status(); });
  await page.goto(`${SITE}?server=${encodeURIComponent(SERVER)}${q}`); await page.waitForFunction(() => !!window.__docao, null, { timeout: 120000 }); return page;
}
const log = (p) => p.evaluate(() => (window.__voiceLog || []).slice());
const throwQ = (p, charge = 0.3) => p.evaluate((c) => { const g = window.__docao; document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' })); g.player.chargeStart = g.time - c; }, charge);
const release = (p) => p.evaluate(() => document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ' })));
async function until(p, fn, ms = 8000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await wait(100); } return false; }

// ---------- offline ----------
const P = await open();
await P.selectOption('#modeSel', 'explore'); await P.evaluate(() => window.__docao.startGame('arena'));
await wait(2500);
ok(files['granada.mp3'] === 200 && files['banana.mp3'] === 200, `arquivos de áudio carregam sem 404 (${JSON.stringify(files)})`);
await P.evaluate(() => { const p = window.__docao.player; p.nades = 4; p.pokeballs = 0; p.pos.set(-25, 0, -22); p.yaw = 0; p.invulnUntil = 1e9; window.__voiceLog = []; });
await throwQ(P); await wait(300);
ok((await log(P)).length === 0, 'segurando o botão (carregando) NÃO toca nada');
await release(P); await wait(100);
ok(JSON.stringify(await log(P)) === '["granada"]', 'ao soltar o copo toca "granada"');
ok(await until(P, () => (window.__voiceLog || []).includes('banana'), 15000), 'quando explode toca "banana"');
const seq = await log(P); ok(seq.join() === 'granada,banana', 'ordem: granada → banana (' + seq.join() + ')');
// Pokébola: sem voz
await P.evaluate(() => { const p = window.__docao.player; p.nades = 0; p.pokeballs = 1; window.__voiceLog = []; });
await throwQ(P); await wait(200); await release(P); await wait(4500);
ok((await log(P)).length === 0, 'Pokébola não toca granada/banana');
// botão de silenciar as vozes (menu): desligado, nada toca (os sons de sempre continuam); preferência fica salva
ok(await P.evaluate(() => [...document.querySelectorAll('[data-nade-voice]')].length >= 2 && [...document.querySelectorAll('[data-nade-voice]')].every((c) => c.checked)), 'botão "Vozes da granada" existe (ajustes e pausa) e vem ligado');
await P.evaluate(() => { const c = document.querySelector('[data-nade-voice]'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); });
ok(await P.evaluate(() => localStorage.getItem('docao.nadeVoice') === '0' && [...document.querySelectorAll('[data-nade-voice]')].every((c) => !c.checked)), 'desligar grava docao.nadeVoice=0 e sincroniza os dois botões');
await P.evaluate(() => { const p = window.__docao.player; p.nades = 2; p.pokeballs = 0; window.__voiceLog = []; });
await throwQ(P); await wait(200); await release(P); await wait(1200);
ok((await log(P)).length === 0, 'com a voz desligada, soltar o copo não toca "granada"');
ok(await until(P, () => window.__docao.grenades.length === 0, 15000), 'o copo explode normalmente (som de sempre)');
ok((await log(P)).length === 0, 'com a voz desligada, a explosão não toca "banana"');
// atalho H no meio da partida (sem abrir menu): alterna a mesma preferência, mostra aviso e sincroniza os checkboxes
await P.evaluate(() => { const g = window.__docao; g.player.alive = true; g.player.invulnUntil = 1e9; });
await P.keyboard.press('KeyH'); await wait(100);
ok(await P.evaluate(() => localStorage.getItem('docao.nadeVoice') === '1' && [...document.querySelectorAll('[data-nade-voice]')].every((c) => c.checked)), 'H liga (estava desligada): grava 1 e marca os checkboxes');
ok((await P.evaluate(() => document.getElementById('centermsg').textContent)).includes('ligadas'), 'H mostra o aviso "Vozes da granada: ligadas"');
await P.evaluate(() => { const p = window.__docao.player; p.nades = 2; window.__voiceLog = []; });
await throwQ(P); await wait(200); await release(P); await wait(300);
ok(JSON.stringify(await log(P)) === '["granada"]', 'com H ligando, a voz volta a tocar no meio da partida');
await P.keyboard.press('KeyH'); await wait(100);
ok(await P.evaluate(() => localStorage.getItem('docao.nadeVoice') === '0' && [...document.querySelectorAll('[data-nade-voice]')].every((c) => !c.checked)), 'H desliga: grava 0 e desmarca os checkboxes');
ok((await P.evaluate(() => document.getElementById('centermsg').textContent)).includes('desligadas'), 'H mostra o aviso "Vozes da granada: desligadas"');
// menu do ESC: o toggle fica visível no topo da pausa e funciona por clique
await P.keyboard.press('Escape'); await wait(300);
ok(await P.evaluate(() => { const l = document.getElementById('pauseNadeVoice'), p = document.getElementById('pause'); return state0() && !p.classList.contains('hidden') && l.getBoundingClientRect().height > 10 && l.getBoundingClientRect().top < p.querySelector('.panel').getBoundingClientRect().top + 120; function state0() { return true; } }), 'ESC abre a pausa com "Vozes da granada" em destaque no topo');
await P.click('#pauseNadeVoice'); await wait(150);
ok(await P.evaluate(() => localStorage.getItem('docao.nadeVoice') === '1' && [...document.querySelectorAll('[data-nade-voice]')].every((c) => c.checked)), 'clicar no toggle da pausa liga (grava 1, sincroniza)');
await P.click('#pauseNadeVoice'); await wait(150);
ok(await P.evaluate(() => localStorage.getItem('docao.nadeVoice') === '0' && [...document.querySelectorAll('[data-nade-voice]')].every((c) => !c.checked)), 'clicar de novo desliga (grava 0, sincroniza)');
const store = await P.evaluate(() => localStorage.getItem('docao.nadeVoice'));
await P.close();
{ const R = await browser.newContext({ viewport: { width: 900, height: 520 } }); await R.addInitScript((v) => { if (!sessionStorage.getItem('nv')) { sessionStorage.setItem('nv', '1'); localStorage.setItem('docao.nadeVoice', v); } }, store);
  const page = await R.newPage(); await page.goto(`${SITE}?server=${encodeURIComponent(SERVER)}`); await page.waitForFunction(() => !!window.__docao, null, { timeout: 120000 });
  ok(await page.evaluate(() => [...document.querySelectorAll('[data-nade-voice]')].every((c) => !c.checked)), 'preferência desligada persiste ao reabrir o jogo');
  await page.evaluate(() => { const c = document.querySelector('[data-nade-voice]'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
  ok(await page.evaluate(() => localStorage.getItem('docao.nadeVoice') === '1'), 'ligar de novo grava 1'); await R.close(); }

// ---------- online ----------
if (!process.env.SKIP_ONLINE) {
  const A = await open(); await A.click('#onlineBtn'); await A.selectOption('#roomBots', '0'); await A.click('#createBtn');
  ok(await until(A, () => window.__docao.online && window.__docao.online.myId > 0, 20000), 'A criou a sala');
  const code = await A.evaluate(() => window.__docao.online.code);
  const B = await open(`&sala=${code}`);
  ok(await until(B, () => !!(window.__docao.online && window.__docao.online.myId > 0 && window.__docao.online.lobby), 40000), 'B entrou');
  await A.evaluate(() => document.getElementById('startOnline').click());
  ok(await until(A, () => window.__docao.state === 'playing', 20000) && await until(B, () => window.__docao.state === 'playing', 20000), 'partida começou nos dois');
  await wait(3500);
  const tp = (page, x, z, fx, fz) => page.evaluate(([x, z, fx, fz]) => { const g = window.__docao, p = g.player, o = g.online; p.pos.set(x, g.groundAt(x, z, 0.3), z); p.vel.set(0, 0, 0); p.yaw = Math.atan2(-(fx - x), -(fz - z)); p.pitch = 0; p.invulnUntil = 1e9; window.__voiceLog = []; o.net.send({ t: 'u', sq: p.sq, tp: 1, p: [p.pos.x, p.pos.y, p.pos.z], v: [0, 0, 0], y: p.yaw, pi: 0, g: 1, w: p.weapon }); }, [x, z, fx, fz]);
  await tp(A, -30, -25, -22.5, -25); await tp(B, -22.5, -22, -30, -25); await wait(1200);
  await throwQ(A); await wait(250); await release(A);
  ok(await until(A, () => (window.__voiceLog || []).includes('granada'), 3000), 'ONLINE: quem arremessa ouve "granada" na hora da soltura');
  ok(await until(B, () => (window.__voiceLog || []).includes('granada'), 4000), 'ONLINE: o outro jogador (perto) também ouve "granada"');
  ok(await until(A, () => (window.__voiceLog || []).includes('banana'), 7000), 'ONLINE: explosão toca "banana" pra quem arremessou');
  ok(await until(B, () => (window.__voiceLog || []).includes('banana'), 7000), 'ONLINE: e pra quem está perto');
  // longe: A fica num canto e B joga lá do outro (>50 m): A não ouve nada, B ouve o seu
  await tp(A, -30, -25, -22.5, -25); await tp(B, 25, 22, 0, 0); await wait(1500);
  await A.evaluate(() => { window.__voiceLog = []; }); await B.evaluate(() => { window.__voiceLog = []; });
  await throwQ(B); await wait(250); await release(B);
  ok(await until(B, () => (window.__voiceLog || []).includes('banana'), 12000), 'ONLINE: quem jogou de longe ouve o seu "granada" e "banana"');
  ok(!(await log(A)).includes('banana') && !(await log(A)).includes('granada'), 'ONLINE: quem está longe (>50 m) não ouve nada');
}
const bad = errors.filter((e) => !/favicon|WebGL|GPU|swiftshader/i.test(e)); ok(bad.length === 0, 'sem erros no console' + (bad[0] ? ': ' + bad[0] : ''));
await browser.close(); console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
