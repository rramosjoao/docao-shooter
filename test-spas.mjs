import { tmpdir } from 'os'; import { join } from 'path';
// Calibre 12 (SPAS-12 pump) mais forte: números (9×17, moveSpread, queda 8→20 m), empurrão shotKnock (servidor e offline),
// cadência 0,62 s, recarga 0,2 + 0,38 por cartucho, coice/tremor e modelo novo (prints em SHOTS).
// Uso: SITE=http://localhost:8125/ node test-spas.mjs   (SKIP_BROWSER=1 roda só a parte em Node)
import { WEAPONS, EYE } from './shared/rules.js';
import { falloffMul } from './shared/penetration.js';
import { shotKnock } from './shared/combat.js';
import { Game } from './server/src/game.js';
const SITE = process.env.SITE || 'http://localhost:8125/', SHOTS = process.env.SHOTS || join(tmpdir(), 'docao-shots', 'spas');
const fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const near = (a, b, e = 0.02) => Math.abs(a - b) <= e;

// ---------- 1. números puros ----------
const W = WEAPONS[1];
ok(W.key === 'shotgun' && W.pellets === 9 && W.dmg === 17 && W.rate === 0.62 && W.moveSpread === 1.35 && W.reload === 0.38 && W.reloadStart === 0.2 && !W.pen, `Calibre 12: 9×17, rate 0,62, moveSpread 1,35, recarga 0,2/0,38 (${W.pellets}×${W.dmg}, ${W.rate})`);
ok(falloffMul(W, 8) === 1 && near(falloffMul(W, 10), 0.867, 0.002) && near(falloffMul(W, 20), 0.2, 1e-9) && near(falloffMul(W, 30), 0.2, 1e-9), `queda: 8 m ×1, 10 m ×${falloffMul(W, 10).toFixed(3)}, 20 m+ ×0,2`);
const k1 = shotKnock(W, { x: 0, z: 0 }, { x: 0, z: -5 }, 153), k2 = shotKnock(W, { x: 0, z: 0 }, { x: 0, z: -5 }, 30.6);
ok(k1 && near(k1.x, 0) && near(k1.y, 2.6) && near(k1.z, -7), `shotKnock tiro cheio: ${JSON.stringify(k1)}`);
ok(k2 && near(k2.z, -1.4) && near(k2.y, 0.52), `shotKnock 20%: ${JSON.stringify(k2)}`);
ok(shotKnock(WEAPONS[12], { x: 0, z: 0 }, { x: 0, z: -5 }, 100) === null && shotKnock(W, { x: 0, z: 0 }, { x: 0, z: -5 }, 0) === null, 'Semi não empurra; dano 0 não empurra');
ok(WEAPONS.every((w, i) => i === 1 || !w.knock && w.moveSpread === undefined), 'só a Calibre 12 tem knock/moveSpread');

