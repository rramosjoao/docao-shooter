// Dois contextos WebKit na mesma sala Survival do worker local.
// Cada etapa tem prazo. O outro cliente confirma a posição que o servidor aceitou.
// Uso: timeout 170 node tools/test-zombie-net.mjs
import { webkit } from 'playwright';
import { mkdirSync } from 'fs';

const SITE = process.env.SITE || 'http://127.0.0.1:8125/';
const SERVER = process.env.SERVER || 'ws://127.0.0.1:8791';
const OUT = process.env.OUT || '/opt/cursor/artifacts';
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };

const browser = await webkit.launch();
async function client(name) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('page', name, e.message));
  await page.addInitScript((n) => localStorage.setItem('docao.name', n), name);
  await page.goto(`${SITE}?server=${encodeURIComponent(SERVER)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => !!window.__docao, null, { timeout: 30000 });
  return page;
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const snap = (page) => G(page, () => {
  const g = window.__docao, p = g.player;
  const zs = g.entities.filter((e) => e.zt && e.alive).map((e) => ({ id: e.netId || e.id, x: +e.pos.x.toFixed(2), y: +e.pos.y.toFixed(2), z: +e.pos.z.toFixed(2) }));
  const humans = g.entities.filter((e) => !e.zt && e !== p).map((e) => ({ name: e.name, x: +e.pos.x.toFixed(2), z: +e.pos.z.toFixed(2), alive: !!e.alive, hp: e.hp }));
  return {
    alive: !!(p && p.alive), hp: p ? p.hp : 0, sq: p ? p.sq : null,
    x: p ? +p.pos.x.toFixed(2) : 0, z: p ? +p.pos.z.toFixed(2) : 0,
    pts: p ? (p.points | 0) : 0, purse: p ? (p.pts | 0) : 0,
    msg: (document.getElementById('centermsg') && document.getElementById('centermsg').textContent) || '',
    zs, humans,
    banner: document.getElementById('invBanner') ? !document.getElementById('invBanner').classList.contains('hidden') : false,
    over: document.getElementById('gameover') ? !document.getElementById('gameover').classList.contains('hidden') : false,
  };
});
async function god(page) { await G(page, () => window.__docao.online.net.send({ t: 'testGod', s: 90 })); }
async function tp(page, x, z) {
  await G(page, ([x, z]) => {
    const g = window.__docao, p = g.player;
    if (!p || !p.alive) return;
    const y = g.groundAt(x, z, p.pos.y + 0.4);
    p.pos.set(x, y, z); p.vel.set(0, 0, 0);
    g.online.net.send({ t: 'u', sq: p.sq, tp: 1, p: [x, y, z], v: [0, 0, 0], y: p.yaw, pi: 0, g: 1, w: p.weapon });
  }, [x, z]);
}
// O outro cliente é quem diz se o servidor aceitou.
async function tpSeen(mover, watcher, x, z, ms = 4000) {
  await tp(mover, x, z);
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await snap(watcher);
    const me = s.humans.find((h) => Math.hypot(h.x - x, h.z - z) < 2.5);
    if (me && me.alive) return me;
    await wait(200);
  }
  return null;
}
const stairInside = (p) => p.x > -5.2 && p.x < 5.2 && p.z > 34.2 && p.z < 41.2;
async function watch(sec) {
  const Alog = new Map(), Blog = new Map();
  const n = Math.ceil(sec / 0.6);
  let last = null;
  for (let i = 0; i < n; i++) {
    const [a, b] = await Promise.all([snap(A), snap(B)]);
    last = { a, b };
    for (const z of a.zs) { if (!Alog.has(z.id)) Alog.set(z.id, []); Alog.get(z.id).push(z); }
    for (const z of b.zs) { if (!Blog.has(z.id)) Blog.set(z.id, []); Blog.get(z.id).push(z); }
    if (i % 3 === 0) {
      const z = a.zs[0];
      const zb = z && b.zs.find((q) => q.id === z.id);
      console.log(`  ${i} Ana ${a.alive ? a.hp : 'morta'} (${a.x},${a.z}) Beto ${b.alive ? b.hp : 'morto'} z${a.zs.length}` + (z ? ` #${z.id} A(${z.x},${z.z}) B(${zb ? zb.x + ',' + zb.z : '-'})` : ''));
    }
    await wait(600);
  }
  return { Alog, Blog, last };
}
function syncOf(Alog, Blog) {
  let worst = 0, n = 0;
  for (const [id, pa] of Alog) {
    const pb = Blog.get(id);
    if (!pb || !pb.length) continue;
    const a = pa[pa.length - 1], b = pb[pb.length - 1];
    worst = Math.max(worst, Math.hypot(a.x - b.x, a.z - b.z));
    n++;
  }
  return { n, worst };
}

