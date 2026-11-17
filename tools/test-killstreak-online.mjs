// Killstreaks online (servidor autoritativo): míssil pilotado, Gavião e nuke matam de verdade, nas duas telas e no kill feed.
// Precisa do servidor local com ALLOW_TEST=1 (cd server && npx wrangler dev --var ALLOW_TEST:1) e do site servido.
// Uso: node tools/test-killstreak-online.mjs [urlDoSite] [urlDoServidor]
import { chromium } from 'playwright';
const SITE = process.argv[2] || 'http://localhost:8124/', SERVER = process.argv[3] || 'ws://127.0.0.1:8787';
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
const tp = (page, x, z) => G(page, ([x, z]) => { const g = window.__docao, p = g.player; p.pos.set(x, g.groundAt(x, z, 0.3), z); p.vel.set(0, 0, 0);
  g.online.net.send({ t: 'u', sq: p.sq, tp: 1, p: [p.pos.x, p.pos.y, p.pos.z], v: [0, 0, 0], y: p.yaw, pi: 0, g: 1, w: p.weapon }); }, [x, z]);
const sendEv = (page, ev) => G(page, (ev) => { const g = window.__docao, p = g.player; g.online.net.send({ t: 'u', sq: p.sq, y: p.yaw, pi: 0, g: 1, w: p.weapon, ev }); }, ev);
// dá n abates de sequência dos dois lados (servidor: gancho de teste; cliente: mesmo contador do jogo)
const grant = async (page, n) => { await G(page, (n) => { const g = window.__docao; g.online.net.send({ t: 'testKs', n }); for (let i = 0; i < n; i++) g.rewardKill(); }, n); await wait(300); };
// aperta F até usar o killstreak pedido (os anteriores, tipo o Olho da granja, saem antes)
const use = async (page, id) => { await until(page, () => !window.__docao.predator && !window.__docao.nukeAt && window.__docao.player.alive, 20000);
  return G(page, (id) => { const g = window.__docao; for (let i = 0; i < 6 && g.streakReady.includes(id); i++) g.useStreak(); return g.streakReady; }, id); };
const feedHas = (page, txt) => G(page, (t) => (window.__feedLog || []).some((l) => l.includes(t)), txt);
const respawn = async (page) => { await until(page, () => !document.getElementById('respawnBtn') || !document.getElementById('respawnBtn').disabled, 8000); await G(page, () => window.__docao.online.net.send({ t: 'rs' })); return until(page, () => window.__docao.player.alive, 8000); };

const A = await client('Ana');
await A.click('#onlineBtn'); await A.waitForTimeout(300);
await A.selectOption('#roomMap', 'arena'); await A.selectOption('#roomMax', '2'); await A.selectOption('#roomBots', '0');
await A.click('#createBtn');
ok(await until(A, () => window.__docao.online && window.__docao.online.myId > 0), 'Ana criou a sala');
const code = await G(A, () => window.__docao.online.code);
const B = await client('Beto', `&sala=${code}`);
ok(await until(B, () => window.__docao.online && window.__docao.online.myId > 0), 'Beto entrou');
await wait(500); await A.click('#startOnline');
ok(await until(A, () => window.__docao.state === 'playing' && window.__docao.player.alive, 15000) && await until(B, () => window.__docao.state === 'playing' && window.__docao.player.alive, 15000), 'os dois jogando');
// lugares a céu aberto (o míssil e o Gavião precisam enxergar), a ~30 m um do outro
const open = (cx, cz) => G(A, ([cx, cz]) => { const g = window.__docao; let best = null, bd = 1e9;
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) { const x = cx + i, z = cz + j * 2, h = g.groundAt(x, z, 40), d = (x - cx) ** 2 + (z - cz) ** 2;
    if (h < 0.8 && d < bd && !g.collides(x, h + 1, z) && !g.collides(x, h + 4, z) && !g.collides(x, h + 12, z) && !g.collides(x, h + 20, z)) { best = [x, z]; bd = d; } }
  return best; }, [cx, cz]);
