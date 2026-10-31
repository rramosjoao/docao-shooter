// Teste online (servidor autoritativo): Faca de churrasqueiro — golpe, alcance, cadência (servidor rejeita spam), estocada mata,
// pelas costas mata, kill feed "moggou" e mensagem "moggado" nos dois clientes, bots com faca na sala sem quebrar nada.
// Uso: node test-faca-online.mjs [urlDoSite] [urlDoServidor]   (servidor local com --var ALLOW_TEST:1)
import { chromium } from 'playwright';
const SITE = process.argv[2] || 'http://localhost:8124/', SERVER = process.argv[3] || 'ws://127.0.0.1:8787';
const SHOTS = process.env.SHOTS || 'screenshots';
const errors = [], fails = []; const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + msg); if (!c) fails.push(msg); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function client(tag, stored, query = '') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${tag}] [${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${tag}] [pageerror] ${e.message}`));
  if (stored) await page.addInitScript((n) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('docao.name', n); sessionStorage.setItem('seeded', '1'); } }, stored);
  await page.goto(`${SITE}?server=${encodeURIComponent(SERVER)}${query}`, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  return page;
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(page, fn, ms = 8000, arg) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await wait(100); } return false; }
const lobbyNames = (p) => G(p, () => (window.__docao.online.lobby?.players || []).filter((x) => !x.bot).map((x) => x.name));
const A = await client('A', 'Matheus'); const B = await client('B', 'Farofa');
await A.click('#onlineBtn'); await A.selectOption('#roomMap', 'arena'); await A.selectOption('#roomMax', '4'); await A.selectOption('#roomBots', '0'); await A.click('#createBtn');
ok(await until(A, () => window.__docao.online && window.__docao.online.myId > 0), 'A criou a sala');
const code = await G(A, () => window.__docao.online.code);
await B.goto(`${SITE}?server=${encodeURIComponent(SERVER)}&sala=${code}`, { waitUntil: 'load' });
ok(await until(B, () => !!(window.__docao.online && window.__docao.online.myId > 0 && window.__docao.online.lobby), 30000), 'B entrou');
ok(await until(A, () => (window.__docao.online.lobby?.players || []).filter((x) => !x.bot).length === 2), 'lobby com 2');
await A.click('#startOnline');
for (const p of [A, B]) ok(await until(p, () => window.__docao.state === 'playing' && window.__docao.player && window.__docao.player.alive, 15000), 'jogando');
const tp = (page, x, z, fx, fz) => G(page, ([x, z, fx, fz]) => { const g = window.__docao, p = g.player, o = g.online; p.pos.set(x, g.groundAt(x, z, 0.3), z); p.vel.set(0, 0, 0);
  p.yaw = Math.atan2(-(fx - x), -(fz - z)); p.pitch = -0.1; o.net.send({ t: 'u', sq: p.sq, tp: 1, p: [p.pos.x, p.pos.y, p.pos.z], v: [0, 0, 0], y: p.yaw, pi: p.pitch, g: 1, w: p.weapon }); }, [x, z, fx, fz]);
const hpB = () => G(B, () => ({ hp: Math.round(window.__docao.player.hp), alive: window.__docao.player.alive }));
const X = -30, Z = -25;
// A olha pro B a ~1,4 m; B de frente pro A
const face = async (d, bAway = false) => { await tp(A, X, Z, X + 5, Z); await tp(B, X + d, Z, bAway ? X + 20 : X, Z); await wait(700); };
const slash = async (button = 'left') => { await A.mouse.move(640, 360); await A.mouse.down({ button }); await wait(90); await A.mouse.up({ button }); await wait(700); };
await A.click('#game').catch(() => {}); await A.keyboard.press('Digit3'); await wait(400);
ok(await G(A, () => window.__docao.player.weapon === window.__docao.KNIFE), 'A saca a faca (3)');
await face(1.4); await wait(3200); // proteção de renascimento acaba
ok(await until(B, () => { const a = window.__docao.entities.find((e) => !e.isPlayer); return a && a.weapon === window.__docao.KNIFE && a.model.guns[window.__docao.KNIFE].visible; }, 4000), 'B vê a faca na mão do A (3ª pessoa)');
// 1) golpe
let h0 = await hpB(); await slash(); let h1 = await hpB(); console.log('golpe:', h0, h1);
ok(h0.hp - h1.hp === 40, `golpe online tira 40 (${h0.hp} → ${h1.hp})`);
// 2) alcance: 3,5 m não pega
await face(3.5); h0 = await hpB(); await slash(); h1 = await hpB(); ok(h1.hp === h0.hp, `alcance: a 3,5 m não pega (${h1.hp})`);
// 3) cadência: spam direto na rede (sem o limite do cliente) → servidor aceita só 1
await face(1.4); h0 = await hpB();
await G(A, () => { const g = window.__docao, p = g.player, o = g.online; const eye = [p.pos.x, p.pos.y + 1.6, p.pos.z], dir = [-Math.sin(p.yaw), 0, -Math.cos(p.yaw)]; const ct = performance.now() / 1000;
  for (let i = 0; i < 4; i++) g.netEv(['m', 0, eye, dir, +(ct + i * 0.05).toFixed(3), 0]); });
await wait(900); h1 = await hpB(); console.log('spam:', h0, h1);
ok(h0.hp - h1.hp === 40, `servidor rejeita golpes acima da cadência (perdeu ${h0.hp - h1.hp}, esperado 40)`);
// 4) estocada (botão direito) mata: feed + mensagem
await wait(600); await slash('right'); console.log('estocada A:', await G(A, () => [window.__lastMelee, window.__docao.player.weapon]), await hpB());
ok(await until(B, () => !window.__docao.player.alive, 3000), 'estocada (75) mata o B com 20 de vida');
const line = 'Matheus moggou Farofa [Faca]';
ok(await until(A, (l) => (window.__feedLog || []).includes(l), 3000, line), `kill feed do A: "${line}"`);
ok(await until(B, (l) => (window.__feedLog || []).includes(l), 3000, line), 'kill feed do B igual');
ok(await until(B, () => document.getElementById('deathMsg')?.textContent.includes('Você foi moggado por Matheus') || document.body.innerText.includes('Você foi moggado por Matheus'), 3000), 'B: "Você foi moggado por Matheus"');
ok(await G(B, () => document.body.innerText.includes('MOGGADO!')), 'B: carimbo MOGGADO!');
ok(await G(B, () => document.getElementById('deathMelee').textContent.includes('Faca de churrasqueiro')), 'B: tela de morte com a faca (sempre equipada)');
await B.screenshot({ path: `${SHOTS}/20-faca-online-morte.png` });
// 5) pelas costas: mata na hora
ok(await until(B, () => window.__docao.player.alive, 12000), 'B renasceu');
await wait(3200); await face(1.2, true); h0 = await hpB(); ok(h0.alive && h0.hp === 100, 'B de costas com 100 de vida');
await slash(); ok(await until(B, () => !window.__docao.player.alive, 3000), 'pelas costas: um golpe mata');
const back = 'Matheus moggou Farofa [Faca · pelas costas!]';
ok(await until(A, (l) => (window.__feedLog || []).includes(l), 3000, back), `feed: "${back}"`);
ok(await until(B, () => document.body.innerText.includes('pelas costas'), 3000), 'B vê "pelas costas"');
await A.screenshot({ path: `${SHOTS}/20-faca-online-killfeed.png` });
// 6) faca não tem munição nem recarga; volta pra arma e atira normal
await A.keyboard.press('KeyR'); await wait(300); ok(await G(A, () => !(window.__docao.player.reloadEnd > window.__docao.time)), 'faca: R não recarrega');
await A.keyboard.press('Digit1'); ok(await until(A, () => window.__docao.player.weapon === 0, 3000), 'A volta pro fuzil');
// 7) sala com bots: eles trocam pra faca de perto e nada quebra
// recarga do A aparece pro B (flag de recarga do snapshot → animação em 3ª pessoa + pente caindo)
await until(A, () => window.__docao.player.switchEnd <= window.__docao.time, 3000); await G(A, () => { window.__docao.player.pitch = 0.6; }); await A.mouse.down(); await wait(400); await A.mouse.up(); await wait(300);
await A.keyboard.press('KeyR'); const rlA = await until(A, () => window.__docao.player.reloadEnd > window.__docao.time, 2000);
ok(rlA, 'A recarrega o fuzil online');
ok(await until(B, () => { const a = window.__docao.entities.find((e) => !e.isPlayer); const g = a && a.model.guns[0]; return a && a.reloadEnd > window.__docao.time && g && Math.abs(g.rotation.z) > 0.2; }, 3000), 'B vê o A recarregando (arma inclinada em 3ª pessoa)');
ok(await until(B, () => (window.__worldMags || 0) > 0, 3000), 'B vê o pente do A caindo');
ok(await until(A, () => !(window.__docao.player.reloadEnd > window.__docao.time) && window.__docao.player.mag[0] === 30, 4000), 'recarga online completa (30)');
await A.context().close(); await B.context().close();
const C = await client('C', 'Bolota'); await C.waitForTimeout(1500);
await C.click('#onlineBtn'); await C.selectOption('#roomMap', 'arena'); await C.selectOption('#roomMax', '4'); await C.selectOption('#roomBots', '1'); await C.click('#createBtn');
ok(await until(C, () => window.__docao.online && window.__docao.online.myId > 0), 'C criou sala com 3 bots');
await C.click('#startOnline'); ok(await until(C, () => window.__docao.state === 'playing', 15000), 'C jogando com bots');
await G(C, () => { window.__sawKnife = 0; setInterval(() => { for (const e of window.__docao.entities) if (!e.isPlayer && e.weapon === window.__docao.KNIFE) window.__sawKnife++; }, 100); });
// junta os bots perto do C pra provocar briga de faca
for (let i = 0; i < 50; i++) { // gruda do lado do bot mais perto (bots puxam a faca a < 3 m)
  await G(C, () => { const g = window.__docao, p = g.player, o = g.online; if (!p.alive) return; const bs = g.entities.filter((e) => !e.isPlayer && e.alive); if (!bs.length) return;
    bs.sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos)); const b = bs[0], x = b.pos.x + 1.5, z = b.pos.z; const y = g.groundAt(x, z, b.pos.y + 0.5);
    if (g.collides(x, y, z)) return; p.pos.set(x, y, z); p.vel.set(0, 0, 0); o.net.send({ t: 'u', sq: p.sq, tp: 1, p: [x, y, z], v: [0, 0, 0], y: p.yaw, pi: 0, g: 1, w: p.weapon }); });
  await wait(400); if (await G(C, () => window.__sawKnife > 0 && (window.__feedLog || []).some((l) => l.includes('moggou')))) break; }
const sk = await G(C, () => window.__sawKnife); console.log('amostras de bot com faca:', sk, (await G(C, () => window.__feedLog || [])).slice(-5));
const run = await G(C, () => ({ st: window.__docao.state, fin: window.__docao.entities.every((e) => Number.isFinite(e.pos.x)) })); ok((run.st === 'playing' || run.st === 'over') && run.fin, `sala com bots segue rodando (${run.st})`);
ok(sk > 0, 'bot do servidor puxa a faca de perto');
console.log('\nerros de console:', errors.length ? errors : 'nenhum');
if (errors.length) fails.push('erros de console');
await browser.close();
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
