// Estilingue de Ovo (19): segura o clique pra esticar, ovo voa em arco (shared/egg.js), quebra e suja a tela de quem leva. Servidor faz a mesma conta.
// Uso: SITE=http://localhost:8123/ node test-ovo.mjs   (SKIP_CLIENT=1 roda só o servidor)
import { chromium } from 'playwright';
import { Game } from './server/src/game.js';
import { WEAPONS, EGG_W, SECONDARIES, CATEGORIES, BOT_RANGE, BOT_PRIMARIES } from './shared/rules.js';
import { EGG, eggSpeed, eggDmg, stepEgg } from './shared/egg.js';
import { createPhysics, mapSolids } from './shared/physics.js';
import { getMap } from './maps.js';
import { killIcon } from './killfeed-icons.js';
const SITE = process.env.SITE || 'http://localhost:8123/';
const fails = [], errors = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };

// ---- regras / shared ----
ok(EGG_W === 19 && WEAPONS[19].key === 'estilingue' && WEAPONS[17].key === 'sabre2' && WEAPONS[18].key === 'milho', 'WEAPONS[19] = estilingue, depois do Sabre Duplo (17) e do Lança-Milho (18)');
ok(SECONDARIES.includes(19) && CATEGORIES.find((c) => c.id === 'secundaria').weapons.includes(19) && !BOT_PRIMARIES.includes(19) && BOT_RANGE[19] === 14 && BOT_RANGE.length >= 20, 'secundária no menu, fora dos bots, BOT_RANGE[19] = 14');
ok(killIcon('estilingue').includes('a5 4') && killIcon('estilingue') !== killIcon('arco'), 'ícone do killfeed próprio');
ok(Math.abs(eggSpeed(0) - 15) < 1e-9 && Math.abs(eggSpeed(1) - 34) < 1e-9 && Math.abs(eggSpeed(50) - 34) < 1e-9, 'velocidade 15..34 (k limitado)');
ok(Math.abs(eggDmg(WEAPONS[19], 1, false) - 34) < 1e-9 && Math.abs(eggDmg(WEAPONS[19], 0, false) - 23.8) < 1e-9 && Math.abs(eggDmg(WEAPONS[19], 1, true) - 51) < 1e-9, 'dano 23,8..34, cabeça ×1,5');
{
  const P = createPhysics(mapSolids(getMap('arena')), getMap('arena').size);
  const g = { pos: { x: 0, y: 1.6, z: 0 }, vel: { x: 0, y: 0, z: 0 }, t: 0 }; let st = null;
  for (let i = 0; i < 200 && !g.dead; i++) st = stepEgg(P, g, 1 / 30);
  ok(g.dead && st.wall && st.wall.n.y > 0.9 && g.pos.y >= 0 && g.pos.y < 0.2, `ovo largado cai e quebra no chão (y ${g.pos.y.toFixed(3)}, n ${JSON.stringify(st && st.wall && st.wall.n)})`);
  const h = { pos: { x: 0, y: 30, z: 0 }, vel: { x: 0, y: 30, z: 0 }, t: 0 }; for (let i = 0; i < 400 && !h.dead; i++) stepEgg(P, h, 1 / 30);
  ok(h.dead && h.t <= EGG.life + 0.05, `ovo some no fim da vida (${h.t.toFixed(2)} s)`);
}