const PA = await open(-24, 0), PB = await open(8, 0); console.log('posições', PA, PB);
await tp(A, ...PA); await tp(B, ...PB); await wait(2500); // passa a proteção de renascer

// 0) servidor recusa killstreak que não foi ganho
await sendEv(B, [['ks', 'x'], ['ks', 'h'], ['ms', [PA[0], 0.3, PA[1]]]]); await wait(1500);
const fake = await G(A, () => ({ nk: window.__docao.netNukeAt, helis: window.__docao.netHelis.length, hp: window.__docao.player.hp }));
ok(!fake.nk && !fake.helis && fake.hp === 100, `sem sequência o servidor ignora nuke/Gavião/míssil (${JSON.stringify(fake)})`);

// 1) míssil pilotado (5)
await grant(A, 5);
ok((await G(A, () => window.__docao.streakReady)).includes('missile'), 'Ana tem o míssil pronto');
await use(A, 'missile');
ok(await until(A, () => window.__docao.predator && window.__docao.predator.phase === 'fly', 5000), 'laptop abriu e o míssil está no ar');
// mira o míssil no Beto (o jogador faria isso com o mouse). Headless desenha poucos quadros: empurra o míssil no rumo
// do alvo a ~70% da velocidade real (28 m/s), pra não estourar o tempo de voo — o servidor confere se o ponto é alcançável.
await G(A, () => { const g = window.__docao; let s0 = null, t0 = 0;
  const iv = setInterval(() => { const p = g.predator, b = g.entities.find((e) => e.name === 'Beto'); if (!p || !b) return clearInterval(iv);
    if (p.phase !== 'fly') return; if (!s0) { s0 = p.pos.clone(); t0 = performance.now(); }
    // caminho: até 25 m acima do Beto e depois reto pra baixo (não raspa em telhado)
    const top = { x: b.pos.x, y: b.pos.y + 25, z: b.pos.z }, L1 = Math.hypot(top.x - s0.x, top.y - s0.y, top.z - s0.z), L2 = 24.5;
    const go = Math.min(g.PREDATOR.speed * 0.8 * (performance.now() - t0) / 1000, L1 + L2);
    if (go < L1) { const k = go / L1; p.pos.set(s0.x + (top.x - s0.x) * k, s0.y + (top.y - s0.y) * k, s0.z + (top.z - s0.z) * k); p.yaw = Math.atan2(-(top.x - s0.x), -(top.z - s0.z)); p.pitch = -0.6; }
    else { p.pos.set(top.x, top.y - (go - L1), top.z); p.yaw = 0; p.pitch = -Math.PI / 2; } }, 40); });
ok(await until(B, () => !window.__docao.player.alive, 45000), 'míssil: Beto morre na tela dele'); // headless: o tempo de jogo anda devagar
ok(await until(A, () => !window.__docao.entities.find((e) => e.name === 'Beto').alive, 3000), 'míssil: Beto morre na tela da Ana');
ok(await feedHas(A, 'Ana pururucou Beto [Míssil da granja]') && await feedHas(B, 'Ana pururucou Beto [Míssil da granja]'), 'míssil no kill feed das duas telas');
const s1 = await G(A, () => ({ kills: window.__docao.player.kills, alive: window.__docao.player.alive, rk: window.__docao.rewardKills }));
ok(s1.kills === 1 && s1.alive && s1.rk === 6, `abate do míssil conta ponto e sequência, Ana viva (${JSON.stringify(s1)})`);
ok(await G(B, () => window.__docao.explosions > 0), 'Beto viu a explosão');

