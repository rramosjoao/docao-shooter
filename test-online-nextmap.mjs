// Regressão online: depois do fim da partida, "Próximo mapa"/"Jogar de novo" — os tiros continuam dando dano (servidor autoritativo).
// Precisa de: cd server && npx wrangler dev --var ALLOW_TEST:1  +  python3 -m http.server 8124
// Uso: node test-online-nextmap.mjs [urlDoSite] [urlDoServidor]
import { chromium } from 'playwright';
const SITE = process.argv[2] || 'http://localhost:8124/', SERVER = process.argv[3] || 'ws://127.0.0.1:8787';
const errors = [], fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
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
const aimAt = (page, name) => G(page, (n) => { const g = window.__docao, p = g.player; const t = g.entities.find((e) => e.name === n); if (!t) return null;
  const dx = t.pos.x - p.pos.x, dz = t.pos.z - p.pos.z, h = t.pos.y + 1.1 - (p.pos.y + 1.6); p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(h, Math.hypot(dx, dz)); return g.visible(t); }, name);
// acha dois pontos com linha de visão no mapa atual (perto de um spawn, em chão plano)
const spot = (page) => G(page, () => { const g = window.__docao;
  for (const s of g.spawns) for (let k = 0; k < 8; k++) { const a = k * 0.785, x = s.x - Math.sin(a) * 6, z = s.z - Math.cos(a) * 6, y = g.groundAt(x, z, s.y + 0.5);
    if (Math.abs(y - s.y) > 0.3 || g.collides(x, y, z)) continue; if (!g.los([s.x, s.y + 1.4, s.z], [x, y + 1.2, z])) continue; return [s.x, s.z, x, z]; }
  return null; });
const A = await client('Ana');
await A.click('#onlineBtn'); await A.waitForTimeout(300);
await A.selectOption('#roomMap', 'arena'); await A.selectOption('#roomMax', '4'); await A.selectOption('#roomBots', '0');
await A.click('#createBtn');
ok(await until(A, () => window.__docao.online && window.__docao.online.myId > 0), 'Ana criou a sala');
const code = await G(A, () => window.__docao.online.code);
const B = await client('Beto', `&sala=${code}`);
ok(await until(B, () => window.__docao.online && window.__docao.online.myId > 0, 25000), 'Beto entrou');
await A.waitForTimeout(800);
const round = async (label) => {
  for (const [p, n] of [[A, 'Ana'], [B, 'Beto']]) ok(await until(p, () => window.__docao.state === 'playing' && window.__docao.player && window.__docao.player.alive, 12000), `${label}: ${n} jogando e vivo`);
  const map = await G(A, () => window.__docao.map.id);
  const sp = await spot(A); ok(!!sp, `${label}: pontos com visão em ${map}`); if (!sp) return;
  await tp(A, sp[0], sp[1], sp[2], sp[3]); await tp(B, sp[2], sp[3], sp[0], sp[1]); await wait(2600); // proteção de renascimento acaba
  await tp(A, sp[0], sp[1], sp[2], sp[3]); await tp(B, sp[2], sp[3], sp[0], sp[1]); await wait(600);
  const vis = await aimAt(A, 'Beto'); const hp0 = await G(B, () => window.__docao.player.hp);
  await A.mouse.move(640, 360); await A.mouse.down();
  const hurt = await until(B, (h) => window.__docao.player.hp < h || !window.__docao.player.alive, 1500, hp0); // fuzil: 10 tiros/s — 1,5 s sobra
  await A.mouse.up();
  ok(hurt, `${label} (${map}): tiro da Ana dá dano no Beto (visível=${vis}, vida antes ${hp0})`);
  return map;
};
await A.click('#startOnline');
let m0 = await round('1ª partida');
for (const [btn, n] of [['#nextMapBtn', 'próximo mapa'], ['#againBtn', 'jogar de novo']]) {
  // a partida anterior precisa ir longe no relógio do servidor (o bug: cadência guardada da partida anterior bloqueava os tiros da nova)
  await wait(9000); await A.mouse.move(640, 360); await A.mouse.down(); await wait(300); await A.mouse.up(); await wait(300);
  await G(A, () => window.__docao.online.net.send({ t: 'testEnd' }));
  ok(await until(A, () => window.__docao.state === 'over', 6000), `${n}: partida acabou`);
  ok(await until(A, (b) => !document.getElementById(b).classList.contains('hidden'), 4000, btn.slice(1)), `${n}: botão visível pro anfitrião`);
  await A.click(btn);
  const m1 = await round(n); if (btn === '#nextMapBtn') ok(m1 && m1 !== m0, `${n}: mapa trocou (${m0} → ${m1})`); m0 = m1;
}
console.log('erros:', errors.length ? errors.slice(0, 5).join('\n') : 'nenhum'); ok(!errors.length, 'sem erros de console');
await browser.close();
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