// ---- servidor (sem navegador) ----
{
  const sent = new Map();
  const g = new Game({ code: 'TEST', map: 'arena', max: 8, fillBots: true, mode: 'dm' }, { send(id, m) { if (m && m.t === 'p') { if (!sent.has(id)) sent.set(id, []); sent.get(id).push(...m.ev); } }, broadcast() {}, startLoop() {}, stopLoop() {} });
  let fake = 1000; g.now = () => fake; const a = g.join({ name: 'A' }).ent; g.welcome(a); g.onMessage(a.id, { t: 'start' }); a.connected = true;
  const run = (n) => { for (let i = 0; i < n; i++) { fake += 0.05; g.tick(); } };
  run(5);
  const reset = () => { a.alive = true; a.hp = 100; a.invulnUntil = 0; a.slots = [0, EGG_W, 7]; a.mag[EGG_W] = 1; a.reserve[EGG_W] = 14; a.reload = null; };
  reset();
  const bots = [...g.ents.values()].filter((b) => b.bot); for (const b of bots) { b.alive = false; b.respawnAt = 1e9; }
  const eye = () => ({ x: a.pos.x, y: a.pos.y + 1.6, z: a.pos.z }); const E = (o) => [o.x, o.y, o.z];
  let all = []; g.io.broadcast = (m) => { if (m && Array.isArray(m.ev)) all.push(...m.ev); };
  // direção horizontal livre por 8 m
  let free = null; for (let k = 0; k < 32 && !free; k++) { const t = k / 32 * Math.PI * 2, d = { x: Math.cos(t), y: 0, z: Math.sin(t) }; if ([1.6, 1.0, 0.4].every((y) => { const h = g.P.rayWorld({ x: a.pos.x, y: a.pos.y + y, z: a.pos.z }, d, 14); return h === null || h > 9; })) free = d; } // livre também na altura do corpo (caixote baixo)
  ok(!!free, `direção livre a partir do spawn (${JSON.stringify(free)})`);
  // parede/chão
  g.onEvent(a, ['eg', E(eye()), [free.x, 0.1, free.z], 1, g.now()]); run(100);
  const el = all.filter((e) => e[0] === 'el'), ex = all.filter((e) => e[0] === 'ex');
  ok(el.length === 1 && ex.length === 1 && ex[0][3] === 0 && Array.isArray(ex[0][4]) && g.eggs.length === 0 && a.mag[EGG_W] === 0 && !all.some((e) => e[0] === 'sh' && e[2] === 19),
    `servidor: 1 'el', 1 'ex' na parede/chão com normal, pente 0, sem 'sh' (el ${el.length}, ex ${JSON.stringify(ex[0])}, pente ${a.mag[EGG_W]})`);
  // anti-trapaça
  const ct0 = g.now(); all = []; a.rejectedShots = 0;
  run(10); g.onEvent(a, ['eg', E(eye()), [free.x, 0.1, free.z], 1, g.now()]); run(1);
  ok(!all.some((e) => e[0] === 'el'), `pente vazio: 'eg' recusado`);
  run(10); reset(); all = [];
  g.onEvent(a, ['f', E(eye()), [[free.x, 0, free.z]], EGG_W, g.now(), g.T]); run(1);
  ok(!all.some((e) => e[0] === 'sh') && a.mag[EGG_W] === 1 && a.rejectedShots >= 1, `'f' com a arma 19 é recusado (pente ${a.mag[EGG_W]}, recusados ${a.rejectedShots})`);
  run(10); reset(); all = []; const ct1 = g.now();
  g.onEvent(a, ['eg', E(eye()), [free.x, 0.1, free.z], 50, ct1]); run(1);
  const el2 = all.find((e) => e[0] === 'el'), sp = el2 ? Math.hypot(...el2[4]) : 0;
  ok(!!el2 && Math.abs(sp - (EGG.v0 + EGG.v1)) < 0.05 && el2[5] === 1, `k = 50 é limitado ao talo (|v| ${sp.toFixed(3)}, k ${el2 && el2[5]})`);
  reset(); all = []; const rej0 = a.rejectedShots;
  g.onEvent(a, ['eg', E(eye()), [free.x, 0.1, free.z], 1, ct1 + 0.1]); run(1);
  ok(!all.some((e) => e[0] === 'el') && a.rejectedShots > rej0 && a.mag[EGG_W] === 1, `cadência: 2º ovo 0,1 s depois é recusado pelo clockOk`);
  run(80);
  { // puxada medida no servidor: k=1 logo que a recarga acaba sai fraco
    reset(); all = []; g.onEvent(a, ['eg', E(eye()), [free.x, 0.1, free.z], 1, g.now()]); run(1); g.onEvent(a, ['rl', EGG_W]);
    while (a.reload) run(1);
    g.onEvent(a, ['eg', E(eye()), [free.x, 0.1, free.z], 1, g.now()]); run(1);
    const els = all.filter((e) => e[0] === 'el');
    ok(els.length === 2 && els[0][5] === 1 && els[1][5] < 0.35, `k=1 logo depois da recarga é limitado pela puxada (k ${els.map((e) => e[5])})`);
    run(80);
  }
  run(40);
  // acerto em outro humano + evento pessoal
  const B = g.join({ name: 'B' }).ent; B.connected = true;
  const placeB = () => { B.alive = true; B.invulnUntil = 0; B.pos.x = a.pos.x + free.x * 5; B.pos.z = a.pos.z + free.z * 5; B.pos.y = a.pos.y; B.vel = { x: 0, y: 0, z: 0 }; };
  placeB(); B.hp = 100; reset(); all = []; sent.clear();
  const aimB = () => { const o = eye(), t = { x: B.pos.x, y: B.pos.y + 0.55, z: B.pos.z }, L = Math.hypot(t.x - o.x, t.y - o.y, t.z - o.z); return [(t.x - o.x) / L, (t.y - o.y) / L, (t.z - o.z) / L]; };
  g.onEvent(a, ['eg', E(eye()), aimB(), 1, g.now()]); for (let i = 0; i < 20; i++) { placeB(); run(1); }
  if (process.env.DBG) console.log('dbg', JSON.stringify(all.filter((e) => e[0] === 'el' || e[0] === 'ex')), a.rejectedShots, JSON.stringify(B.pos), JSON.stringify(a.pos), B.alive, B.hp);
  const exHit = all.find((e) => e[0] === 'ex' && e[3] === 1), hB = all.find((e) => e[0] === 'h' && e[1] === B.id), pB = sent.get(B.id) || [];
  ok(Math.abs(B.hp - 66) < 0.01 && !!exHit && exHit[4] === 0 && !!hB && pB.some((e) => e[0] === 'egg' && e[1] === 2), `servidor: ovo no talo tira 34 de B (hp ${B.hp}, ex ${JSON.stringify(exHit)}, h ${!!hB}, pessoal ${JSON.stringify(pB)})`);
  ok(B.eggUntil > g.T, 'B fica sujo (eggUntil)');
  let kEv = null;
  for (let n = 0; n < 4 && !kEv; n++) {
    run(20); reset(); g.onEvent(a, ['eg', E(eye()), aimB(), 1, g.now()]); for (let i = 0; i < 20 && B.alive; i++) { if (B.alive) placeB(); run(1); }
    kEv = all.find((e) => e[0] === 'k' && e[2] === B.id);
  }
  ok(!!kEv && kEv[3] === 19 && kEv[1] === a.id, `3 ovos no corpo matam, kill com a arma 19 (${JSON.stringify(kEv)})`);
}
{ // time: sem fogo amigo
  const sent = new Map();
  const g = new Game({ code: 'TEAM', map: 'arena', max: 8, fillBots: false, mode: 'dom' }, { send(id, m) { if (m && m.t === 'p') { if (!sent.has(id)) sent.set(id, []); sent.get(id).push(...m.ev); } }, broadcast() {}, startLoop() {}, stopLoop() {} });
  let fake = 1000; g.now = () => fake; const a = g.join({ name: 'A' }).ent; g.welcome(a); g.onMessage(a.id, { t: 'start' }); a.connected = true;
  const run = (n) => { for (let i = 0; i < n; i++) { fake += 0.05; g.tick(); } };
  run(5); const B = g.join({ name: 'B' }).ent; B.connected = true; a.team = 0; B.team = 0;
  for (const b of g.ents.values()) if (b.bot) { b.alive = false; b.respawnAt = 1e9; }
  a.alive = true; a.hp = 100; a.slots = [0, EGG_W, 7]; a.mag[EGG_W] = 1; a.reload = null; a.pendingTeam = false;
  const eye = { x: a.pos.x, y: a.pos.y + 1.6, z: a.pos.z };
  let free = null; for (let k = 0; k < 32 && !free; k++) { const t = k / 32 * Math.PI * 2, d = { x: Math.cos(t), y: 0, z: Math.sin(t) }; if ([1.6, 1.0, 0.4].every((y) => { const h = g.P.rayWorld({ x: a.pos.x, y: a.pos.y + y, z: a.pos.z }, d, 14); return h === null || h > 9; })) free = d; }
  const placeB = () => { B.alive = true; B.invulnUntil = 0; B.team = 0; B.pos.x = a.pos.x + free.x * 5; B.pos.z = a.pos.z + free.z * 5; B.pos.y = a.pos.y; };
  placeB(); B.hp = 100; let all = []; g.io.broadcast = (m) => { if (m && Array.isArray(m.ev)) all.push(...m.ev); };
  const t = { x: B.pos.x, y: B.pos.y + 0.55, z: B.pos.z }, L = Math.hypot(t.x - eye.x, t.y - eye.y, t.z - eye.z);
  g.onEvent(a, ['eg', [eye.x, eye.y, eye.z], [(t.x - eye.x) / L, (t.y - eye.y) / L, (t.z - eye.z) / L], 1, g.now()]); for (let i = 0; i < 20; i++) { placeB(); run(1); }
  ok(g.teamMode && all.some((e) => e[0] === 'el') && B.hp === 100 && !(sent.get(B.id) || []).some((e) => e[0] === 'egg'), `time: ovo no aliado não machuca nem suja (hp ${B.hp}, el ${all.some((e) => e[0] === 'el')})`);
}

