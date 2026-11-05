// Lança-Milho (18): 3 grãos por tiro, cada um estoura em 3 pipocas (9 mini-explosões). Servidor faz a mesma conta (shared/corn.js).
// Uso: SITE=http://localhost:8123/ node test-milho.mjs
import { chromium } from 'playwright';
import { Game } from './server/src/game.js';
import { WEAPONS, CORN_W, CATEGORIES, PRIMARIES, BOT_PRIMARIES, BOT_RANGE } from './shared/rules.js';
import { CORN, cornDirs, cornAim, stepCorn, popChain } from './shared/corn.js';
import { createPhysics, mapSolids } from './shared/physics.js';
import { getMap } from './maps.js';
import { killIcon } from './killfeed-icons.js';
const SITE = process.env.SITE || 'http://localhost:8123/';
const fails = [], errors = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const ang = (a, b) => Math.acos(Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / (Math.hypot(a.x, a.y, a.z) * Math.hypot(b.x, b.y, b.z))));

// ---- regras / ícone ----
ok(WEAPONS[CORN_W].key === 'milho' && CORN_W === 18 && WEAPONS[17].key === 'sabre2', `WEAPONS[18] = milho, logo depois do Sabre Duplo`);
ok(CATEGORIES.find((c) => c.id === 'explosivo').weapons.includes(18) && PRIMARIES.includes(18) && BOT_PRIMARIES.includes(18) && BOT_RANGE[18] === 9, 'Explosivo, PRIMARIES, BOT_PRIMARIES e BOT_RANGE[18] = 9');
ok(killIcon('milho') !== killIcon('rifle'), 'ícone do killfeed próprio');

// ---- shared: determinismo ----
{
  const d = { x: 0.3, y: 0.1, z: -1 }, A = cornDirs(d, 7), B = cornDirs(d, 7);
  ok(JSON.stringify(A) === JSON.stringify(B) && A.length === CORN.grains && ang(A[0], d) < 1e-6 && A.every((v) => ang(v, d) <= 0.1), `cornDirs com semente: igual, 1º reto, leque ≤ 0,1 rad (${A.map((v) => ang(v, d).toFixed(3)).join(', ')})`);
  const P = createPhysics(mapSolids(getMap('arena')), getMap('arena').size);
  const p0 = { x: 0, y: 1, z: 0 }, c1 = popChain(P, p0, null, 5), c2 = popChain(P, p0, null, 5);
  const steps = c1.slice(1).map((p, k) => Math.hypot(p.x - c1[k].x, p.y - c1[k].y, p.z - c1[k].z));
  ok(JSON.stringify(c1) === JSON.stringify(c2) && c1.length === CORN.pops && steps.every((s) => s <= CORN.hop + 1e-6), `popChain igual nas 2 chamadas, ${CORN.pops} pontos, pulos ≤ ${CORN.hop} (${steps.map((s) => s.toFixed(2)).join(', ')})`);
  const a = cornAim({ x: 0, y: 1.5, z: 0 }, { x: 12, y: 1.5, z: 0 });
  ok(a.y > 0, `cornAim compensa a queda (y ${a.y.toFixed(3)})`);
}

