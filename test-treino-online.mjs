// Teste online do modo Treino: precisa do servidor local (cd server && npx wrangler dev --var ALLOW_TEST:1) e do site servido.
// Uso: node test-treino-online.mjs [urlDoSite] [urlDoServidor]
import { chromium } from 'playwright';
const SITE = process.argv[2] || 'http://localhost:8124/', SERVER = process.argv[3] || 'ws://127.0.0.1:8787', SHOTS = process.env.SHOTS || 'screenshots';
const errors = [], fails = []; const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + msg); if (!c) fails.push(msg); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function client(name, query = '') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] [pageerror] ${e.message}`));
  await page.addInitScript((n) => { localStorage.setItem('docao.name', n); localStorage.setItem('docao.primary', '0'); }, name);
  await page.goto(`${SITE}?server=${encodeURIComponent(SERVER)}${query}`, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  return page;
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(page, fn, ms = 8000, arg) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await wait(100); } return false; }
const tp = (page, x, z, fx, fz) => G(page, ([x, z, fx, fz]) => { const g = window.__docao, p = g.player, o = g.online; p.pos.set(x, g.groundAt(x, z, 0.3), z); p.vel.set(0, 0, 0);
  p.yaw = Math.atan2(-(fx - x), -(fz - z)); p.pitch = 0; o.net.send({ t: 'u', sq: p.sq, tp: 1, p: [p.pos.x, p.pos.y, p.pos.z], v: [0, 0, 0], y: p.yaw, pi: 0, g: 1, w: p.weapon }); }, [x, z, fx, fz]);
// tiro de fuzil (arma 0) do olho do jogador até o centro do alvo (cabeça: y + 1.75). Manda já: a fila do quadro atrasa no headless e cai na trava de relógio do servidor
const shoot = (page, name, headY = 1.0) => G(page, ([name, hy]) => { const g = window.__docao, p = g.player, t = g.entities.find((e) => e.name === name); const o = [p.pos.x, p.pos.y + 1.6, p.pos.z];
  const d = [t.pos.x - o[0], t.pos.y + hy - o[1], t.pos.z - o[2]], L = Math.hypot(...d); g.online.net.send({ t: 'u', sq: p.sq, y: p.yaw, pi: 0, g: 1, w: p.weapon, ev: [['f', o, [d.map((v) => v / L)], 0, +(performance.now() / 1000).toFixed(3)]] }); return t.hp; }, [name, headY]);

const A = await client('Ana');
await A.click('#onlineBtn'); await A.waitForTimeout(300);
await A.selectOption('#roomMode', 'treino'); await A.selectOption('#roomMax', '4');
await A.click('#createBtn');
ok(await until(A, () => window.__docao.online && window.__docao.online.myId > 0), 'Ana criou sala de Treino');
const code = await G(A, () => window.__docao.online.code);
const B = await client('Beto', `&sala=${code}`);
ok(await until(B, () => window.__docao.online && window.__docao.online.myId > 0), 'Beto entrou');
ok(await until(A, () => document.getElementById('lobbyInfo').textContent.startsWith('TREINO')), 'lobby mostra TREINO');
await A.click('#startOnline');
ok(await until(A, () => window.__docao.state === 'playing' && window.__docao.player.alive, 15000) && await until(B, () => window.__docao.state === 'playing' && window.__docao.player.alive, 15000), 'os dois jogando');
const st = await G(A, () => { const g = window.__docao; return { map: g.map.id, mode: g.mode, bots: g.entities.filter((e) => e.bot).length, timer: document.getElementById('timer').textContent }; });
ok(st.map === 'estande' && st.mode === 'treino' && st.bots === 18 && st.timer.includes('∞'), `Estande online com 18 alvos e sem tempo (${JSON.stringify(st)})`);
await tp(A, -30, 23, -30, 0); await tp(B, 30, 28, 30, 0);
await wait(3000);
const hp = await Promise.all([A, B].map((p) => G(p, () => window.__docao.player.hp)));
ok(hp[0] === 100 && hp[1] === 100, `alvos não atacam (${hp})`);
// Ana atira no alvo de 10 m (cabeça) e no de 20 m (corpo)
await tp(A, -34, 23, -36, 12); await wait(300);
await shoot(A, 'Alvo 10 m', 1.75);
await until(A, () => window.__docao.entities.find((e) => e.name === 'Alvo 10 m').hp < 100, 8000); // headless com 2 navegadores: a rede anda devagar
const h1 = await G(A, () => ({ hp: window.__docao.entities.find((e) => e.name === 'Alvo 10 m').hp, info: document.getElementById('trainInfo').textContent }));
ok(h1.hp < 100 && /CABEÇA|corpo/.test(h1.info), `dano no alvo + número/painel online (${JSON.stringify(h1)})`);
await A.screenshot({ path: `${SHOTS}/estande-online.png` });
// mata e confere renascer rápido
const k0 = await G(A, () => window.__docao.player.kills); let died = false;
for (let i = 0; i < 12 && !died; i++) { await shoot(A, 'Alvo 10 m', 1.0); await wait(400); died = await G(A, (k) => window.__docao.player.kills > k, k0); }
ok(died || await until(A, (k) => window.__docao.player.kills > k, 8000, k0), 'alvo morre (abate conta)');
ok(await until(A, () => window.__docao.entities.find((e) => e.name === 'Alvo 10 m').alive, 10000), 'alvo volta (2 s de jogo)');
// jogadores se machucam normalmente
await tp(A, -36, 23.5, -26, 23.5); await tp(B, -26, 23.5, -36, 23.5); await wait(500);
await G(A, () => { const g = window.__docao; g.entities.find((e) => e.name === 'Beto').invulnUntil = 0; });
await wait(2200); // proteção de renascer acabou faz tempo, mas espera o tp chegar
let hurt = false;
for (let i = 0; i < 6 && !hurt; i++) { await shoot(A, 'Beto', 1.0); hurt = await until(B, () => window.__docao.player.hp < 100, 2500); }
ok(hurt, 'Ana acerta o Beto (dano normal entre jogadores)');
// B troca de arma na hora (servidor aceita o tiro da arma nova)
await B.bringToFront(); await G(B, () => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB' }))); await wait(400);
const bw = await G(B, () => { const p = window.__docao.player; return { w: p.weapon, slots: p.slots }; });
ok(bw.slots[0] !== 0 && bw.w === bw.slots[0], `Beto trocou a primária na hora (${JSON.stringify(bw)})`);
ok(!errors.length, 'sem erro no console' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
console.log(fails.length ? `FALHOU ${fails.length}` : 'TUDO OK');
await browser.close(); process.exit(fails.length ? 1 : 0);