// ---------- 2. servidor ----------
const g = new Game({ code: 'TSPAS', map: 'arena', max: 8, fillBots: true, mode: 'dm' }, { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} });
let fake = 1000; g.now = () => fake; const a = g.join({ name: 'A' }).ent; g.welcome(a); g.onMessage(a.id, { t: 'start' }); a.connected = true;
const step = (n = 1) => { for (let i = 0; i < n; i++) { fake += 0.05; g.tick(); } };
step(5);
const sent = []; g.toMe = (e, m) => sent.push([e.id, m]);
const evs = []; const pushEv = g.events.push.bind(g.events); g.events.push = (...x) => { evs.push(...x); return pushEv(...x); };
const arm = () => { a.alive = true; a.hp = 100; a.invulnUntil = 1e9; a.slots[0] = 1; a.weapon = 1; a.mag[1] = 8; a.reserve[1] = 32; a.reload = null; };
arm();
const bots = [...g.ents.values()].filter((e) => e.bot);
const park = () => { for (const b of bots) { b.pos = { x: 500 + b.id, y: -50, z: 500 }; b.vel = { x: 0, y: 0, z: 0 }; } };
// acha um lugar com linha livre até dist (+2 m de sobra)
const spot = (dist) => {
  for (let i = 0; i < 400; i++) {
    const p = { x: (Math.random() * 2 - 1) * 16, z: (Math.random() * 2 - 1) * 16 }; const y = g.P.groundAt(p.x, p.z, 3); const ang = Math.random() * Math.PI * 2;
    const dx = Math.sin(ang), dz = Math.cos(ang), q = { x: p.x + dx * dist, z: p.z + dz * dist }, qy = g.P.groundAt(q.x, q.z, y + 0.5);
    if (Math.abs(qy - y) > 0.05 || g.P.collides(p.x, y, p.z) || g.P.collides(q.x, qy, q.z)) continue;
    const o = { x: p.x, y: y + EYE, z: p.z }, c = { x: q.x, y: qy + 1.0, z: q.z }, d = { x: c.x - o.x, y: c.y - o.y, z: c.z - o.z }, L = Math.hypot(d.x, d.y, d.z); d.x /= L; d.y /= L; d.z /= L;
    const w = g.P.rayWorld(o, d, L + 2); if (w != null && w < L + 1) continue;
    return { p: { x: p.x, y, z: p.z }, q: { x: q.x, y: qy, z: q.z }, o, d };
  }
  return null;
};
const shootAt = (t, dist) => {
  const s = spot(dist); if (!s) return null; park(); a.pos = { ...s.p }; t.pos = { ...s.q }; t.vel = { x: 0, y: 0, z: 0 }; t.alive = true; t.hp = 100; t.invulnUntil = 0; t.onGround = true;
  evs.length = 0; sent.length = 0; g.hitscan(a, s.o, Array(9).fill(s.d), 1); return s;
};
const bot = bots[0];
let s = shootAt(bot, 6);
ok(s && !bot.alive && evs.some((e) => e[0] === 'k' && e.includes(1)), `servidor: bot a 6 m morre de 1 tiro (hp ${bot.hp})`);
bot.alive = true; s = shootAt(bot, 21);
const vxz = Math.hypot(bot.vel.x, bot.vel.z), away = s ? (bot.vel.x * (s.q.x - s.p.x) + bot.vel.z * (s.q.z - s.p.z)) > 0 : false;
ok(s && bot.alive && near(bot.hp, 100 - 30.6, 0.2) && near(vxz, 1.4, 0.05) && away && bot.vel.y > 0 && bot.lastKnock === g.T, `servidor: bot a 21 m vivo (hp ${bot.hp.toFixed(1)}), empurrado ${vxz.toFixed(2)} m/s pra longe, lastKnock marcado`);
// humano B
const B = g.join({ name: 'B' }).ent; g.welcome(B); B.connected = true; step(1);
B.alive = true; s = shootAt(B, 15);
const kn = sent.find(([id, m]) => id === B.id && m[0] === 'kn');
const dmgB = 100 - B.hp, pushB = kn ? Math.hypot(kn[1][1][0], kn[1][1][2]) : 0;
ok(s && B.alive && kn && kn[1][1][1] > 0 && near(pushB, 7 * dmgB / 153, 0.1) && B.lastKnock === g.T, `servidor: humano a 15 m recebe 'kn' (${kn && JSON.stringify(kn[1][1])}, dano ${dmgB.toFixed(1)})`);
// boneco do Treino não é empurrado
{ bot.alive = true; const s2 = spot(21); park(); a.pos = { ...s2.p }; bot.pos = { ...s2.q }; bot.vel = { x: 0, y: 0, z: 0 }; bot.hp = 100; bot.invulnUntil = 0; bot.dummy = { z: s2.q.z }; g.hitscan(a, s2.o, Array(9).fill(s2.d), 1); ok(Math.hypot(bot.vel.x, bot.vel.z) === 0, 'boneco (dummy) não é empurrado'); bot.dummy = undefined; }
// proteção de nascimento: sem dano, sem empurrão
{ B.alive = true; const s2 = spot(4); park(); a.pos = { ...s2.p }; B.pos = { ...s2.q }; B.vel = { x: 0, y: 0, z: 0 }; B.hp = 100; B.invulnUntil = g.T + 5; sent.length = 0; g.hitscan(a, s2.o, Array(9).fill(s2.d), 1);
  ok(B.hp === 100 && !sent.some(([id, m]) => id === B.id && m[0] === 'kn'), 'protegido no nascimento: sem dano e sem kn'); B.invulnUntil = 0; }
