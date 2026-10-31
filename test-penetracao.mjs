// Collateral + penetração de parede leve (shared/penetration.js): unidade do traceShot, servidor (Game.hitscan e 'f') e cliente offline.
// Uso: SITE=http://localhost:8123/ node test-penetracao.mjs   (NO_BROWSER=1 roda só a parte em Node)
import { chromium } from 'playwright';
import { Game } from './server/src/game.js';
import { WEAPONS } from './shared/rules.js';
import { mapSolids, createPhysics, WALL_COLLIDE_H } from './shared/physics.js';
import { traceShot, solidKind, PEN } from './shared/penetration.js';
import { getMap } from './maps.js';
const SITE = process.env.SITE || 'http://localhost:8123/';
const fails = [], errors = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const near = (a, b, e = 0.01) => Math.abs(a - b) <= e;
const B = (x0, y0, z0, x1, y1, z1, ramp = null) => ({ min: { x: x0, y: y0, z: z0 }, max: { x: x1, y: y1, z: z1 }, ramp });
const RIFLE = 0, SHOTGUN = 1, SNIPER = 2, CANHAO = 5, CARABINA = 6, FAMAS = 15;

// ---------------- unidade: material ----------------
{
  const cases = [[B(0, 0, 0, 0.5, 3, 6), 'thin'], [B(0, 0, 0, 0.3, 3, 4), 'thin'], [B(0, 0, 0, 6, 1, 0.15), 'thin'], [B(0, 0, 0, 1.6, 1.6, 1.6), 'wood'], [B(0, 3, 0, 6, 3.3, 6), null],
    [B(0, 3, 0, 0.5, 3.3, 6), null], [B(0, 0, 0, 4, 2, 4, { axis: 'x', dir: 1, h0: 0, h1: 2 }), null], [B(0, 0, 0, 1, 6, 10), null], [B(-33, 0, -29, 33, WALL_COLLIDE_H, -28), null], [B(0, 0, 0, 2.4, 2.6, 6), null]];
  const got = cases.map(([s]) => solidKind(s)); ok(got.every((k, i) => k === cases[i][1]), `solidKind: paredes finas, caixote, laje, rampa, muro de 1 m, limite e contêiner (${got.join(',')})`);
}
// ---------------- cliente online: ramo 'k' do netEvent (extraído de main.js, com stubs) ----------------
{
  const src = (await import('node:fs')).readFileSync(new URL('./main.js', import.meta.url), 'utf8'), m = src.match(/\} else if \(k === 'k'\) \{([\s\S]*?)\} else if \(k === 'sp'\)/);
  const names = ['entOf', 'KNIFE', 'gameTime', 'RESPAWN_TIME', 'addKillFeed', 'KS_KILL_NAME', 'sfx', 'distVol', 'player', 'notePlayerKill', 'noteWeaponKill', 'feedbackAward', 'HELI', 'onPlayerDeath', 'showStamp', 'arcLine', 'arcMark', 'revengeName'];
  const ents = { 1: { name: 'A', kills: 0 }, 2: { name: 'B', deaths: 0, pos: {} } }, feed = [], sfx = new Proxy({}, { get: () => () => {} });
  let err = null; try { new Function(...names, 'ev', '"use strict";' + m[1])((id) => ents[id], 7, 1, 3, (...a) => feed.push(a), {}, sfx, () => 1, {}, () => {}, () => {}, () => {}, { points: 25 }, () => {}, () => {}, {}, {}, null, ['k', 1, 2, 0, 0, 5, 3, 0, null, 2]); } catch (e) { err = e; }
  ok(!err && ents[1].kills === 5 && ents[2].deaths === 3 && !ents[2].alive && feed.length === 1 && feed[0][6] === 2, `cliente online: evento 'k' com collateral aplica placar e killfeed${err ? ' (' + err.message + ')' : ''}`);
}
// ---------------- unidade: traceShot ----------------
const O = { x: 0, y: 0.8, z: 0 }, X = { x: 1, y: 0, z: 0 }, tgt = (x, z = 0, n = 't' + x) => ({ e: { name: n }, p: { x, y: 0, z } });
{
  const P = createPhysics([B(5, 0, -12, 5.5, 3, 12)], [40, 40]);
  let tr = traceShot(P, O, X, WEAPONS[SNIPER], [tgt(8)]);
  ok(tr.hits.length === 1 && near(tr.hits[0].dmg, 60) && tr.hits[0].walls === 1 && tr.holes.length === 2 && near(tr.holes[0].p.x, 5) && tr.holes[0].n.x === -1 && near(tr.holes[1].p.x, 5.5) && tr.holes[1].n.x === 1 && tr.holes[1].out,
    `Torresmo pela parede de 0,5 m: ${tr.hits[0] && tr.hits[0].dmg.toFixed(2)} de dano (60), furo de entrada e saída`);
  tr = traceShot(P, O, X, WEAPONS[RIFLE], [tgt(8)]); ok(tr.hits.length === 0 && tr.stop === 'wall' && near(tr.end, 5), `Fuzil (pen 0,35) para na parede de 0,5 m (${tr.stop} em ${tr.end.toFixed(2)})`);
  tr = traceShot(P, O, X, WEAPONS[CANHAO], [tgt(8)]); ok(tr.hits.length === 1 && near(tr.hits[0].dmg, 180 * (1 - 0.15 - 0.45 * 0.5 / 1.6), 0.05), `Canhão pela parede: ${tr.hits[0] && tr.hits[0].dmg.toFixed(1)} (127,7, mata)`);
  const D = { x: Math.SQRT1_2, y: 0, z: Math.SQRT1_2 }; tr = traceShot(P, O, D, WEAPONS[SNIPER], [tgt(8, 8)]);
  ok(tr.hits.length === 1 && near(tr.hits[0].dmg, 100 * (1 - 0.15 - 0.45 * 0.5 * Math.SQRT2 / 0.9), 0.05), `tiro a 45° custa mais parede: ${tr.hits[0] && tr.hits[0].dmg.toFixed(1)} (≈49,6)`);
  tr = traceShot(P, O, X, WEAPONS[SHOTGUN], [tgt(8)]); ok(tr.hits.length === 0 && tr.holes.length === 0, 'Calibre 12 (pen 0) não atravessa nada');
}
{
  const P = createPhysics([B(5, 0, -0.8, 6.6, 1.6, 0.8)], [40, 40]);
  const a = traceShot(P, O, X, WEAPONS[SNIPER], [tgt(9)]), b = traceShot(P, O, X, WEAPONS[CARABINA], [tgt(9)]);
  ok(a.hits.length === 1 && b.hits.length === 0 && b.stop === 'wall', `caixote de 1,6 m (custo 0,72): Torresmo passa (${a.hits[0] && a.hits[0].dmg.toFixed(1)}), Carabina não`);
  const P2 = createPhysics([B(5, 0, -5, 5.5, 3, 5), B(7, 0, -5, 7.5, 3, 5)], [40, 40]);
  const c = traceShot(P2, O, X, WEAPONS[SNIPER], [tgt(10)]), d = traceShot(P2, O, X, WEAPONS[CANHAO], [tgt(10)]);
  ok(c.hits.length === 0 && near(c.end, 7) && d.hits.length === 1 && d.hits[0].walls === 2, `duas paredes de 0,5: Torresmo para na 2ª (${c.end.toFixed(2)}), Canhão passa as duas`);
  const P4 = createPhysics([3, 4, 5, 6].map((x) => B(x, 0, -5, x + 0.15, 3, 5)), [40, 40]);
  const e = traceShot(P4, O, X, WEAPONS[CANHAO], [tgt(8)]); ok(e.hits.length === 0 && near(e.end, 6) && e.holes.length === 2 * PEN.maxWalls, `quatro paredes finas: para na 4ª (máx. ${PEN.maxWalls}) em ${e.end.toFixed(2)}`);
  const P6 = createPhysics([B(5, 0, -5, 5.6, 3, 5)], [40, 40]); const f = traceShot(P6, O, X, WEAPONS[CARABINA], [tgt(8)]);
  ok(f.hits.length === 1, 'Carabina (pen 0,6) ainda passa reto pela parede de 0,6 m');
}
{
  const P = createPhysics([], [40, 40]), T = [tgt(5), tgt(7), tgt(9), tgt(11)], dm = (tr) => tr.hits.map((h) => +h.dmg.toFixed(2));
  const s = traceShot(P, O, X, WEAPONS[SNIPER], T), c = traceShot(P, O, X, WEAPONS[CANHAO], T), k = traceShot(P, O, X, WEAPONS[CARABINA], T), f = traceShot(P, O, X, WEAPONS[FAMAS], T), r = traceShot(P, O, X, WEAPONS[RIFLE], T);
  ok(dm(s).join() === '100,75,56.25' && s.stop === 'body' && s.hits.map((h) => h.bodies).join() === '0,1,2', `collateral Torresmo: ${dm(s).join('/')} e o 4º intocado`);
  ok(dm(c).join() === '180,153,130.05,110.54' || dm(c).join() === '180,153,130.05,110.55', `collateral Canhão: ${dm(c).join('/')}`);
  ok(dm(k).join() === '55,33', `collateral Carabina: ${dm(k).join('/')}`);
  ok(f.hits.length === 1 && r.hits.length === 1 && dm(r).join() === '20', `FAMAS e Fuzil sem collateral (Fuzil ${dm(r).join()})`);
}
{
  const P = createPhysics([B(5, 0, -5, 5.5, 3, 5)], [40, 40]);
  const tr = traceShot(P, O, X, WEAPONS[SNIPER], [tgt(5.9)]); ok(tr.hits.length === 1 && near(tr.hits[0].t, 5.5, 0.01), `alvo encostado na parede do outro lado é acertado (t ${tr.hits[0] && tr.hits[0].t.toFixed(3)})`);
  const P0 = createPhysics([], [40, 40]), H = { name: 'heli' };
  const h = traceShot(P0, O, X, WEAPONS[SNIPER], [tgt(5), tgt(8)], [{ h: H, c: { x: 6.5, y: 0.8, z: 0 }, r: 0.5 }]);
  ok(h.stop === 'heli' && h.heli && h.heli.h === H && near(h.heli.dmg, 75) && h.hits.length === 1, `helicóptero no caminho segura a bala (dano ${h.heli && h.heli.dmg}, ${h.hits.length} corpo)`);
  const h2 = traceShot(P0, O, X, WEAPONS[SNIPER], [tgt(5)], [{ h: H, c: { x: 0.1, y: 0.8, z: 0 }, r: 0.03 }]); ok(!h2.heli && h2.hits.length === 1, 'helicóptero a menos de 0,15 m é ignorado');
}