// ---- servidor (sem navegador) ----
{
  const g = new Game({ code: 'TEST', map: 'arena', max: 8, fillBots: true, mode: 'dm' }, { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} });
  let fake = 1000; g.now = () => fake; const a = g.join({ name: 'A' }).ent; g.welcome(a); g.onMessage(a.id, { t: 'start' }); a.connected = true;
  for (let i = 0; i < 5; i++) { fake += 0.05; g.tick(); }
  const reset = () => { a.alive = true; a.hp = 100; a.invulnUntil = 0; a.slots = [CORN_W, 4, 7]; a.mag[CORN_W] = 6; a.reserve[CORN_W] = 24; a.reload = null; };
  reset();
  const bots = [...g.ents.values()].filter((b) => b.bot); for (const b of bots) { b.alive = false; b.respawnAt = 1e9; }
  const eye = () => ({ x: a.pos.x, y: a.pos.y + 1.6, z: a.pos.z });
  const E = (o) => [o.x, o.y, o.z];
  let all = []; g.io.broadcast = (m) => { if (m && Array.isArray(m.ev)) all.push(...m.ev); };
  const run = (n) => { for (let i = 0; i < n; i++) { fake += 0.05; g.tick(); } };
  // acha uma direção horizontal livre por pelo menos 6 m
  let free = null; for (let k = 0; k < 16 && !free; k++) { const t = k / 16 * Math.PI * 2, d = { x: Math.cos(t), y: 0, z: Math.sin(t) }, h = g.P.rayWorld(eye(), d, 14); if (h === null || h > 8) free = d; }
  ok(!!free, `direção livre a partir do spawn (${JSON.stringify(free)})`);
  // disparo básico
  g.onEvent(a, ['cn', E(eye()), [free.x, -0.1, free.z], g.now()]); run(40);
  const sh = all.filter((e) => e[0] === 'sh' && e[2] === 18).length, cl = all.filter((e) => e[0] === 'cl'), bm = all.filter((e) => e[0] === 'bm' && e[2] === 'c');
  const ids = cl[0] ? new Set(cl[0][2].map((x) => x[0])) : new Set();
  ok(sh === 1 && cl.length === 1 && ids.size === 3 && bm.length === 9 && bm.filter((e) => e[1]).length === 3 && g.corns.length === 0 && g.cornPops.length === 0 && a.mag[18] === 5,
    `servidor: 1 'sh', 1 'cl' com 3 grãos, 9 'bm' tipo c (3 com pid) e pente 5 (sh ${sh}, cl ${cl.length}, ids ${ids.size}, bm ${bm.length}, pid ${bm.filter((e) => e[1]).length}, pente ${a.mag[18]})`);
  // cadência
  reset(); a.rejectedShots = 0; all = []; fake += 1; run(1);
  g.onEvent(a, ['cn', E(eye()), [free.x, 0, free.z], g.now()]); g.onEvent(a, ['cn', E(eye()), [free.x, 0, free.z], g.now() + 0.1]); run(1);
  const cl2 = all.filter((e) => e[0] === 'cl').length;
  ok(cl2 === 1 && a.mag[18] === 5 && a.rejectedShots >= 1, `cadência: 2º tiro 0,1 s depois é recusado (cl ${cl2}, pente ${a.mag[18]}, recusados ${a.rejectedShots})`);
  run(14); g.onEvent(a, ['cn', E(eye()), [free.x, 0, free.z], g.now()]); run(1);
  ok(all.filter((e) => e[0] === 'cl').length === 2 && a.mag[18] === 4, `cadência: 0,7 s depois passa (pente ${a.mag[18]})`);
  run(30);
  // anti-hitscan
  reset(); all = []; run(20);
  g.onEvent(a, ['f', E(eye()), [[1, 0, 0]], 18, g.now() + 5]); run(1);
  ok(a.mag[18] === 6 && !all.some((e) => e[0] === 'sh'), `'f' com a arma 18 é recusado (pente ${a.mag[18]})`);
  // dano e kill
  const bot = bots[0]; reset(); all = []; run(20);
  const place = () => { const e = eye(); bot.alive = true; bot.respawnAt = 1e9; bot.invulnUntil = 0; bot.pos.x = a.pos.x + free.x * 5; bot.pos.z = a.pos.z + free.z * 5; bot.pos.y = a.pos.y; bot.vel = { x: 0, y: 0, z: 0 }; bot.frozen = true; return e; };
  place(); bot.hp = 100;
  const hold = () => { if (!bot.alive) return; bot.pos.x = a.pos.x + free.x * 5; bot.pos.z = a.pos.z + free.z * 5; bot.pos.y = a.pos.y; bot.vel = { x: 0, y: 0, z: 0 }; bot.frozen = true; };
  const kTick = () => { for (let i = 0; i < 30; i++) { hold(); a.invulnUntil = 1e9; fake += 0.05; g.tick(); } };
  // bots andam sozinhos: segura o bot no lugar a cada tick
  g.onEvent(a, ['cn', E(eye()), [free.x, -0.08, free.z], g.now()]); kTick();
  const hitEv = all.filter((e) => e[0] === 'h' && e[1] === bot.id && e[2] === a.id);
  ok(bot.hp < 100 && hitEv.length > 0, `servidor: grão acerta o bot a 5 m (hp ${Math.round(bot.hp)}, eventos h ${hitEv.length})`);
  place(); const kills0 = a.kills; bot.hp = 20; a.hp = 100; a.alive = true; a.invulnUntil = 1e9; run(2); hold(); all = [];
  g.onEvent(a, ['cn', E(eye()), [free.x, -0.08, free.z], g.now()]); kTick();
  const kEv = all.find((e) => e[0] === 'k' && e[1] === a.id && e[2] === bot.id);
  ok(!!kEv && kEv[3] === 18 && a.kills > kills0, `servidor: kill com a arma 18 (${JSON.stringify(kEv)}, kills ${kills0}→${a.kills})`);
  bot.alive = false; bot.frozen = false; bot.respawnAt = 1e9; bot.pos.x = 999; bot.pos.z = 999;
  // dano em si mesmo
  reset(); all = []; run(20);
  g.onEvent(a, ['cn', E(eye()), [0, -1, 0.05], g.now()]); run(30);
  ok(a.hp > 0 && a.hp < 100 && a.hp >= 50, `tiro no pé: se machuca, mas pouco (hp ${Math.round(a.hp)})`);
  // paredes: grão para antes da parede e a pipoca não atravessa
  {
    const P = g.P; let wall = null;
    for (let k = 0; k < 64 && !wall; k++) { const t = k / 64 * Math.PI * 2, d = { x: Math.cos(t), y: 0, z: Math.sin(t) }, h = P.rayWorldN(eye(), d, 11); if (h && h.t > 2 && Math.abs(h.n.y) < 0.1) wall = { d, h }; }
    if (!wall) ok(false, 'achar uma parede perto do spawn');
    else {
      const o = eye(), gr = { id: 77, pos: { ...o }, vel: { x: wall.d.x * CORN.speed, y: 0.5 * -CORN.grav * (wall.h.t / CORN.speed), z: wall.d.z * CORN.speed }, t: 0 };
      let h = null; for (let i = 0; i < 100 && !h; i++) h = stepCorn(P, gr, 1 / 60, [], () => false);
      const along = h ? (h.pos.x - o.x) * wall.d.x + (h.pos.z - o.z) * wall.d.z : 99;
      const chain = h ? popChain(P, h.pos, h.n, gr.id) : [];
      const los = chain.slice(1).every((p, k) => P.losClear(chain[k], p));
      ok(!!h && h.n && along <= wall.h.t + 1e-3 && los, `parede: grão estoura antes dela (n ${h && JSON.stringify(h.n)}, ${along.toFixed(2)} ≤ ${wall.h.t.toFixed(2)} m) e a pipoca não atravessa (${los})`);
    }
  }
  // bot usa a arma
  {
    reset(); a.invulnUntil = 0; a.hp = 1e6; all = [];
    const b = bots[1]; b.alive = true; b.respawnAt = 1e9; b.invulnUntil = 0; b.hp = 100; b.primary = 18; b.slots = [18, 4, 7]; b.weapon = 18; b.mag[18] = 6; b.reloadEnd = 0;
    const put = (dd) => { b.pos.x = a.pos.x + free.x * dd; b.pos.z = a.pos.z + free.z * dd; b.pos.y = a.pos.y; b.yaw = Math.atan2(-free.x, -free.z); };
    for (let i = 0; i < 200 && !all.some((e) => e[0] === 'cl' && e[1] === b.id); i++) { put(8); a.hp = 1e6; fake += 0.05; g.tick(); }
    ok(all.some((e) => e[0] === 'cl' && e[1] === b.id), `bot com o Lança-Milho atira a 8 m`);
    run(30); all = []; b.mag[18] = 6;
    for (let i = 0; i < 80; i++) { put(2); a.hp = 1e6; fake += 0.05; g.tick(); }
    ok(!all.some((e) => e[0] === 'cl' && e[1] === b.id), `bot não atira grão com o alvo a 2 m`);
  }
}