ok(near(shotKnock(W, { x: 0, z: 0 }, { x: 0, z: -5 }, 153, 'tank').z, -1.4) && near(shotKnock(W, { x: 0, z: 0 }, { x: 0, z: -5 }, 153, 'boss').z, -0.56) && near(shotKnock(W, { x: 0, z: 0 }, { x: 0, z: -5 }, 153, 'walker').z, -7), 'Invasão: Barrigão ×0,2 e chefe ×0,08 de empurrão, zumbi comum cheio');
// cadência e recarga pelo onEvent
const fireEv = (ct) => { const o = [a.pos.x, a.pos.y + EYE, a.pos.z]; g.onEvent(a, ['f', o, Array(9).fill([0, -1, 0]), 1, ct, g.T]); };
arm(); park(); fake += 1; g.tick(); arm();
const t0 = fake; let rj = a.rejectedShots || 0;
fireEv(t0); const m1 = a.mag[1];
fake += 0.5; g.tick(); arm(); a.mag[1] = m1; fireEv(t0 + 0.5);
ok((a.rejectedShots || 0) === rj + 1, `cadência: tiro 0,5 s depois é recusado (${a.rejectedShots})`);
fake += 0.1; g.tick(); arm(); rj = a.rejectedShots || 0; fireEv(t0 + 0.6);
ok((a.rejectedShots || 0) === rj && a.mag[1] === 7, `cadência: tiro 0,6 s depois é aceito (mag ${a.mag[1]})`);
arm(); a.mag[1] = 4; a.reserve[1] = 32; g.onEvent(a, ['rl', 1]);
for (let i = 0; i < 20; i++) { fake += 0.05; g.tick(); a.alive = true; }
ok(a.mag[1] >= 6, `servidor: recarga 1,0 s → mag ${a.mag[1]} (≥ 6)`);