// ---------------- geometria da arena: parede fina e uma fila no aberto ----------------
const MAP = getMap('arena'), SP = createPhysics(mapSolids(MAP), MAP.size);
const add = (a, d, k) => ({ x: a.x + d.x * k, y: a.y + d.y * k, z: a.z + d.z * k }), unit = (a, b) => { const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, L = Math.hypot(d.x, d.y, d.z); return { x: d.x / L, y: d.y / L, z: d.z / L }; };
function findWall(P) {
  for (const s of P.solids) {
    if (solidKind(s) !== 'thin' || s.min.y !== 0 || s.max.y - s.min.y < 2.5) continue;
    const dx = s.max.x - s.min.x, dz = s.max.z - s.min.z, th = Math.min(dx, dz); if (th < 0.4 || th > 0.6 || Math.max(dx, dz) < 3) continue;
    const mid = { x: (s.min.x + s.max.x) / 2, y: 0, z: (s.min.z + s.max.z) / 2 };
    for (const sg of [1, -1]) {
      const n = dx < dz ? { x: sg, y: 0, z: 0 } : { x: 0, y: 0, z: sg }, a = add(mid, n, -(th / 2 + 3)), b = add(mid, n, th / 2 + 1.5);
      if (P.collides(a.x, 0, a.z) || P.collides(b.x, 0, b.z) || Math.abs(P.groundAt(a.x, a.z, 1)) > 0.01 || Math.abs(P.groundAt(b.x, b.z, 1)) > 0.01) continue;
      const eye = { x: a.x, y: 1.6, z: a.z }, d = unit(eye, { x: b.x, y: 0.8, z: b.z }), tr = traceShot(P, eye, d, WEAPONS[SNIPER], [{ e: 'B', p: b }]);
      if (tr.hits.length === 1 && tr.holes.length === 2) return { a, b, eye, d };
    }
  }
  return null;
}
function findLine(P) {
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 4000; i++) {
    const p = { x: (rnd() * 2 - 1) * (MAP.size[0] - 4), y: 0, z: (rnd() * 2 - 1) * (MAP.size[1] - 4) }, ang = rnd() * Math.PI * 2, d = { x: Math.cos(ang), y: 0, z: Math.sin(ang) };
    const pts = [0, 4, 7, 10].map((k) => add(p, d, k)); if (pts.some((q) => P.collides(q.x, 0, q.z) || Math.abs(P.groundAt(q.x, q.z, 1)) > 0.01 || P.collides(q.x + 0.6, 0, q.z) || P.collides(q.x - 0.6, 0, q.z) || P.collides(q.x, 0, q.z + 0.6) || P.collides(q.x, 0, q.z - 0.6))) continue;
    if (P.rayWorld({ x: p.x, y: 0.8, z: p.z }, d, 12) !== null || P.rayWorld({ x: p.x, y: 1.6, z: p.z }, d, 12) !== null) continue;
    return { p, d, t: pts.slice(1) };
  }
  return null;
}
const WALL = findWall(SP), LINE = findLine(SP);
ok(WALL && LINE, `arena: parede fina com os dois lados livres (${WALL && JSON.stringify(WALL.a)}) e fila no aberto (${LINE && JSON.stringify(LINE.p)})`);