if (!process.env.SKIP_CLIENT) {
// ---- cliente ----
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => { localStorage.setItem('docao.secondary', '19'); });
await page.goto(SITE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__docao && window.__docao.startGame, null, { timeout: 180000, polling: 250 });
const G = (fn, a) => page.evaluate(fn, a);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 180000, polling: 50 }); };
const freeze = async (dt) => { const t = await G((d) => { const x = window.__docao.time + d; window.__stopAt = x; return x; }, dt); await page.waitForFunction((x) => window.__docao.time >= x - 1e-3, t, { timeout: 180000, polling: 50 }); await page.waitForTimeout(250); };
const unfreeze = () => G(() => { window.__stopAt = null; });
await G(() => { const g = window.__docao; g.startGame('arena'); for (const e of g.entities) if (!e.isPlayer) { e.frozen = true; e.pos.set(999, -50, 999); } g.player.invulnUntil = g.time + 9999; });
await waitGame(0.3);
await G(() => { const g = window.__docao; g.switchWeapon(g.player, 19); });
await waitGame(0.7);
const md = await G(() => { const g = window.__docao, b = g.entities.find((e) => !e.isPlayer); return { w: g.player.weapon, names: g.fpGunNames(), n: g.WEAPONS ? g.WEAPONS.length : null, tp: b.model.guns[19] && b.model.guns[19].name, tpLen: b.model.guns.length, slots: g.player.slots }; });
ok(md.w === 19 && md.names[19] === 'fp-estilingue' && md.names.length === WEAPONS.length && md.tp === 'estilingue' && md.tpLen === WEAPONS.length, `modelos: fp[19] ${md.names[19]}, ${md.names.length} fp / ${md.tpLen} 3ª pessoa, 3ª pessoa[19] ${md.tp}, slots ${md.slots}`);
// direção livre: 14 m sem parede na altura do olho
await G(() => { const g = window.__docao, p = g.player; for (let k = 0; k < 32; k++) { const yaw = k / 32 * Math.PI * 2; p.yaw = yaw; const o = { x: p.pos.x, y: p.pos.y + 1.6, z: p.pos.z }; let ok = true; for (let s = 1; s <= 14 && ok; s++) for (const dy of [0, -0.7]) if (!g.los([o.x, o.y + dy, o.z], [o.x - Math.sin(yaw) * s, o.y + dy, o.z - Math.cos(yaw) * s])) { ok = false; break; } if (ok) break; } p.pitch = 0.05; window.__eggLog = []; });
const lines0 = await G(() => window.__docao.effects ? window.__docao.effects.filter((f) => f.kind === 'line').length : -1);
await page.mouse.move(480, 270); await page.mouse.down();
await waitGame(0.7);
const pm = await G(() => ({ hid: document.getElementById('powermeter').classList.contains('hidden'), txt: document.getElementById('powertext').textContent, draw: window.__docao.player.eggDraw }));
ok(!pm.hid && pm.txt.includes('ELÁSTICO NO TALO') && pm.draw > 0, `puxando: barra de força visível (${pm.txt})`);
await freeze(0.01); await page.screenshot({ path: 'screenshots/estilingue-puxando.png' });
const pouch = await G(() => window.__docao.fpGunEgg());
ok(pouch.vis && pouch.pouchZ > 0.15, `puxando: ovo na bolsinha puxada (${JSON.stringify(pouch)})`);
await unfreeze();
await page.mouse.up();
await page.waitForFunction(() => window.__docao.eggs.length > 0, null, { timeout: 120000, polling: 50 });
const shot = await G(() => ({ mag: window.__docao.player.mag[19], rl: window.__docao.player.reloadEnd > window.__docao.time, force: window.__lastShot && window.__lastShot.force, lines: window.__docao.effects ? window.__docao.effects.filter((f) => f.kind === 'line').length : -1 }));
ok(shot.mag === 0 && shot.rl && shot.force === 1, `soltou no talo: pente 0 e recarregando (${JSON.stringify(shot)})`);
ok(shot.lines <= Math.max(0, lines0), `silencioso: sem traçante (linhas ${lines0} → ${shot.lines})`);
// recarga: ovo entrando na bolsinha
const rT0 = await G(() => window.__docao.player.reloadStartT);
await G((t) => { window.__stopAt = t; }, rT0 + 0.6 * 0.7);
await page.waitForFunction((t) => window.__docao.time >= t - 1e-3, rT0 + 0.42, { timeout: 180000, polling: 50 }); await page.waitForTimeout(250);
const rEgg = await G(() => { const s = window.__docao.fpGunEgg(); return s; });
await page.screenshot({ path: 'screenshots/estilingue-recarga.png' });
ok(rEgg && rEgg.vis, `recarga: ovo novo aparece entrando (${JSON.stringify(rEgg)})`);
await unfreeze();
await page.waitForFunction(() => window.__docao.eggs.length === 0, null, { timeout: 180000, polling: 50 });
const w1 = await G(() => ({ log: window.__eggLog.join(','), stains: window.__docao.eggStains }));
ok(w1.log === 'wall' && w1.stains >= 1, `ovo quebra na parede/chão e deixa mancha (${JSON.stringify(w1)})`);
await page.screenshot({ path: 'screenshots/estilingue-mancha.png' });
await waitGame(0.9);
const rl = await G(() => ({ mag: window.__docao.player.mag[19], res: window.__docao.player.reserve[19] }));
ok(rl.mag === 1 && rl.res === 13, `recarga terminou: 1 ovo, reserva 13 (${JSON.stringify(rl)})`);
await waitGame(EGG.stain + 0.5);
ok(await G(() => window.__docao.eggStains) === 0, 'mancha some depois de 6 s');
// killstreak no meio da puxada: não dispara sozinho ao sair
await page.waitForFunction(() => window.__docao.player.mag[19] === 1, null, { timeout: 180000, polling: 50 });
await waitGame(0.35);
await G(() => { window.__lastShot = null; });
await page.mouse.down(); await waitGame(0.65);
await G(() => window.__docao.grantGunner()); await waitGame(0.2); await page.mouse.up(); await waitGame(0.3);
const gu = await G(() => ({ g: !!window.__docao.gunner, draw: window.__docao.player.eggDraw, pm: !document.getElementById('powermeter').classList.contains('hidden') }));
await G(() => window.__docao.endGunner(true)); await waitGame(0.6);
const gu2 = await G(() => ({ g: !!window.__docao.gunner, mag: window.__docao.player.mag[19], shot: window.__lastShot }));
ok(gu.g && !gu.draw && !gu.pm && !gu2.g && gu2.mag === 1 && !gu2.shot, `gunner no meio da puxada: sem barra e sem ovo ao sair (${JSON.stringify(gu)} → ${JSON.stringify(gu2)})`);
// dano em bot a 6 m
const target = await G(() => {
  const g = window.__docao, p = g.player, bot = g.entities.find((e) => !e.isPlayer);
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  bot.pos.set(p.pos.x + fx * 6, p.pos.y, p.pos.z + fz * 6); bot.alive = true; bot.hp = 100; bot.invulnUntil = 0; bot.frozen = true; p.pitch = -0.02; window.__eggLog = []; return bot.name;
});
await page.mouse.down(); await waitGame(0.65); await page.mouse.up();
await page.waitForFunction(() => window.__eggLog.length > 0, null, { timeout: 180000, polling: 50 });
const hb = await G((n) => { const g = window.__docao, b = g.entities.find((e) => e.name === n); return { hp: +b.hp.toFixed(2), log: window.__eggLog.join(','), egg: b.eggUntil > g.time }; }, target);
ok(hb.log === 'hit' && (Math.abs(hb.hp - 66) < 0.01 || Math.abs(hb.hp - 49) < 0.01) && hb.egg, `ovo acerta o bot a 6 m (${JSON.stringify(hb)})`);
// kill + killfeed
await page.waitForFunction(() => window.__docao.player.mag[19] === 1, null, { timeout: 180000, polling: 50 });
await waitGame(0.35);
await G((n) => { const b = window.__docao.entities.find((e) => e.name === n); b.hp = 10; window.__feedLog = []; window.__eggLog = []; }, target);
await page.mouse.down(); await waitGame(0.3); await page.mouse.up();
await page.waitForFunction(() => (window.__feedLog || []).length > 0, null, { timeout: 180000, polling: 100 }).catch(() => {});
const kf = await G(() => { const it = [...document.querySelectorAll('#killfeed .kfi')].pop(); return { log: (window.__feedLog || []).slice(-1)[0] || '', d: it ? it.innerHTML : '' }; });
ok(/\[Estilingue\]$/.test(kf.log) && kf.d.includes('a5 4'), `killfeed: ${kf.log} (ícone ${kf.d.includes('a5 4')})`);
// tela suja: um bot joga ovo no player
await waitGame(0.3);
const thrower = await G(() => { const g = window.__docao, p = g.player, b = g.entities.filter((e) => !e.isPlayer)[1];
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); b.pos.set(p.pos.x + fx * 5, p.pos.y, p.pos.z + fz * 5); b.alive = true; b.frozen = true; b.invulnUntil = 0;
  p.invulnUntil = 0; p.hp = 100; const o = [b.pos.x, b.pos.y + 1.5, b.pos.z], t = [p.pos.x, p.pos.y + 0.9, p.pos.z]; g.launchEgg(b, o, [t[0] - o[0], t[1] - o[1], t[2] - o[2]], 1); return b.name; });
