import { tmpdir } from 'os'; import { join } from 'path';
// Pau de choque (tecla 5): estaca finca no 1º contato e dá choque por 3 s (6 pulsos de 7, nunca mata), atordoa e não é infinito.
// Uso: SITE=http://localhost:8125/ node test-choque.mjs   (SKIP_CLIENT=1 roda só shared + servidor)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { Game } from './server/src/game.js';
import { NADE, PISTOL } from './shared/rules.js';
import { TRAIN } from './shared/training.js';
import { SHOCK, stepShock, shockDmg, shockStun } from './shared/shock.js';
import { createPhysics, mapSolids } from './shared/physics.js';
import { getMap } from './maps.js';
const SITE = process.env.SITE || 'http://localhost:8125/';
const SHOTS = process.env.SHOTS || join(tmpdir(), 'docao-shots', 'choque'); mkdirSync(SHOTS, { recursive: true });
const fails = [], errors = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };

// ---- shared ----
{
  const map = getMap('arena'), solids = mapSolids(map), P = createPhysics(solids, map.size);
  const s = { pos: { x: 0, y: 1.6, z: 0 }, vel: { x: 0, y: 0, z: 0 }, t: 0 }; let hit = null;
  for (let i = 0; i < 200 && !hit && !s.dead; i++) hit = stepShock(P, s, 1 / 30);
  ok(!!hit && s.stuck && hit.n.y > 0.9 && hit.pos.y < 0.2, `estaca solta finca no chão (y ${hit && hit.pos.y.toFixed(3)}, n ${JSON.stringify(hit && hit.n)})`);
  // parede: caixa alta do mapa, mira no centro da face a 3 m
  let wall = null;
  for (const b of solids) {
    if (b.ramp || b.max.y - b.min.y < 1.5 || b.min.y > 0.5) continue;
    const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, y = b.min.y + 1.2;
    const o = { x: b.max.x + 3, y, z: cz };
    if (P.rayWorld(o, { x: -1, y: 0, z: 0 }, 3.2) == null) continue;
    const w = { pos: { ...o }, vel: { x: -SHOCK.speed, y: 0, z: 0 }, t: 0 }; let h = null;
    for (let i = 0; i < 60 && !h && !w.dead; i++) h = stepShock(P, w, 1 / 60);
    if (h && Math.abs(h.pos.x - b.max.x) < 0.3) { wall = h; break; }
    void cx;
  }
  ok(!!wall && Math.abs(wall.n.y) < 0.1 && wall.n.x > 0.9, `estaca na horizontal finca na parede (n ${JSON.stringify(wall && wall.n)})`);
  const u = { pos: { x: 0, y: 30, z: 0 }, vel: { x: 0, y: 30, z: 0 }, t: 0 };
  for (let i = 0; i < 400 && !u.dead && !u.stuck; i++) stepShock(P, u, 1 / 30);
  ok(u.dead && !u.stuck && u.t >= SHOCK.flight - 0.05 && u.t <= SHOCK.flight + 0.05, `estaca que não finca some em ${SHOCK.flight} s (${u.t.toFixed(2)})`);
  ok(shockDmg(100) === 7 && shockDmg(5) === 4 && shockDmg(1) === 0 && shockDmg(1.5) <= 1, `dano 7 por pulso, nunca abaixo de 1 de vida (${shockDmg(100)}, ${shockDmg(5)}, ${shockDmg(1)})`);
  ok(Math.abs(shockStun({ zt: 'boss' }) - 0.36) < 1e-9 && shockStun({}) === SHOCK.stun, 'chefão fica atordoado ×0,4');
}