// ---- cliente ----
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => { localStorage.setItem('docao.primary', '18'); });
await page.goto(SITE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__docao && window.__docao.startGame, null, { timeout: 120000, polling: 250 });
const G = (fn, a) => page.evaluate(fn, a);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 180000, polling: 50 }); };
const click = async () => { await page.mouse.move(480, 270); await page.mouse.down(); await page.waitForTimeout(30); await page.mouse.up(); };
// Arsenal: card do Lança-Milho no grupo Explosivo, com miniatura
await page.waitForFunction(() => { const el = document.querySelector('.primchip[data-i="18"] .wthumb'); return el && /url/.test(el.style.backgroundImage); }, null, { timeout: 180000, polling: 250 }).catch(() => {});
const ars = await G(() => { const b = document.querySelector('.primchip[data-i="18"]'); if (!b) return null; localStorage.setItem('docao.primary', '0'); b.click(); return { txt: b.textContent, thumb: /url/.test(b.querySelector('.wthumb').style.backgroundImage), grp: (b.closest('[data-cat], .primgroup, div') || {}).textContent || '', saved: localStorage.getItem('docao.primary') }; });
ok(ars && ars.txt.includes('Lança-Milho') && ars.thumb && ars.saved === '18', `Arsenal: card do Lança-Milho com miniatura, clicar grava docao.primary=18 (${ars && JSON.stringify({ thumb: ars.thumb, saved: ars.saved })})`);
const grp = await G(() => [...document.querySelectorAll('.primchip[data-i="18"]')].map((b) => b.parentElement && b.parentElement.textContent.includes('Bazuca')).some(Boolean));
ok(grp, 'card no mesmo grupo da Bazuca (Explosivo)');
const lens = await G(() => ({ fp: window.__docao.fpCorn && window.__docao.fpCorn().vis !== undefined }));