// ---------------- servidor ----------------
{
  const g = new Game({ code: 'TEST', map: 'arena', max: 8, fillBots: true, mode: 'dm' }, { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} });
  let fake = 1000; g.now = () => fake; const A = g.join({ name: 'A' }).ent; g.welcome(A); g.onMessage(A.id, { t: 'start' }); A.connected = true;
  for (let i = 0; i < 5; i++) { fake += 0.05; g.tick(); }
  const bots = [...g.ents.values()].filter((e) => e.bot); ok(bots.length >= 3, `servidor com ${bots.length} bots`);
  const park = () => { for (const b of bots) { b.alive = false; b.respawnAt = 1e9; } };
  const place = (b, p) => { b.alive = true; b.hp = 100; b.invulnUntil = 0; b.pos = { x: p.x, y: p.y, z: p.z }; b.hist = []; };
  park(); A.alive = true; A.hp = 100; A.invulnUntil = 1e9; A.pos = { ...WALL.a }; A.hist = []; A.ping = 0;
  const B0 = bots[0]; place(B0, WALL.b);
  g.events.length = 0; g.hitscan(A, WALL.eye, [WALL.d], SNIPER);
  let sh = g.events.find((e) => e[0] === 'sh'), h = g.events.find((e) => e[0] === 'h');
  ok(near(B0.hp, 40, 1.5) && sh && Array.isArray(sh[5]) && sh[5].length === 2 && sh[5][1][6] === 1 && h && (h[6] & 1), `servidor: Torresmo pela parede deixa o bot com ${B0.hp.toFixed(1)} (≈40), 'sh' com 2 furos, 'h' com fx parede`);
  place(B0, WALL.b); g.events.length = 0; g.hitscan(A, WALL.eye, [WALL.d], RIFLE); sh = g.events.find((e) => e[0] === 'sh');
  ok(B0.hp === 100 && sh && sh.length === 5, `servidor: Fuzil não atravessa a parede de 0,5 m (vida ${B0.hp}, 'sh' sem furos)`);
  place(B0, WALL.b); g.events.length = 0; const k0 = A.kills; g.hitscan(A, WALL.eye, [WALL.d], CANHAO); let k = g.events.find((e) => e[0] === 'k');
  ok(!B0.alive && k && (k[9] & 1) && A.kills === k0 + 1, `servidor: Canhão pela parede mata e o 'k' leva fx parede (${JSON.stringify(k)})`);
  // collateral: três bots em fila
  park(); A.pos = { ...LINE.p }; const o = { x: LINE.p.x, y: 0.8, z: LINE.p.z }, three = bots.slice(0, 3);
  three.forEach((b, i) => place(b, LINE.t[i])); g.events.length = 0; const k1 = A.kills; g.hitscan(A, o, [LINE.d], CANHAO);
  const ks = g.events.filter((e) => e[0] === 'k'), mk = g.events.find((e) => e[0] === 'mk');
  ok(three.every((b) => !b.alive) && ks.length === 3 && !(ks[0][9] & 2) && (ks[1][9] & 2) && (ks[2][9] & 2) && mk && mk[1] === A.id && mk[2] === 3 && A.kills === k1 + 3, `servidor: Canhão mata os três em fila, collateral no 2º e 3º, ['mk', A, 3] (${JSON.stringify(mk)})`);
  three.forEach((b, i) => place(b, LINE.t[i])); g.events.length = 0; g.hitscan(A, o, [LINE.d], SNIPER);
  ok(!three[0].alive && near(three[1].hp, 25, 0.5) && near(three[2].hp, 43.75, 0.5) && !g.events.some((e) => e[0] === 'mk'), `servidor: Torresmo mata o 1º, ${three[1].hp} e ${three[2].hp} nos outros, sem 'mk'`);
  // pelo protocolo ('f' do cliente)
  three.forEach((b, i) => place(b, LINE.t[i])); A.slots = [CANHAO, 4, 7]; A.mag[CANHAO] = 3; A.reload = null; A.lastShot[CANHAO] = -99; A.weapon = CANHAO;
  fake += 3; g.events.length = 0; g.onEvent(A, ['f', [o.x, o.y, o.z], [[LINE.d.x, LINE.d.y, LINE.d.z]], CANHAO, fake, g.T]);
  ok(three.every((b) => !b.alive) && g.events.some((e) => e[0] === 'mk' && e[2] === 3), `servidor: evento 'f' do Canhão faz o mesmo collateral (rejeitados ${A.rejectedShots || 0})`);
}