if (process.env.ONLY === 'missile') { await browser.close(); process.exit(fails.length ? 1 : 0); }
// 2) Gavião (7): mata o Beto e o Beto consegue acertar o Gavião
ok(await respawn(B), 'Beto renasceu');
await tp(B, ...PB);
await grant(A, 1);
const k0 = await G(A, () => window.__docao.player.kills);
await use(A, 'heli');
ok(await until(A, () => window.__docao.netHelis.length === 1, 4000) && await until(B, () => window.__docao.netHelis.length === 1, 4000), 'Gavião aparece nas duas telas');
// Beto atira no Gavião (fuzil) enquanto a proteção de renascer não acabou… se morrer antes, tudo bem: o dano já contou
await G(B, () => new Promise((done) => { let n = 0; const g = window.__docao, W = g.WEAPONS[0];
  const shot = () => { const p = g.player, h = g.netHelis[0]; if (!p.alive || !h || n++ > 25) return done(n); const o = [p.pos.x, p.pos.y + 1.6, p.pos.z], d = [h.pos[0] - o[0], h.pos[1] - o[1], h.pos[2] - o[2]], L = Math.hypot(...d);
    g.online.net.send({ t: 'u', sq: p.sq, y: p.yaw, pi: 0, g: 1, w: 0, ev: [['f', o, [d.map((v) => v / L)], 0, +(performance.now() / 1000).toFixed(3)]] }); setTimeout(shot, Math.max(60, W.rate * 1000 + 15)); };
  shot(); }));
await wait(500);
const hh = await G(A, () => window.__docao.netHelis[0] || { hp: 0, gone: true });
ok(hh.hp < 280, `Beto acerta o Gavião online (vida ${hh.hp}/280)`);
ok(await until(B, () => !window.__docao.player.alive, 15000), 'Gavião: Beto morre na tela dele');
ok(await until(A, () => !window.__docao.entities.find((e) => e.name === 'Beto').alive, 3000), 'Gavião: Beto morre na tela da Ana');
ok(await feedHas(A, 'Ana pururucou Beto [Gavião da granja]') && await feedHas(B, 'Ana pururucou Beto [Gavião da granja]'), 'Gavião no kill feed das duas telas');
const s2 = await G(A, () => ({ kills: window.__docao.player.kills, rk: window.__docao.rewardKills }));
ok(s2.kills === k0 + 1 && s2.rk === 7, `abate do Gavião conta ponto mas não a sequência (${JSON.stringify(s2)})`);
ok(await until(A, () => window.__docao.netHelis.length === 0, 34000), 'Gavião vai embora (≤ 30 s)');

if (process.env.ONLY === 'heli') { await browser.close(); process.exit(fails.length ? 1 : 0); }
// 3) nuke (10)
ok(await respawn(B), 'Beto renasceu de novo');
await tp(B, ...PB); await wait(500);
await grant(A, 3);
ok((await G(A, () => window.__docao.streakReady)).includes('nuke'), 'Ana tem o nuke');
await use(A, 'nuke');
ok(await until(B, () => window.__docao.netNukeAt > 0, 3000), 'Beto vê a contagem do nuke');
ok(await until(B, () => !window.__docao.player.alive, 9000), 'nuke: Beto morre na tela dele');
ok(await until(A, () => !window.__docao.entities.find((e) => e.name === 'Beto').alive, 3000), 'nuke: Beto morre na tela da Ana');
ok(await feedHas(A, 'Ana pururucou Beto [Fim da chapa]') && await feedHas(B, 'Ana pururucou Beto [Fim da chapa]'), 'nuke no kill feed das duas telas');
ok(await G(B, () => window.__nukeBooms > 0) && await G(A, () => window.__nukeBooms > 0 && window.__docao.player.alive), 'clarão do nuke nas duas telas, Ana viva');
const s3 = await G(A, () => ({ kills: window.__docao.player.kills, rk: window.__docao.rewardKills }));
ok(s3.kills === k0 + 2 && s3.rk === 10, `abate do nuke conta ponto mas não a sequência (${JSON.stringify(s3)})`);

ok(!errors.length, `sem erros no console${errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''}`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