console.log('webkit', 'abrindo');
const A = await client('Ana');
const B = await client('Beto');
await A.click('#onlineBtn');
await A.selectOption('#roomMode', 'inv');
await A.waitForTimeout(200);
await A.selectOption('#roomSurv', 'survival');
await A.waitForTimeout(200);
await A.selectOption('#roomBots', '0');
await A.selectOption('#roomMax', '4');
await A.click('#createBtn');
await A.waitForFunction(() => window.__docao.online && window.__docao.online.code, null, { timeout: 20000 });
const code = await A.evaluate(() => window.__docao.online.code);
console.log('sala', code);
await B.goto(`${SITE}?server=${encodeURIComponent(SERVER)}&sala=${code}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await B.waitForFunction(() => !!(window.__docao && window.__docao.online && window.__docao.online.myId), null, { timeout: 20000 });
ok(true, 'Beto entrou na sala ' + code);
await A.click('#startOnline');
await A.waitForFunction(() => window.__docao.state === 'playing' && window.__docao.player && window.__docao.player.alive, null, { timeout: 25000 });
await B.waitForFunction(() => window.__docao.state === 'playing' && window.__docao.player && window.__docao.player.alive, null, { timeout: 25000 });
ok((await snap(A)).alive && (await snap(B)).alive, 'os dois vivos no Hotmilk');

await god(A); await god(B);
await G(A, () => window.__docao.online.net.send({ t: 'testInv', wave: 1, fog: { cx: 0, cz: 20, r: 500, tx: 0, tz: 20, tr: 500, fx: 0, fz: 20, fr: 500 } }));
await wait(1500);
const hp0 = await snap(A);
ok(hp0.alive && hp0.hp >= 90, `god segurou a Ana no começo da wave (hp ${hp0.hp}, viva ${hp0.alive})`);

// Os dois a oeste da escada. O zumbi que nasce a leste tem de contornar.
const seenA = await tpSeen(A, B, -10, 37);
const seenB = await tpSeen(B, A, -8, 34);
ok(!!seenA, seenA ? `servidor colocou a Ana em (${seenA.x},${seenA.z})` : 'servidor não aceitou o teleporte da Ana');
ok(!!seenB, seenB ? `servidor colocou o Beto em (${seenB.x},${seenB.z})` : 'servidor não aceitou o teleporte do Beto');
console.log('contorno');
const wall = await watch(12);
const inside = [];
let around = null;
for (const [id, path] of wall.Alog) {
  if (path.some(stairInside)) inside.push(id);
  const s = path[0], e = path[path.length - 1];
  const south = path.some((p) => p.z < 33.2 && Math.abs(p.x) < 14);
  if (s.x > 2 && e.x < -4 && south) around = { id, s, e };
}
ok(inside.length === 0, `zumbi não entrou na escada fechada (${inside.join(',') || 'nenhum'})`);
ok(!!around, around ? `zumbi ${around.id} contornou de (${around.s.x},${around.s.z}) até (${around.e.x},${around.e.z})` : 'nenhum zumbi do leste contornou');
const sw = syncOf(wall.Alog, wall.Blog);
ok(sw.n > 0 && sw.worst < 2.5, `mesma posição nos dois clientes (pior ${sw.worst.toFixed(2)} m, ${sw.n})`);

// Print com os dois vivos e o zumbi na cara da Ana, depois que a faixa da wave some sozinha.
await god(A);
await A.bringToFront();
let shot = null;
const shotUntil = Date.now() + 20000;
while (Date.now() < shotUntil) {
  shot = await G(A, () => {
    const g = window.__docao, p = g.player;
    const banner = document.getElementById('invBanner') && !document.getElementById('invBanner').classList.contains('hidden');
    const over = document.getElementById('gameover') && !document.getElementById('gameover').classList.contains('hidden');
    if (!p || !p.alive || p.hp <= 0) return { ok: false, why: 'ana', banner, over };
    let best = null, bd = 1e9;
    for (const e of g.entities) if (e.zt && e.alive && e.model && e.model.group && e.model.group.visible) {
      const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best || bd > 8) return { ok: false, why: 'zumbi', banner, over, d: +bd.toFixed(2), hp: p.hp };
    const dx = best.pos.x - p.pos.x, dz = best.pos.z - p.pos.z;
    p.yaw = Math.atan2(-dx, -dz);
    p.pitch = 0.12;
    return { ok: !banner && !over, banner, over, d: +bd.toFixed(2), hp: p.hp, zx: +best.pos.x.toFixed(2), zz: +best.pos.z.toFixed(2) };
  });
  if (shot && shot.ok) break;
  await wait(400);
}
console.log('enquadramento', shot);
const live = await snap(A);
if (shot && shot.ok && live.alive && live.hp > 0 && !live.over && !live.banner && live.zs.length) {
  await wait(250);
  await A.screenshot({ path: `${OUT}/04-rede-zumbi-contorna-vista.png` });
  ok(true, `print com Ana viva (hp ${live.hp}), zumbi a ${shot.d} m, sem faixa`);
} else ok(false, `print inválido (viva ${live.alive}, hp ${live.hp}, faixa ${live.banner}, gameover ${live.over}, enquadramento ${shot && shot.why})`);

// Alvo muda para o leste.
await god(A); await god(B);
const eastA = await tpSeen(A, B, 12, 36);
const eastB = await tpSeen(B, A, 10, 32);
ok(!!eastA && !!eastB, 'os dois foram para o lado leste no servidor');
console.log('troca de lado');
const side = await watch(10);
const inside2 = [];
let back = null;
for (const [id, path] of side.Alog) {
  if (path.some(stairInside)) inside2.push(id);
  const s = path[0], e = path[path.length - 1];
  const south = path.some((p) => p.z < 33.2 && Math.abs(p.x) < 14);
  if (s.x < 0 && e.x > 4 && south) back = { id, s, e };
}
ok(inside2.length === 0, `na volta ninguém entrou na escada (${inside2.join(',') || 'nenhum'})`);
ok(!!back, back ? `zumbi ${back.id} voltou pelo sul até (${back.e.x},${back.e.z})` : 'zumbi não recalculou para o leste');
const ss = syncOf(side.Alog, side.Blog);
ok(ss.n > 0 && ss.worst < 2.5, `troca de lado igual nos dois (pior ${ss.worst.toFixed(2)} m)`);

// Porta: só a Ana viva do outro lado. Sem mordida. Abrir muda o caminho.
await G(B, () => { window.__docao.online.net.send({ t: 'testGod', s: 0 }); window.__docao.online.net.send({ t: 'testInv', lives: 0, hurt: 500 }); });
await wait(800);
await G(A, () => window.__docao.online.net.send({ t: 'testInv', killAll: true }));
await wait(600);
const rich = await snap(A);
console.log('pontos', rich.pts, 'Beto', (await snap(B)).alive);
const kit = await tpSeen(A, B, -22, 24.9);
ok(!!kit && (await snap(A)).alive, kit ? `Ana na cozinha no servidor (${kit.x},${kit.z}), hp ${(await snap(A)).hp}` : 'Ana não entrou na cozinha no servidor');
const hpBefore = (await snap(A)).hp;
console.log('porta fechada');
const closed = await watch(7);
let held = null;
for (const [id, path] of closed.Alog) {
  const tail = path.slice(-3);
  if (tail.length && tail.every((p) => p.x > -15.5 && p.x < -11)) held = { id, x: tail[tail.length - 1].x };
}
const hpAfter = (await snap(A)).hp;
ok(!!held, held ? `zumbi ${held.id} parou na folha (x ${held.x})` : 'zumbi não segurou na porta fechada');
ok(hpAfter >= hpBefore - 1 && (await snap(A)).alive, `sem mordida através da porta (hp ${hpBefore} → ${hpAfter})`);
const sd = syncOf(closed.Alog, closed.Blog);
ok(sd.n > 0 && sd.worst < 2.5, `porta fechada igual nos dois (pior ${sd.worst.toFixed(2)} m)`);

await god(A);
// Fora do sólido, dentro do alcance de uso (porta em x=-16, alcance 2.35 m).
const atDoor = await tpSeen(A, B, -14, 24.9);
await G(A, () => window.__docao.online.net.send({ t: 'door', id: 'porta-cozinha' }));
let bought = await snap(A);
const buyUntil = Date.now() + 3000;
while (Date.now() < buyUntil) {
  const s = await snap(A);
  if (s.pts < bought.pts) bought = s;
  if (s.msg) bought = { ...bought, msg: s.msg, purse: s.purse, pts: Math.min(bought.pts, s.pts) };
  if (s.pts < rich.pts && /aberta/i.test(s.msg || '')) break;
  await wait(200);
}
console.log('porta', atDoor && [atDoor.x, atDoor.z], 'pontos', rich.pts, '→', bought.pts, 'purse', bought.purse, 'msg', bought.msg);
await tpSeen(A, B, -22, 24.9);
console.log('porta aberta');
const opened = await watch(10);
let entered = null;
for (const [id, path] of opened.Alog) {
  if (path.some((p) => p.x < -18)) entered = { id, end: path[path.length - 1] };
}
ok(bought.pts < rich.pts && bought.purse < rich.pts, `porta debitou (${rich.pts} → ${bought.pts}, purse ${bought.purse})`);
ok(!!entered, entered ? `zumbi ${entered.id} entrou na cozinha (${entered.end.x},${entered.end.z})` : 'abrir a porta não mudou o caminho');
const so = syncOf(opened.Alog, opened.Blog);
ok(so.n > 0 && so.worst < 2.5, `porta aberta igual nos dois (pior ${so.worst.toFixed(2)} m)`);
ok((await snap(A)).alive && (await snap(A)).hp > 0, 'Ana continua viva no fim');

await browser.close();
console.log(fails.length ? fails.length + ' falha(s)' : 'rede ok', 'sala', code);
process.exit(fails.length ? 1 : 0);