// Invasão: fuzil (pierce 0 na arma) atravessa 3 zumbis. Mata-mata: a mesma bala para no primeiro.
if (LINE) {
  const io = { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} };
  const boot = (mode) => {
    const g = new Game({ code: 'TEST', map: 'arena', max: 4, fillBots: false, mode }, io);
    let fake = 1000; g.now = () => fake;
    const A = g.join({ name: 'A' }).ent; g.welcome(A); g.onMessage(A.id, { t: 'start' }); A.connected = true;
    for (let i = 0; i < 5; i++) { fake += 0.05; g.tick(); }
    A.alive = true; A.hp = 100; A.invulnUntil = 1e9; A.pos = { x: LINE.p.x, y: LINE.p.y, z: LINE.p.z }; A.hist = [];
    return g;
  };
  const at = (k) => ({ x: LINE.p.x + LINE.d.x * k, y: LINE.p.y, z: LINE.p.z + LINE.d.z * k });
  const o = { x: LINE.p.x, y: 0.8, z: LINE.p.z };
  const place = (e, p, hp) => { e.alive = true; e.hp = hp; e.invulnUntil = 0; e.pos = { x: p.x, y: p.y, z: p.z }; e.vel = { x: 0, y: 0, z: 0 }; e.hist = []; e.crouch = 0; };
  {
    const g = boot('dm'); const A = [...g.ents.values()].find((e) => e.name === 'A');
    const bots = [4, 7, 10].map((k) => { const b = g.makeEnt({ name: 'B', skin: A.skin, primary: 0, bot: true }); place(b, at(k), 100); return b; });
    g.events.length = 0; g.hitscan(A, o, [LINE.d], RIFLE);
    ok(WEAPONS[RIFLE].pierce === 0 && bots[0].hp < 100 && bots[1].hp === 100 && bots[2].hp === 100, `mata-mata: Fuzil (pierce 0) para no 1º (${bots.map((b) => b.hp).join('/')})`);
  }
  {
    const g = boot('inv'); const A = [...g.ents.values()].find((e) => e.name === 'A');
    ok(!!g.inv, 'servidor de Invasão tem this.inv');
    for (const z of [...g.ents.values()]) if (z.zt) z.alive = false;
    const zs = [4, 7, 10].map((k) => { const z = g.makeEnt({ name: 'Z', skin: A.skin, primary: 0, bot: true }); z.zt = 'walker'; z.size = 1; place(z, at(k), 110); return z; });
    const H = g.join({ name: 'H' }).ent; H.connected = true; place(H, at(5.5), 100);
    const pierce = WEAPONS[RIFLE].pierce, mul = WEAPONS[RIFLE].pierceMul;
    g.events.length = 0; g.hitscan(A, o, [LINE.d], RIFLE);
    const hurt = zs.map((z) => +(110 - z.hp).toFixed(2));
    const want = [20, +(20 * 0.82).toFixed(2), +(20 * 0.82 * 0.82).toFixed(2)];
    ok(pierce === 0 && WEAPONS[RIFLE].pierce === pierce && WEAPONS[RIFLE].pierceMul === mul && hurt.every((d, i) => near(d, want[i], 0.05)) && H.hp === 100,
      `invasão: Fuzil pierce 0 acerta 3 zumbis (${hurt.join('/')}, esperado ${want.join('/')}) e não fere o jogador (hp ${H.hp})`);
  }
}