// ---------- 3. cliente (Playwright) ----------
if (!process.env.SKIP_BROWSER) {
  const { chromium } = await import('playwright');
  const fs = await import('fs'); fs.mkdirSync(SHOTS, { recursive: true });
  const errors = [];
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|ReadPixels/.test(m.text())) errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.addInitScript(() => { localStorage.setItem('docao.primary', '1'); localStorage.setItem('docao.map', 'arena'); localStorage.setItem('docao.name', 'Teste'); });
  await page.goto(SITE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__docao, null, { timeout: 120000, polling: 250 });
  const G = (fn, x) => page.evaluate(fn, x);
  const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 180000, polling: 250 }); };
  await page.selectOption('#modeSel', 'dm'); await page.selectOption('#botCount', '4');
  await page.click('#playBtn'); await page.waitForFunction(() => window.__docao.state === 'playing', null, { timeout: 120000, polling: 250 });
  await page.click('#game').catch(() => {}); await waitGame(0.3);
  const stage = (dist) => G((dist) => {
    const g = window.__docao, p = g.player, bots = g.entities.filter((e) => !e.isPlayer);
    for (const b of bots) { b.frozen = true; b.passive = true; b.pos.set(999, -50, 999); }
    p.alive = true; p.hp = 100; p.invulnUntil = g.time + 999; p.nextFire = 0; p.switchEnd = 0; p.reloadEnd = 0; p.mag[1] = 8; p.reserve[1] = 32;
    if (p.weapon !== 1) { p.weapon = -1; g.switchWeapon(p, 1); p.switchEnd = 0; }
    const cands = [[0, 0], [10, 10], [-10, 10], [10, -10], [-10, -10], [20, 0], [-20, 0], [0, 20], [0, -20], ...g.spawns.map((s) => [s.x, s.z])];
    for (const [sx, sz] of cands) for (let a = 0; a < 6.28; a += 0.5) {
      const sy = g.groundAt(sx, sz, 0.3); const dx = -Math.sin(a) * dist, dz = -Math.cos(a) * dist, x = sx + dx, z = sz + dz, y = g.groundAt(x, z, sy + 0.5);
      if (Math.abs(y - sy) > 0.05 || g.collides(x, y, z) || g.collides(sx, sy, sz)) continue;
      if (!g.los([sx, sy + 1.6, sz], [x, y + 1.0, z]) || !g.los([sx, sy + 1.6, sz], [x - Math.sin(a) * 2.5, y + 1.1, z - Math.cos(a) * 2.5])) continue;
      // espaço livre dos lados (pra andar de lado)
      if (g.collides(sx + Math.cos(a) * 2, sy, sz - Math.sin(a) * 2) || g.collides(sx - Math.cos(a) * 2, sy, sz + Math.sin(a) * 2)) continue;
      p.pos.set(sx, sy, sz); p.vel.set(0, 0, 0); p.yaw = a; p.pitch = Math.atan2(1.0 - 1.6, dist);
      const t = bots[0]; t.pos.set(x, y, z); t.vel.set(0, 0, 0); t.yaw = Math.atan2(Math.sin(a), Math.cos(a));
      t.alive = true; t.hp = 100; t.invulnUntil = 0; t.bubble.visible = false; t.model.group.visible = true; t.model.group.scale.set(1, 1, 1); t.lastAttacker = null;
      window.__t = t; return true;
    }
    return false;
  }, dist);
  // aim(lead): mira no peito; lead compensa o quadro que passa até o tiro andando
  const aim = (lead = 0) => G((lead) => { const g = window.__docao, p = g.player, t = window.__t; const dx = t.pos.x - p.pos.x - p.vel.x * lead, dz = t.pos.z - p.pos.z - p.vel.z * lead; p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(t.pos.y + 1.0 - (p.pos.y + 1.6), Math.hypot(dx, dz)); window.__lastShot = null; }, lead);
  const shoot = async () => { await page.mouse.move(640, 360); await page.mouse.down(); await page.waitForFunction(() => window.__lastShot, null, { timeout: 180000, polling: 50 }); const r = await G(() => { const g = window.__docao, p = g.player; const L = window.__lastShot, t = window.__t, o = L.origin, d = L.dir, c = [t.pos.x - o[0], t.pos.y + 1.0 - o[1], t.pos.z - o[2]], cl = Math.hypot(...c); const err = Math.acos(Math.min(1, (c[0] * d[0] + c[1] * d[1] + c[2] * d[2]) / cl)); return { spread: L.spread, nf: p.nextFire - g.time, shotT: p.nextFire - g.WEAPONS[1].rate, shake: g.shake, err }; }); await page.mouse.up(); return r; };
  const T = () => G(() => { const t = window.__t, p = window.__docao.player; return { alive: t.alive, hp: t.hp, vx: t.vel.x, vz: t.vel.z, dot: t.vel.x * (t.pos.x - p.pos.x) + t.vel.z * (t.pos.z - p.pos.z) }; });

  // ---------- prints (antes dos abates: a camuflagem por abates mudaria a cor) ----------
  await G(() => { const g = window.__docao, p = g.player; p.invulnUntil = g.time + 999; for (const b of g.entities.filter((e) => !e.isPlayer)) { b.frozen = true; b.passive = true; b.pos.set(999, -50, 999); } p.weapon = -1; g.switchWeapon(p, 1); p.switchEnd = 0; p.pitch = 0; p.mag[1] = 8; p.reloadEnd = 0; });
  await waitGame(0.8); await page.screenshot({ path: `${SHOTS}/fp-calibre12.png` });
  await page.mouse.down({ button: 'right' }); await waitGame(0.4); await page.screenshot({ path: `${SHOTS}/fp-ads.png` }); await page.mouse.up({ button: 'right' }); await waitGame(0.3);
  // pump: congela 0,3 s depois do tiro (telha recuada com a mão)
  await G(() => { window.__docao.player.nextFire = 0; window.__lastShot = null; });
  await page.mouse.down(); await page.waitForFunction(() => window.__lastShot, null, { timeout: 180000, polling: 50 });
  await G(() => { window.__stopAt = window.__docao.time + 0.3; }); await page.mouse.up();
  await page.waitForFunction(() => window.__docao.time >= window.__stopAt - 1e-6, null, { timeout: 180000, polling: 250 }); await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/fp-pump.png` }); await G(() => { window.__stopAt = null; });
  // recarga: cartucho entrando
  await waitGame(0.7); await G(() => { window.__docao.player.mag[1] = 3; }); await page.keyboard.press('KeyR'); await waitGame(0.02);
  await G(() => { const W = window.__docao.WEAPONS[1]; window.__stopAt = window.__docao.player.reloadStartT + W.reloadStart + W.reload * 0.55; });
  await page.waitForFunction(() => window.__docao.time >= window.__stopAt - 1e-6, null, { timeout: 180000, polling: 250 }); await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/fp-recarga.png` }); await G(() => { window.__stopAt = null; });
  // 3ª pessoa: bot de lado na frente, jogador na faca
  await waitGame(0.3);
  await G(() => { const g = window.__docao, p = g.player, b = g.entities.find((e) => !e.isPlayer); p.pitch = 0; const a = p.yaw; b.pos.set(p.pos.x - Math.sin(a) * 2.6, p.pos.y, p.pos.z - Math.cos(a) * 2.6); b.yaw = a + Math.PI / 2; b.alive = true; b.frozen = true; b.model.group.visible = true; b.weapon = -1; g.switchWeapon(b, 1); b.switchEnd = 0; p.weapon = -1; g.switchWeapon(p, 7); });
  await waitGame(0.6); await page.screenshot({ path: `${SHOTS}/tp-calibre12.png` });
  // (a) parado a 7 m: mata
  ok(await stage(7), 'palco 7 m'); await aim(); let r = await shoot(); await waitGame(0.1);
  let t = await T(); ok(!t.alive, `cliente: parado a 7 m mata de 1 tiro (hp ${t.hp.toFixed(1)}, spread ${r.spread.toFixed(4)})`);
  ok(near(r.spread, 0.05, 1e-4), `cliente: parado o cone é 0,05 (${r.spread})`);
  ok(r.nf > 0.45 && r.nf <= 0.621, `cliente: próximo tiro em ~0,62 s (${r.nf.toFixed(3)})`);
  ok(r.shake > 0, `cliente: tremor de câmera no tiro (${r.shake.toFixed(3)})`);
  await G((t) => { window.__stopAt = t + 0.3; }, r.shotT); await page.waitForFunction(() => window.__docao.time >= window.__stopAt - 1e-6, null, { timeout: 180000, polling: 250 });
  const pz = await G(() => window.__docao.fpPumpZ()); await G(() => { window.__stopAt = null; });
  ok(pz > -0.33, `cliente: telha recuada no pump (z ${pz})`);
  // (b) andando de lado a 7 m: cone 0,0675 e mata quase sempre
  let kills = 0, sp = 0;
  for (let i = 0; i < 5; i++) {
    await stage(7); await waitGame(0.65); await page.keyboard.down(i % 2 ? 'KeyA' : 'KeyD'); await waitGame(0.3);
    await G(() => { window.__stopAt = window.__docao.time; window.__t.hp = 100; window.__t.alive = true; }); await page.waitForTimeout(600); await aim(); r = await shoot(); await G(() => { window.__stopAt = null; }); await page.keyboard.up(i % 2 ? 'KeyA' : 'KeyD'); await waitGame(0.1); // tempo congelado: a velocidade de andar fica, mas ninguém sai do lugar até o tiro
    sp = r.spread; t = await T(); if (!t.alive) kills++; console.log(`  andando #${i}: erro de mira ${r.err.toFixed(4)} rad, spread ${r.spread.toFixed(4)} vivo ${t.alive} hp ${t.hp.toFixed(1)}`);
  }
  ok(near(sp, 0.0675, 0.002), `cliente: andando o cone é 0,05×1,35 = ${sp.toFixed(4)}`);
  ok(kills >= 4, `cliente: andando a 7 m mata ${kills}/5`);
  // (c) 16 m: sobrevive e é empurrado pra longe
  ok(await stage(16), 'palco 16 m'); await waitGame(0.65); await aim(); await shoot(); await waitGame(0.05);
  t = await T(); const v = Math.hypot(t.vx, t.vz);
  ok(t.alive && t.hp < 100 && t.dot > 0 && v > 0.3 && v < 4, `cliente: a 16 m vivo (hp ${t.hp.toFixed(1)}) e empurrado ${v.toFixed(2)} m/s pra longe`);
  // (e) recarga 0,2 + 0,38/cartucho e tiro interrompe
  await stage(30); await G(() => { window.__t.pos.set(999, -50, 999); const p = window.__docao.player; p.mag[1] = 2; p.reserve[1] = 32; p.nextFire = 0; });
  await waitGame(0.7); await page.keyboard.press('KeyR'); await waitGame(0.2 + 0.38 * 2 + 0.1);
  let st = await G(() => { const g = window.__docao, p = g.player; return { mag: p.mag[1], rl: p.reloadEnd > g.time }; });
  ok(st.rl && st.mag >= 4, `cliente: recarga cartucho a cartucho (${st.mag} em 1,06 s)`);
  await aim(); await shoot(); await waitGame(0.1);
  st = await G(() => { const g = window.__docao, p = g.player; return { mag: p.mag[1], rl: p.reloadEnd > g.time }; });
  ok(!st.rl, `cliente: tiro interrompe a recarga (mag ${st.mag})`);

  console.log('erros de console:', errors.length ? errors.join('\n') : 'nenhum');
  ok(errors.length === 0, 'sem erros de console');
  await browser.close();
}
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