await G(() => { const g = window.__docao; g.startGame('arena'); for (const e of g.entities) if (!e.isPlayer) { e.frozen = true; e.pos.set(999, -50, 999); } g.player.invulnUntil = g.time + 9999; });
await waitGame(0.6);
const st = await G(() => ({ weapon: window.__docao.player.weapon, mag: window.__docao.player.mag[18], fp: window.__docao.fpCorn() }));
ok(st.weapon === 18 && st.mag === 6 && st.fp.vis && lens.fp, `Lança-Milho na mão (${JSON.stringify({ w: st.weapon, mag: st.mag, vis: st.fp.vis })})`);
// direção livre: gira o player até achar 14 m sem parede na altura do olho
await G(() => { const g = window.__docao, p = g.player; for (let k = 0; k < 16; k++) { const yaw = k / 16 * Math.PI * 2; p.yaw = yaw; const o = { x: p.pos.x, y: p.pos.y + 1.6, z: p.pos.z }; let freeR = true; for (let s = 1; s <= 14; s++) { if (!g.los([o.x, o.y, o.z], [o.x - Math.sin(yaw) * s, o.y, o.z - Math.cos(yaw) * s])) { freeR = false; break; } } if (freeR) break; } p.pitch = -0.05; window.__cornPops = 0; });
await click();
await page.waitForFunction(() => window.__docao.corns.length === 3, null, { timeout: 120000, polling: 50 });
const tShot = await G(() => window.__docao.time);
await G((t) => { window.__stopAt = t + 0.35; }, tShot);
await page.waitForFunction((t) => window.__docao.time >= t - 1e-3, tShot + 0.35, { timeout: 180000, polling: 50 }).catch(() => {});
await page.waitForTimeout(300); await page.screenshot({ path: 'screenshots/milho-pipoca.png' });
await G(() => { window.__stopAt = null; });
await page.waitForFunction(() => window.__docao.corns.length === 0 && window.__docao.cornPopsQ.length === 0, null, { timeout: 180000, polling: 100 });
const r1 = await G(() => ({ pops: window.__cornPops, mag: window.__docao.player.mag[18], kern: window.__docao.fpCorn().kernels }));
ok(r1.pops === 9 && r1.mag === 5 && r1.kern < 10, `cliente: 3 grãos viram 9 pipocas, pente 5, espiga mais pelada (${JSON.stringify(r1)})`);
// manivela logo depois do tiro (o 1º tiro já passou; testa no próximo)
const pose = await G(() => window.__docao.fpPose());
ok(Object.values(pose).every((v) => typeof v !== 'number' || Number.isFinite(v)), 'fpPose sem NaN');
// dano em bot a 6 m
await waitGame(0.8);
const target = await G(() => {
  const g = window.__docao, p = g.player, bot = g.entities.find((e) => !e.isPlayer);
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  bot.pos.set(p.pos.x + fx * 6, p.pos.y, p.pos.z + fz * 6); bot.alive = true; bot.hp = 100; bot.invulnUntil = 0; bot.frozen = true; p.pitch = -0.05; return bot.name;
});
await waitGame(0.2);
await click();
const tS2 = await G(() => window.__docao.time);
await G((t) => { window.__stopAt = t + 0.1; }, tS2);
await page.waitForFunction((t) => window.__docao.time >= t - 1e-3, tS2 + 0.1, { timeout: 180000, polling: 50 }).catch(() => {});
const cr = await G(() => window.__docao.fpCorn().crank);
ok(cr < -0.05 && cr > -Math.PI * 2 + 0.05, `manivela girando logo depois do tiro (${cr.toFixed(2)})`);
await G(() => { window.__stopAt = null; });
await page.waitForFunction(() => window.__docao.corns.length === 0 && window.__docao.cornPopsQ.length === 0, null, { timeout: 180000, polling: 100 });
const hp1 = await G((n) => Math.round(window.__docao.entities.find((e) => e.name === n).hp), target);
ok(hp1 < 100, `pipoca machuca o bot a 6 m (hp ${hp1})`);
// kill
await waitGame(0.8);
await G((n) => { const b = window.__docao.entities.find((e) => e.name === n); b.hp = 15; b.alive = true; window.__feedLog = []; }, target);
await click();
await page.waitForFunction(() => (window.__feedLog || []).length > 0, null, { timeout: 180000, polling: 100 }).catch(() => {});
const kf = await G(() => ({ log: (window.__feedLog || []).slice(-1)[0] || '', svg: !!document.querySelector('#killfeed .kfi-svg') }));
ok(/\[Lança-Milho\]$/.test(kf.log) && kf.svg, `killfeed: ${kf.log} (svg ${kf.svg})`);
await page.waitForFunction(() => window.__docao.corns.length === 0 && window.__docao.cornPopsQ.length === 0, null, { timeout: 180000, polling: 100 });
// 3ª pessoa
const tp = await G((n) => { const g = window.__docao, b = g.entities.find((e) => e.name === n); g.setWeaponOf(b, 18); const gs = b.model.guns; return { len: gs.length, vis: gs[18] && gs[18].visible, others: gs.filter((x, i) => i !== 18 && x.visible).length }; }, target);
ok(tp.len > 18 && tp.vis && tp.others === 0, `3ª pessoa: guns[18] visível e só ele (${JSON.stringify(tp)})`);
// recarga
await waitGame(0.8);
const rs = await G(() => { const g = window.__docao, p = g.player; p.mag[18] = 0; p.reserve[18] = 24; window.__magDrops = 0; return true; });
await page.keyboard.press('KeyR');
await page.waitForFunction(() => window.__docao.player.reloadEnd > window.__docao.time, null, { timeout: 60000, polling: 50 });
const rT0 = await G(() => window.__docao.player.reloadStartT);
const at = async (k) => { await G((t) => { window.__stopAt = t; }, rT0 + k * 2.3); await page.waitForFunction((t) => window.__docao.time >= t - 1e-3, rT0 + k * 2.3, { timeout: 180000, polling: 50 }); await page.waitForTimeout(200); return G(() => ({ ...window.__docao.fpCorn(), drops: window.__magDrops || 0 })); };
const r35 = await at(0.35);
ok(!r35.cobVis && r35.drops === 1, `recarga 35%: sabugo saiu do funil (${JSON.stringify({ cobVis: r35.cobVis, drops: r35.drops })})`);
const r55 = await at(0.55);
await page.screenshot({ path: 'screenshots/milho-recarga.png' });
ok(r55.cobVis && r55.cobY > 0.2, `recarga 55%: espiga nova descendo (cobY ${r55.cobY.toFixed(3)})`);
await G(() => { window.__stopAt = null; });
await page.waitForFunction(() => window.__docao.player.reloadEnd <= window.__docao.time, null, { timeout: 180000, polling: 50 });
await waitGame(0.1);
const rEnd = await G(() => ({ mag: window.__docao.player.mag[18], ...window.__docao.fpCorn() }));
ok(rEnd.mag === 6 && Math.abs(rEnd.cobY - 0.2) < 1e-3 && rEnd.kernels === 10, `recarga terminou: pente 6, espiga no lugar (${JSON.stringify({ mag: rEnd.mag, cobY: rEnd.cobY, k: rEnd.kernels })})`);
// ADS: a espiga não tapa a mira
await page.mouse.move(480, 270); await page.mouse.down({ button: 'right' }); await waitGame(0.6);
const ad = await G(() => ({ ads: window.__docao.ads, scr: window.__docao.fpCorn().cobScr }));
await page.mouse.up({ button: 'right' });
ok(ad.ads > 0.8 && (ad.scr[1] > 0 || Math.abs(ad.scr[0]) > 0.1 || Math.abs(ad.scr[1]) > 0.1), `ADS: espiga fora do centro da tela (${JSON.stringify(ad)})`);
const errs = errors.filter((e) => !/GPU stall|ReadPixels/.test(e));
ok(errs.length === 0, `sem erro no console${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
await browser.close();
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
