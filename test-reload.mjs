// Teste offline: animações de recarga por arma (1ª e 3ª pessoa). Recarga completa, pente caindo, tiro depois da recarga,
// troca de arma cancela, Calibre 12 interrompível pelo tiro. Screenshots 20-reload-*.png.
// Uso: SITE=http://localhost:8124/ node test-reload.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8124/', SHOTS = process.env.SHOTS || 'screenshots';
const errors = [], fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + ' ' + e.stack));
await page.addInitScript(() => { localStorage.setItem('docao.primary', '0'); localStorage.setItem('docao.map', 'arena'); localStorage.setItem('docao.name', 'Matheus'); localStorage.setItem('docao.skin', 'clube'); });
await page.goto(SITE, { waitUntil: 'load' }); await page.waitForTimeout(2000);
const G = (fn, a) => page.evaluate(fn, a); const wait = (ms) => page.waitForTimeout(ms);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 30000, polling: 16 }); };
await page.selectOption('#modeSel', 'dm'); await page.selectOption('#botCount', '4');
await page.click('#playBtn'); await wait(1500);
await page.click('#game'); await wait(300);
// palco: bots congelados longe; um alvo na frente do jogador num lugar aberto
const stage = (dist, faceAway = false) => G(([dist, faceAway]) => {
  const g = window.__docao, p = g.player, bots = g.entities.filter((e) => !e.isPlayer);
  for (const b of bots) { b.frozen = true; b.passive = true; b.pos.set(999, -50, 999); }
  p.alive = true; p.hp = 100; p.invulnUntil = g.time + 999; p.nextFire = 0; p.switchEnd = 0;
  const cands = [[0, 0], [10, 10], [-10, 10], [10, -10], [-10, -10], [20, 0], [-20, 0], [0, 20], [0, -20], ...g.spawns.map((s) => [s.x, s.z])];
  for (const [sx, sz] of cands) for (let a = 0; a < 6.28; a += 0.5) {
    const sy = g.groundAt(sx, sz, 0.3); const dx = -Math.sin(a) * dist, dz = -Math.cos(a) * dist, x = sx + dx, z = sz + dz, y = g.groundAt(x, z, sy + 0.5);
    if (Math.abs(y - sy) > 0.05 || g.collides(x, y, z) || g.collides(sx, sy, sz)) continue;
    if (!g.los([sx, sy + 1.6, sz], [x, y + 1.1, z]) || !g.los([sx, sy + 1.6, sz], [x - Math.sin(a) * 2.5, y + 1.1, z - Math.cos(a) * 2.5])) continue;
    p.pos.set(sx, sy, sz); p.vel.set(0, 0, 0); p.yaw = a; p.pitch = -0.12;
    const t = bots[0]; t.pos.set(x, y, z); t.vel.set(0, 0, 0); t.yaw = faceAway ? Math.atan2(-Math.sin(a), -Math.cos(a)) : Math.atan2(Math.sin(a), Math.cos(a)); // modelo: frente = (sin, cos)
    t.alive = true; t.hp = 100; t.invulnUntil = 0; t.bubble.visible = false; t.model.group.visible = true; t.model.group.scale.set(1, 1, 1); t.lastAttacker = null;
    window.__t = t; return { ok: true, name: t.name };
  }
  return { ok: false };
}, [dist, faceAway]);
const tHp = () => G(() => ({ hp: Math.round(window.__t.hp), alive: window.__t.alive, last: window.__lastMelee, feed: (window.__feedLog || []).slice(-1)[0] || '' }));
const click = async (button = 'left') => { await page.mouse.move(640, 360); await page.mouse.down({ button }); await waitGame(0.06); await page.mouse.up({ button }); await waitGame(0.08); };
const NAMES = ['fuzil', 'calibre12', 'sniper', 'bazuca', 'pistola', 'canhao', 'carabina'];
await stage(30); await G(() => { window.__t.pos.set(999, -50, 999); });
// arma na mão, munição do pente parcial, reserva cheia
const arm = (w, mag) => G(([w, mag]) => { const g = window.__docao, p = g.player; if (w !== 4) p.slots[0] = w; p.weapon = -1; g.switchWeapon(p, w); p.switchEnd = 0; p.reloadEnd = 0; p.mag[w] = mag; p.reserve[w] = 60; p.invulnUntil = g.time + 999; }, [w, mag]);
const st = () => G(() => { const g = window.__docao, p = g.player; return { w: p.weapon, mag: p.mag[p.weapon], res: p.reserve[p.weapon], rl: p.reloadEnd > g.time, drops: window.__magDrops || 0 }; });
for (const w of [0, 1, 2, 3, 4, 5, 6]) { // inclui as snipers do PR #1 (Canhão do Barril, Carabina da Granja)
  const W = await G((w) => window.__docao.WEAPONS[w], w);
  await arm(w, W.key === 'bazooka' ? 0 : W.key === 'shotgun' ? 5 : 1); await waitGame(0.45);
  const d0 = (await st()).drops;
  await page.keyboard.press('KeyR'); await waitGame(0.02);
  ok((await st()).rl, `${W.short}: R começa a recarga`);
  // congela no meio da animação pra screenshot
  const mid = W.shellReload ? W.reloadStart + W.reload * 0.55 : W.reload * (W.key === 'rifle' || W.key === 'pistol' ? 0.55 : 0.6);
  await G((mid) => { window.__stopAt = window.__docao.player.reloadStartT + mid; }, mid);
  await page.waitForFunction(() => window.__docao.time >= window.__stopAt - 1e-6, null, { timeout: 15000 });
  await wait(250); await page.screenshot({ path: `${SHOTS}/20-reload-${NAMES[w]}.png` });
  if (W.bolt) ok(await G(() => window.__docao.fpBoltHand), `${W.short}: mão no ferrolho aberto durante a recarga`);
  await G(() => { window.__stopAt = null; });
  const total = W.shellReload ? W.reloadStart + W.reload * (W.mag - 5) + 0.3 : W.reload + 0.25;
  await waitGame(total);
  const s = await st(); console.log(W.short, JSON.stringify(s));
  ok(!s.rl && s.mag === W.mag, `${W.short}: recarga completa (${s.mag}/${W.mag})`);
  if (w === 0 || w === 4) ok(s.drops > d0, `${W.short}: pente velho cai (malha caindo)`);
  // atira depois da recarga
  if (w !== 3) { await page.mouse.down(); await waitGame(0.05); await page.mouse.up(); await waitGame(0.1); const sm = await st(); if (sm.mag !== W.mag - 1) console.log('tiro:', JSON.stringify(sm), await G(() => [window.__docao.player.nextFire - window.__docao.time, window.__docao.state])); ok(W.auto ? sm.mag < W.mag && sm.mag >= W.mag - 4 : sm.mag === W.mag - 1, `${W.short}: atira normalmente depois da recarga`); }
  else { await G(() => { const p = window.__docao.player; p.pitch = 0.9; }); await page.mouse.down(); await waitGame(0.05); await page.mouse.up(); await waitGame(0.2); ok((await st()).mag === 0, 'Bazuca: dispara depois da recarga'); await G(() => { window.__docao.player.pitch = -0.12; }); }
}
// troca de arma no meio da recarga cancela (e a animação some)
await arm(0, 3); await waitGame(0.45); await page.keyboard.press('KeyR'); await waitGame(0.6);
await page.keyboard.press('Digit2'); await waitGame(0.4); let s = await st();
ok(s.w === 4 && !s.rl, 'trocar de arma no meio da recarga cancela');
await page.keyboard.press('Digit1'); await waitGame(0.5); s = await st();
ok(s.w === 0 && s.mag === 3 && !s.rl, 'voltando pro fuzil: pente intacto, sem recarga presa');
await page.mouse.down(); await waitGame(0.05); await page.mouse.up(); await waitGame(0.1); s = await st(); console.log('tiro troca:', JSON.stringify(s)); ok(s.mag < 3, 'fuzil atira depois da troca (automático)');
await page.keyboard.press('Digit3'); await waitGame(0.3); await page.keyboard.press('KeyR'); await waitGame(0.1);
ok(!(await st()).rl, 'faca: R não faz nada');
// Calibre 12: interrompe com tiro
await arm(1, 2); await waitGame(0.45); await page.keyboard.press('KeyR'); await waitGame(0.25 + 0.45 * 2 + 0.1);
s = await st(); ok(s.rl && s.mag >= 4, `Calibre 12: cartucho por cartucho (${s.mag})`);
const m0 = s.mag; await page.mouse.down(); await waitGame(0.05); await page.mouse.up(); await waitGame(0.1);
s = await st(); console.log('interrompe:', m0, JSON.stringify(s)); ok(!s.rl && s.mag <= m0 && s.mag < 8, 'Calibre 12: tiro interrompe a recarga');
await waitGame(1); ok((await st()).mag === s.mag, 'Calibre 12: recarga não volta sozinha depois do tiro');
// 3ª pessoa: bot recarregando o fuzil (pente caindo) e a bazuca (ombro abaixado)
for (const [w, name] of [[0, 'terceira-pessoa-fuzil'], [3, 'terceira-pessoa-bazuca']]) {
  const r = await stage(4);
  await G((w) => { const g = window.__docao, t = window.__t; t.target = null; t.frozen = 'anim'; t.slots[0] = w; t.weapon = -1; g.switchWeapon(t, w); t.switchEnd = 0;
    const W = g.WEAPONS[w]; t.mag[w] = 0; t.reserve[w] = 20; t.reloadStartT = g.time; t.reloadEnd = g.time + W.reload;
    const a = t.yaw + 1.2; window.__cam = { p: [t.pos.x + Math.sin(a) * 2.8, t.pos.y + 1.8, t.pos.z + Math.cos(a) * 2.8], t: [t.pos.x, t.pos.y + 1.0, t.pos.z] };
    document.getElementById('hud').style.visibility = 'hidden'; window.__stopAt = g.time + W.reload * (w === 0 ? 0.4 : 0.55); }, w);
  await page.waitForFunction(() => window.__docao.time >= window.__stopAt - 1e-6, null, { timeout: 15000 });
  await wait(300); await page.screenshot({ path: `${SHOTS}/20-reload-${name}.png` });
  const rot = await G(() => { const t = window.__t, gun = t.model.guns[t.weapon]; return [gun.rotation.x, gun.rotation.z, window.__worldMags || 0]; });
  console.log(name, rot);
  ok(Math.abs(rot[0]) + Math.abs(rot[1]) > 0.2, `3ª pessoa (${name}): arma inclinada durante a recarga`);
  if (w === 0) ok(rot[2] > 0, '3ª pessoa: pente caindo no mundo');
  await G(() => { window.__stopAt = null; window.__cam = null; document.getElementById('hud').style.visibility = ''; });
  await waitGame(2.8);
  const after = await G(() => { const t = window.__t, gun = t.model.guns[t.weapon]; return Math.abs(gun.rotation.x) + Math.abs(gun.rotation.z); });
  ok(after < 0.01, `3ª pessoa (${name}): arma volta ao normal depois da recarga`);
  await G(() => { window.__t.frozen = true; });
}
// bots jogando normalmente um tempo (recarregam sozinhos)
await G(() => { const g = window.__docao; for (const b of g.entities) if (!b.isPlayer) { b.frozen = false; b.passive = false; } g.player.invulnUntil = g.time + 999; });
const tb = Date.now(); while (Date.now() - tb < 15000) { await wait(1000); const x = await G(() => [window.__docao.state, window.__docao.time]); if (x[0] !== 'playing') { console.log('estado:', x); break; } }
ok(await G(() => window.__docao.entities.every((e) => Number.isFinite(e.pos.x) && Number.isFinite(e.pos.y))), 'bots jogando 12 s: tudo ok');
console.log('\nerros de console:', errors.length ? errors.join('\n') : 'nenhum');
ok(errors.length === 0, 'sem erros de console');
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); await browser.close(); process.exit(fails.length ? 1 : 0);