// ---- servidor (sem navegador) ----
function newGame(cfg) {
  const sent = new Map(); let all = [];
  const g = new Game({ code: 'T', map: 'arena', max: 8, fillBots: true, mode: 'dm', ...cfg }, { send(id, m) { if (m && m.t === 'p') { if (!sent.has(id)) sent.set(id, []); sent.get(id).push(...m.ev); } }, broadcast(m) { if (m && Array.isArray(m.ev)) all.push(...m.ev); }, startLoop() {}, stopLoop() {} });
  let fake = 1000; g.now = () => fake;
  const a = g.join({ name: 'A' }).ent; g.welcome(a); g.onMessage(a.id, { t: 'start' }); a.connected = true;
  const run = (n, each) => { for (let i = 0; i < n; i++) { if (each) each(); fake += 0.05; g.tick(); } };
  run(3);
  return { g, a, sent, run, ev: () => all, clear: () => { all = []; sent.clear(); } };
}
const eyeOf = (e) => [e.pos.x, e.pos.y + 1.6, e.pos.z];
// direção horizontal livre a partir de e (8 m sem parede)
const freeDir = (g, e) => { for (let k = 0; k < 32; k++) { const t = k / 32 * Math.PI * 2, d = { x: Math.cos(t), y: 0, z: Math.sin(t) }; if ([1.6, 1.0, 0.4].every((y) => { const h = g.P.rayWorld({ x: e.pos.x, y: e.pos.y + y, z: e.pos.z }, d, 9); return h === null || h > 8; })) return d; } return null; };
{
  const { g, a, sent, run, ev, clear } = newGame({});
  ok(a.shocks === 1 && (sent.get(a.id) || []).some((e) => e[0] === 'skn' && e[1] === 1), `servidor: nasce com 1 pau de choque e manda 'skn' 1 (${a.shocks})`);
  const bots = [...g.ents.values()].filter((b) => b.bot); for (const b of bots) { b.alive = false; b.respawnAt = 1e9; }
  const B = bots[0], fr = freeDir(g, a);
  const placeB = () => { B.alive = true; B.invulnUntil = 0; B.think = 1e9; B.target = null; B.pos = { x: a.pos.x + fr.x * 2, y: a.pos.y, z: a.pos.z + fr.z * 2 }; B.vel = { x: 0, y: 0, z: 0 }; };
  placeB(); B.hp = 100; a.invulnUntil = 0; a.hp = 100; clear();
  g.onEvent(a, ['sk', eyeOf(a), [0, -12, 0]]); run(4, placeB);
  const sk = ev().find((e) => e[0] === 'sk'), sx = ev().find((e) => e[0] === 'sx');
  ok(!!sk && sk[2] === a.id && !!sx && sx[3][1] > 0.9 && a.shocks === 0 && (sent.get(a.id) || []).some((e) => e[0] === 'skn' && e[1] === 0), `servidor: 'sk' → 'sx' no chão (n ${sx && JSON.stringify(sx[3])}), cargas 0 e 'skn' 0`);
  let stunnedMid = false; run(64, () => { placeB(); if (B.stunUntil > g.T) stunnedMid = true; });
  const sz = ev().filter((e) => e[0] === 'sz'), withB = sz.filter((e) => e[2].includes(B.id)), se = ev().find((e) => e[0] === 'se' && e[1] === sk[1]);
  ok(withB.length === 6 && B.hp === 58 && B.alive && stunnedMid && !!se && g.shocks.length === 0, `servidor: 6 pulsos em B, 100 → ${B.hp}, vivo, atordoado, 'se' no fim (sz ${sz.length}/${withB.length})`);
  ok(!sz.some((e) => e[2].includes(a.id)) && a.hp === 100, `servidor: o dono nunca leva choque (hp ${a.hp})`);
  // recusa sem carga
  clear(); g.onEvent(a, ['sk', eyeOf(a), [0, -12, 0]]); run(1);
  ok(!ev().some((e) => e[0] === 'sk') && (sent.get(a.id) || []).some((e) => e[0] === 'skn' && e[1] === 0), "servidor: 2º 'sk' sem carga é recusado (só 'skn' 0)");
  // não mata: B com 5 de vida
  a.shocks = 1; placeB(); B.hp = 5; clear(); g.onEvent(a, ['sk', eyeOf(a), [0, -12, 0]]); run(70, placeB);
  ok(B.hp === 1 && B.alive && !ev().some((e) => e[0] === 'k'), `servidor: com 5 de vida termina com ${B.hp} e sem abate`);
  // caixa de Copo Bomba dá +1 pau de choque
  const pi = g.pickups.findIndex((p) => p.type === 'grenade'), pk = g.pickups[pi];
  const onBox = () => { a.pos = { x: pk.pos.x, y: pk.pos.y, z: pk.pos.z }; a.vel = { x: 0, y: 0, z: 0 }; };
  pk.active = true; a.shocks = 0; a.nades = 0; clear(); run(1, onBox);
  const got = (sent.get(a.id) || []).find((e) => e[0] === 'got');
  ok(a.shocks === 1 && !!got && got[4] === 1 && !pk.active, `servidor: caixa de Copo Bomba dá +1 pau de choque ('got' ${JSON.stringify(got)})`);
  pk.active = true; a.shocks = SHOCK.max; a.nades = NADE.max; clear(); run(1, onBox);
  ok(pk.active && a.shocks === SHOCK.max, 'servidor: com Copo e pau de choque no máximo a caixa não é consumida');
  pk.active = true; a.shocks = 0; a.nades = NADE.max; clear(); run(1, onBox);
  ok(!pk.active && a.shocks === 1, 'servidor: Copo cheio mas sem choque: a caixa dá o choque');
}
{ // humano atordoado não atira; bot atordoado não trava alvo nem atira
  const { g, a, sent, run, ev, clear } = newGame({ fillBots: true });
  const bots = [...g.ents.values()].filter((b) => b.bot); for (const b of bots) { b.alive = false; b.respawnAt = 1e9; }
  const C = g.join({ name: 'C' }).ent; C.connected = true; g.spawn(C);
  const fr = freeDir(g, a);
  const placeC = () => { C.alive = true; C.pos = { x: a.pos.x + fr.x * 2.5, y: a.pos.y, z: a.pos.z + fr.z * 2.5 }; C.vel = { x: 0, y: 0, z: 0 }; };
  a.invulnUntil = 0; a.hp = 100; C.invulnUntil = 0; a.weapon = PISTOL; a.slots = [0, PISTOL, 7]; a.mag[PISTOL] = 12; a.reload = null;
  const shoot = () => g.onEvent(a, ['f', eyeOf(a), [[fr.x, 0, fr.z]], PISTOL, g.now(), g.T]);
  run(20, placeC); clear(); shoot(); run(1, placeC);
  const ctrl = ev().some((e) => e[0] === 'sh' && e[1] === a.id);
  ok(ctrl, "controle: sem choque o tiro de A sai ('sh')");
  run(10, placeC); C.shocks = 1; clear(); g.onEvent(C, ['sk', eyeOf(C), [0, -12, 0]]); run(2, placeC);
  const t0 = g.T; run(11, placeC); ok(a.stunUntil > g.T, `A levou choque de C (stunUntil ${a.stunUntil && a.stunUntil.toFixed(2)}, T ${g.T.toFixed(2)})`);
  clear(); a.nextFire = 0; a.lastShot = []; shoot(); run(1, placeC);
  ok(!ev().some((e) => e[0] === 'sh' && e[1] === a.id), `A atordoado ${(g.T - t0).toFixed(2)} s depois não atira`);
  ok(!ev().some((e) => e[0] === 'sz' && e[2].includes(C.id)), 'C (dono) não leva o próprio choque');
  { a.nades = 1; a.pokeballs = 1; a.nextNade = 0; sent.delete(a.id); clear(); g.onEvent(a, ['n', eyeOf(a), [fr.x * 8, 4, fr.z * 8]]); g.onEvent(a, ['n', eyeOf(a), [fr.x * 8, 4, fr.z * 8], 'p']); run(1, placeC);
    const me = sent.get(a.id) || [];
    ok(a.stunUntil > g.T && a.nades === 1 && a.pokeballs === 1 && !ev().some((e) => e[0] === 'nd') && me.some((e) => e[0] === 'ndn' && e[1] === 1) && me.some((e) => e[0] === 'pkb' && e[1] === 1), `servidor: atordoado, Copo e Pokébola recusados com correção ('ndn'/'pkb' ${JSON.stringify(me)})`); }
  run(80, placeC);
  // bot
  const B = bots[0]; const placeB = () => { B.alive = true; B.invulnUntil = 0; B.pos = { x: a.pos.x + fr.x * 2, y: a.pos.y, z: a.pos.z + fr.z * 2 }; B.vel = { x: 0, y: 0, z: 0 }; };
  C.alive = false; C.respawnAt = 1e9; C.connected = false;
  placeB(); B.hp = 100; B.think = 1e9; B.target = null; a.hp = 100; a.invulnUntil = 1e9; a.shocks = 1; a.stunUntil = 0; clear();
  g.onEvent(a, ['sk', eyeOf(a), [0, -12, 0]]); run(4, placeB);
  const firstSz = ev().some((e) => e[0] === 'sz' && e[2].includes(B.id)); B.think = 0; let tgt = false; run(50, () => { placeB(); if (B.target) { if (!tgt && process.env.DBG) console.log('dbg alvo', g.T.toFixed(2), B.stunUntil, B.hp, g.shocks.length, JSON.stringify(ev().filter((e) => e[0][0] === 's' && e[0] !== 'sp'))); tgt = true; } });
  ok(firstSz && !tgt && !ev().some((e) => (e[0] === 'sh' || e[0] === 'ml') && e[1] === B.id), `bot atordoado não trava alvo nem atira (pulso ${firstSz}, alvo ${tgt})`);
  a.invulnUntil = 0;
}
{ // time: aliado não leva choque
  const { g, a, run, ev, clear } = newGame({ mode: 'dom', fillBots: false });
  const B = g.join({ name: 'B' }).ent; B.connected = true; g.spawn(B); a.team = 0; B.team = 0; a.pendingTeam = B.pendingTeam = false;
  const fr = freeDir(g, a); const placeB = () => { B.alive = true; B.invulnUntil = 0; B.team = 0; B.pos = { x: a.pos.x + fr.x * 2, y: a.pos.y, z: a.pos.z + fr.z * 2 }; };
  placeB(); B.hp = 100; a.shocks = 1; clear(); g.onEvent(a, ['sk', eyeOf(a), [0, -12, 0]]); run(70, placeB);
  ok(g.teamMode && ev().some((e) => e[0] === 'sx') && !ev().some((e) => e[0] === 'sz' && e[2].includes(B.id)) && B.hp === 100, `time: aliado nunca leva choque (hp ${B.hp})`);
}
{ // poder desligado
  const { g, a, sent, run, ev, clear } = newGame({ powers: ['health', 'ammo', 'grenade', 'smoke'] });
  ok(a.shocks === 0, `poder 'stun' desligado: nasce com 0 (${a.shocks})`);
  clear(); g.onEvent(a, ['sk', eyeOf(a), [0, -12, 0]]); run(1);
  ok(!ev().some((e) => e[0] === 'sk') && (sent.get(a.id) || []).some((e) => e[0] === 'skn' && e[1] === 0), "poder desligado: 'sk' recusado");
  const pk = g.pickups.find((p) => p.type === 'grenade'); pk.active = true; a.nades = 0; run(1, () => { a.pos = { ...pk.pos }; });
  ok(a.shocks === 0 && a.nades === 1, 'poder desligado: caixa dá Copo e não dá choque');
}
{ // Treino: volta 1 só depois de 10 s
  const { g, a, run } = newGame({ mode: TRAIN.mode, fillBots: true });
  ok(g.training && a.shocks === 1, `Treino: nasce com 1 (${a.shocks})`);
  g.onEvent(a, ['sk', eyeOf(a), [0, -12, 0]]); run(1);
  const t0 = g.T; run(180); const mid = a.shocks; run(30);
  ok(mid === 0 && a.shocks === 1, `Treino: 0 por ~9 s, volta 1 depois de 10 s (meio ${mid}, fim ${a.shocks}, ${(g.T - t0).toFixed(1)} s)`);
}
{ // Invasão: zumbi atordoado e parado; humanos nunca levam
  const { g, a, run, ev, clear } = newGame({ mode: 'inv', map: 'arena', fillBots: false });
  const H = g.join({ name: 'H' }).ent; H.connected = true; g.spawn(H);
  run(2); const z = g.inv && g.inv.spawn('walker');
  ok(!!z, 'Invasão: zumbi criado');
  if (z) {
    const fr = freeDir(g, a);
    z.pos = { x: a.pos.x + fr.x * 2, y: a.pos.y, z: a.pos.z + fr.z * 2 }; z.vel = { x: 0, y: 0, z: 0 }; z.invulnUntil = 0;
    const placeH = () => { H.alive = true; H.invulnUntil = 0; H.pos = { x: a.pos.x - fr.x * 1, y: a.pos.y, z: a.pos.z - fr.z * 1 }; };
    a.invulnUntil = 1e9; H.hp = 100; const hp0 = z.hp; a.shocks = 1; clear(); g.onEvent(a, ['sk', eyeOf(a), [0, -12, 0]]); run(14, placeH); // deixa o embalo que ele já tinha morrer
    const p0 = { ...z.pos }; run(10, placeH); const moved = Math.hypot(z.pos.x - p0.x, z.pos.z - p0.z);
    ok(z.stunUntil > g.T && z.hp < hp0 && z.hp >= 1 && moved < 0.05, `Invasão: zumbi atordoado, ${hp0} → ${z.hp.toFixed(0)}, andou ${moved.toFixed(3)} m`);
    run(60, placeH);
    ok(!ev().some((e) => e[0] === 'sz' && e[2].includes(H.id)) && H.hp === 100, `Invasão: outro humano nunca leva choque (hp ${H.hp})`);
  }
}