await page.waitForFunction(() => window.__docao.eggSplat > 1.5, null, { timeout: 180000, polling: 50 });
await waitGame(0.15);
const sp = await G(() => ({ s: window.__docao.eggSplat, op: Number(getComputedStyle(document.getElementById('eggsplat')).opacity), hp: window.__docao.player.hp }));
await freeze(0.01); await page.screenshot({ path: 'screenshots/estilingue-sujou.png' }); await unfreeze();
ok(sp.s > 0.5 && sp.op > 0.5 && Math.abs(sp.hp - 66) < 0.01, `tela suja depois da ovada (${JSON.stringify(sp)})`);
await waitGame(2.2);
const sp2 = await G(() => ({ s: window.__docao.eggSplat, op: Number(getComputedStyle(document.getElementById('eggsplat')).opacity) }));
ok(sp2.s === 0 && sp2.op === 0, `sujeira some em 2 s (${JSON.stringify(sp2)})`);
// morto por ovo: carimbo
await G((n) => { const g = window.__docao, p = g.player, b = g.entities.find((e) => e.name === n); p.hp = 10; p.invulnUntil = 0; const o = [b.pos.x, b.pos.y + 1.5, b.pos.z], t = [p.pos.x, p.pos.y + 0.9, p.pos.z]; g.launchEgg(b, o, [t[0] - o[0], t[1] - o[1], t[2] - o[2]], 1); }, thrower);
await page.waitForFunction(() => !window.__docao.player.alive, null, { timeout: 180000, polling: 50 });
const stamp = await G(() => document.getElementById('stamp').textContent);
ok(stamp === 'OMELETADO!', `carimbo de morte: ${stamp}`);
const errs = errors.filter((e) => !/GPU stall|ReadPixels/.test(e));
ok(errs.length === 0, `sem erro no console${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
await browser.close();
}
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