if (!process.env.NO_BROWSER) {
  // ---------------- cliente ----------------
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(SITE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__docao && window.__docao.startGame, null, { timeout: 120000, polling: 250 });
  const G = (fn, a) => page.evaluate(fn, a);
  const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 180000, polling: 50 }); };
  await G(() => { const g = window.__docao; g.startGame('arena'); for (const e of g.entities) if (!e.isPlayer) { e.frozen = true; e.pos.set(999, -50, 999); } g.player.invulnUntil = g.time + 9999; });
  await waitGame(0.6);
  // paridade numérica cliente × servidor: os mesmos 20 raios nas caixas do cliente (PHYS) e no mapSolids do servidor
  const rays = []; for (let i = 0; i < 20; i++) { const a = i * 2.39996, r = 4 + (i % 5) * 4; rays.push({ o: { x: Math.cos(a) * r, y: 1.6, z: Math.sin(a) * r }, d: (() => { const b = i * 1.7, v = { x: Math.cos(b), y: -0.04 + (i % 3) * 0.03, z: Math.sin(b) }, L = Math.hypot(v.x, v.y, v.z); return { x: v.x / L, y: v.y / L, z: v.z / L }; })(), w: [SNIPER, CANHAO, CARABINA, RIFLE][i % 4] }); }
  const fakeT = [[3, -2], [-6, 5], [10, 1], [-12, -9], [0, 14], [18, -4]].map(([x, z], i) => ({ n: 'f' + i, p: { x, y: SP.groundAt(x, z, 1), z } }));
  const sig = (tr) => [tr.end.toFixed(3), tr.stop, tr.holes.length, tr.hits.map((h) => h.e.name + ':' + h.dmg.toFixed(3)).join('|')].join(';');
  const node = rays.map((r) => sig(traceShot(SP, r.o, r.d, WEAPONS[r.w], fakeT.map((t) => ({ e: { name: t.n }, p: t.p })))));
  const web = await G(async ([rays, fakeT]) => { const m = await import('/shared/penetration.js'), R = await import('/shared/rules.js'), g = window.__docao;
    const sig = (tr) => [tr.end.toFixed(3), tr.stop, tr.holes.length, tr.hits.map((h) => h.e.name + ':' + h.dmg.toFixed(3)).join('|')].join(';');
    return rays.map((r) => sig(m.traceShot(g.PHYS, r.o, r.d, R.WEAPONS[r.w], fakeT.map((t) => ({ e: { name: t.n }, p: t.p }))))); }, [rays, fakeT]);
  const diff = node.map((s, i) => (s === web[i] ? null : i)).filter((i) => i !== null);
  ok(diff.length === 0, `paridade cliente × servidor nos 20 raios (${node.filter((s) => s.split(';')[2] !== '0').length} atravessaram parede${diff.length ? '; diferem: ' + diff.map((i) => `${i} node=${node[i]} web=${web[i]}`).join(' / ') : ''})`);
  // Torresmo pela parede no offline
  const wall = await G(([W, w]) => { const g = window.__docao, p = g.player, V = g.V3, bot = g.entities.find((e) => !e.isPlayer);
    p.pos.set(W.a.x, W.a.y, W.a.z); p.vel.set(0, 0, 0); bot.pos.set(W.b.x, W.b.y, W.b.z); bot.alive = true; bot.hp = 100; bot.invulnUntil = 0; const h0 = g.holeCount;
    const eye = new V(W.eye.x, W.eye.y, W.eye.z), res = g.fire(p, eye, new V(W.d.x, W.d.y, W.d.z), w, 0, eye.clone());
    return { hp: bot.hp, res, tr: g.lastTrace, holes: g.holeCount - h0, cls: document.getElementById('hitmarker').className, name: bot.name }; }, [WALL, SNIPER]);
  ok(near(wall.hp, 40, 1.5) && wall.tr.hits[0] && wall.tr.hits[0].walls === 1 && wall.holes >= 2 && /\bwall\b/.test(wall.cls) && wall.res.wall, `cliente: Torresmo pela parede deixa ${wall.name} com ${wall.hp.toFixed(1)}, ${wall.holes} furos, hitmarker '${wall.cls}'`);
  await waitGame(0.1); await page.screenshot({ path: 'screenshots/wallbang.png' });
  const rifle = await G(([W, w]) => { const g = window.__docao, p = g.player, V = g.V3, bot = g.entities.find((e) => !e.isPlayer); bot.hp = 100; bot.alive = true;
    const eye = new V(W.eye.x, W.eye.y, W.eye.z); g.fire(p, eye, new V(W.d.x, W.d.y, W.d.z), w, 0, eye.clone()); return { hp: bot.hp, tr: g.lastTrace }; }, [WALL, RIFLE]);
  ok(rifle.hp === 100 && rifle.tr.stop === 'wall' && rifle.tr.holes === 0, `cliente: Fuzil para na parede (vida ${rifle.hp}, ${rifle.tr.stop})`);
  const wk = await G(([W, w]) => { const g = window.__docao, p = g.player, V = g.V3, bot = g.entities.find((e) => !e.isPlayer); bot.hp = 100; bot.alive = true; window.__feedLog = [];
    const eye = new V(W.eye.x, W.eye.y, W.eye.z); g.fire(p, eye, new V(W.d.x, W.d.y, W.d.z), w, 0, eye.clone());
    return { alive: bot.alive, log: window.__feedLog.slice(), icon: !!document.querySelector('#killfeed .kf .kfi-wall'), medal: [...document.querySelectorAll('#medals .medal b')].map((b) => b.textContent) }; }, [WALL, CANHAO]);
  ok(!wk.alive && wk.log.length === 1 && wk.log[0].endsWith(' +parede') && wk.icon && wk.medal.includes('Pela parede'), `cliente: Canhão pela parede mata, killfeed com tijolo e medalha (${wk.log[0]}; ${wk.medal.join(', ')})`);
  // collateral offline: três bots em fila
  await waitGame(0.2);
  const col = await G(([L, w]) => { const g = window.__docao, p = g.player, V = g.V3, bots = g.entities.filter((e) => !e.isPlayer).slice(1, 4); window.__feedLog = [];
    p.pos.set(L.p.x, 0, L.p.z); bots.forEach((b, i) => { b.pos.set(L.t[i].x, 0, L.t[i].z); b.alive = true; b.hp = 100; b.invulnUntil = 0; });
    const o = new V(L.p.x, 0.8, L.p.z), res = g.fire(p, o, new V(L.d.x, L.d.y, L.d.z), w, 0, o.clone());
    return { dead: bots.filter((b) => !b.alive).length, res, log: window.__feedLog.slice(), medal: [...document.querySelectorAll('#medals .medal b')].map((b) => b.textContent), icon: !!document.querySelector('#killfeed .kf .kfi-col') }; }, [LINE, CANHAO]);
  ok(col.dead === 3 && col.res.kills === 3 && col.log.length === 3 && !col.log[0].endsWith('+colat') && col.log.slice(1).every((l) => l.endsWith(' +colat')) && col.medal.includes('Collateral') && col.icon,
    `cliente: Canhão mata os três em fila (${col.log.join(' | ')}; medalhas ${col.medal.join(', ')})`);
  await waitGame(0.1); await page.screenshot({ path: 'screenshots/collateral.png' });
  const fa = await G(([L, w]) => { const g = window.__docao, p = g.player, V = g.V3, bots = g.entities.filter((e) => !e.isPlayer).slice(1, 4); // os mesmos da fila, revividos
    if (bots.length < 3) return null; bots.forEach((b, i) => { b.pos.set(L.t[i].x, 0, L.t[i].z); b.alive = true; b.hp = 100; b.invulnUntil = 0; });
    const o = new V(L.p.x, 0.8, L.p.z); g.fire(p, o, new V(L.d.x, L.d.y, L.d.z), w, 0, o.clone()); return bots.map((b) => Math.round(b.hp)); }, [LINE, FAMAS]);
  ok(fa && fa[0] < 100 && fa[1] === 100 && fa[2] === 100, `cliente: FAMAS sem collateral (vidas ${fa && fa.join('/')})`);
  ok(errors.length === 0, `sem erro no console${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await browser.close();
}
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('TUDO OK');