if (!process.env.SKIP_CLIENT) {
// ---- cliente ----
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/GPU stall/.test(m.text())) errors.push(m.text()); });
await page.goto(SITE, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__docao && window.__docao.startGame, null, { timeout: 180000, polling: 250 });
const G = (fn, a) => page.evaluate(fn, a);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 180000, polling: 100 }); };
const waitFor = (fn, a) => page.waitForFunction(fn, a, { timeout: 180000, polling: 100 });
const freezeAt = async (x) => { await G((t) => { window.__stopAt = t; }, x); await page.waitForFunction((t) => window.__docao.time >= t - 1e-3, x, { timeout: 180000, polling: 50 }); await page.waitForTimeout(400); };
const unfreeze = () => G(() => { window.__stopAt = null; });
const start = async (mode) => {
  await G((m) => { const g = window.__docao; document.getElementById('modeSel').value = m; g.startGame('arena'); }, mode);
  await G(() => { const g = window.__docao; for (const e of g.entities) if (!e.isPlayer) { e.frozen = true; e.pos.set(999, -50, 999); } g.player.invulnUntil = g.time + 9999; });
  await waitGame(0.3);
};
// 1) DM: estaca finca e dá choque no bot da frente
await start('dm');
const bn = await G(() => {
  const g = window.__docao, p = g.player, b = g.entities.find((e) => !e.isPlayer);
  for (let k = 0; k < 32; k++) { const yaw = k / 32 * Math.PI * 2; if ([0.15, 0.5, 1.2].every((h) => { const o = [p.pos.x, p.pos.y + h, p.pos.z]; return [1, 2, 3, 4, 5].every((s) => g.los(o, [o[0] - Math.sin(yaw) * s, o[1], o[2] - Math.cos(yaw) * s])); })) { p.yaw = yaw; break; } } // livre até no pé (caixote baixo)
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); b.pos.set(p.pos.x + fx * 3, p.pos.y, p.pos.z + fz * 3); b.yaw = p.yaw; b.hp = 100; b.alive = true; b.invulnUntil = 0; b.frozen = true; p.pitch = -0.6;
  return { name: b.name, n: p.stunNades, hud: document.getElementById('stunN').textContent };
});
ok(bn.n === 1 && bn.hud === '1', `DM: nasce com 1 pau de choque (HUD ${bn.hud})`);
await waitGame(0.15);
await G(() => window.__docao.throwShock());
await waitFor(() => { const s = window.__docao.shocks[0]; return !!(s && s.stuck); });
const st = await G(() => { const g = window.__docao, s = g.shocks[0], up = new g.V3(0, 1, 0).applyQuaternion(s.mesh.quaternion); return { n: s.n.toArray(), dot: up.dot(s.n), t: s.t, left: g.player.stunNades, hud: document.getElementById('stunN').textContent }; });
ok(st.dot > 0.99 && st.left === 0 && st.hud === '0', `estaca fincada alinhada à normal (${JSON.stringify(st)})`);
// print logo depois de um pulso
const np = await G(() => window.__docao.shocks[0].nextPulse);
await freezeAt(np + 0.1);
await page.screenshot({ path: `${SHOTS}/offline-arcos.png` });
const arcs = await G(() => window.__docao.shocks[0] ? window.__docao.shocks[0].arcs.length : -1);
ok(arcs > 0, `arcos elétricos estaca → bot (${arcs})`);
await G(() => { const p = window.__docao.player; p.pitch = -0.25; });
await freezeAt(np + 0.15); await page.screenshot({ path: `${SHOTS}/offline-estaca.png` });
await unfreeze();
await waitGame(0.6);
const mid = await G((n) => { const g = window.__docao, b = g.entities.find((e) => e.name === n), p = g.player; return { bs: b.stunUntil > g.time, hp: b.hp, me: p.stunUntil > g.time, left: p.stunNades }; }, bn.name);
ok(mid.bs && mid.hp < 100 && !mid.me && mid.left === 0, `bot atordoado e ferido, dono não (${JSON.stringify(mid)})`);
await waitFor(() => window.__docao.shocks.length === 0);
const end = await G((n) => { const b = window.__docao.entities.find((e) => e.name === n); return { hp: b.hp, alive: b.alive }; }, bn.name);
ok(end.alive && end.hp === 58, `fim do choque: bot vivo com ${end.hp} (6 × 7)`);
// 2) o player levando choque de um bot
await G((n) => { const g = window.__docao, p = g.player, b = g.entities.find((e) => e.name === n); p.invulnUntil = 0; p.hp = 100; p.pitch = 0;
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); g.switchWeapon(p, p.slots[1]); g.spawnShock(b, [p.pos.x + fx * 1.8, p.pos.y + 0.8, p.pos.z + fz * 1.8], [0, -4, 0]); }, bn.name);
await waitFor(() => window.__docao.player.stunUntil > window.__docao.time);
await waitGame(0.1);
const me = await G(() => { const g = window.__docao, p = g.player, f = document.getElementById('stunFlash'); return { op: Number(f.style.opacity), bg: getComputedStyle(f).backgroundImage, hp: p.hp, mag: p.mag[p.weapon], w: p.weapon }; });
ok(me.op > 0.2 && me.bg.includes('rgba(70, 150, 255') && me.hp >= 58 && me.hp <= 99, `player com choque: tela azul (${me.op}) e ${me.hp} de vida`);
await page.screenshot({ path: `${SHOTS}/levou-choque.png` });
await page.mouse.move(480, 270); await page.mouse.down(); await waitGame(0.8); await page.mouse.up();
const me2 = await G(() => { const g = window.__docao, p = g.player; return { mag: p.mag[p.weapon], stun: p.stunUntil > g.time }; });
ok(me2.mag === me.mag, `atordoado não atira (pente ${me.mag} → ${me2.mag}, ainda atordoado ${me2.stun})`);
await G(() => { window.__docao.player.nades = 1; }); await page.keyboard.down('KeyQ'); await waitGame(0.2); await page.keyboard.up('KeyQ'); await waitGame(0.05);
const nq = await G(() => { const g = window.__docao, p = g.player; return { n: p.nades, c: !!p.charging, stun: p.stunUntil > g.time, msg: document.getElementById('centermsg').textContent }; });
ok(nq.n === 1 && !nq.c && /Levou choque/.test(nq.msg), `atordoado não arremessa Copo nem gasta (${JSON.stringify(nq)})`);
await waitFor(() => window.__docao.shocks.length === 0);
const fin = await G(() => ({ hp: window.__docao.player.hp, alive: window.__docao.player.alive }));
ok(fin.alive && fin.hp >= 58, `player sobrevive ao choque (${fin.hp})`);
await page.keyboard.press('Digit5'); await waitGame(0.1);
const msg = await G(() => document.getElementById('centermsg').textContent);
ok(/Sem pau de choque/.test(msg), `sem carga: tecla 5 avisa (${msg})`);
// DM: não volta sozinho
await waitGame(SHOCK.trainRefill + 0.8);
ok(await G(() => window.__docao.player.stunNades) === 0, 'DM: continua 0 depois de 10 s (só volta morrendo ou pegando a caixa)');
// 3) Exploração e Treino: volta 1 só depois de 10 s
for (const m of ['explore', TRAIN.mode]) {
  await start(m);
  const n0 = await G(() => window.__docao.player.stunNades);
  await G(() => { window.__docao.player.pitch = -0.6; window.__docao.throwShock(); });
  await waitGame(9);
  const a9 = await G(() => window.__docao.player.stunNades);
  await waitGame(1.6);
  const a11 = await G(() => window.__docao.player.stunNades);
  ok(n0 === 1 && a9 === 0 && a11 === 1, `${m}: ${n0} → 0 por 9 s (${a9}) → volta 1 depois de 10 s (${a11})`);
}
await browser.close();
ok(!errors.length, `sem erros no console (${errors.slice(0, 3).join(' | ')})`);
}
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
