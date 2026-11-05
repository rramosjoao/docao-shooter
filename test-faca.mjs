// Teste offline: Faca de churrasqueiro (slot 3) — golpe, estocada, pelas costas, alcance, cadência, kill feed "moggou",
// mensagem de morte "moggado", velocidade, troca de arma (3 / V / rodinha), bots usando a faca. Screenshots 20-faca-*.
// Uso: SITE=http://localhost:8124/ node test-faca.mjs
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

// 1) troca de arma: 3, V, rodinha
await page.keyboard.press('Digit3'); await waitGame(0.1);
ok(await G(() => window.__docao.player.weapon === window.__docao.KNIFE), 'tecla 3 saca a faca');
ok(await G(() => document.getElementById('slot3').classList.contains('active') && document.getElementById('mag').textContent === '∞'), 'HUD: slot "3 Faca" ativo, sem munição (∞)');
await page.keyboard.press('KeyV'); await waitGame(0.1); ok(await G(() => window.__docao.player.weapon === 0), 'V volta pra última arma (fuzil)');
await page.keyboard.press('KeyV'); await waitGame(0.1); ok(await G(() => window.__docao.player.weapon === window.__docao.KNIFE), 'V de novo: faca');
await page.mouse.wheel(0, 100); await waitGame(0.15); ok(await G(() => window.__docao.player.weapon === 0), 'rodinha: faca → primária');
await page.mouse.wheel(0, 100); await waitGame(0.15); await page.mouse.wheel(0, 100); await waitGame(0.15); ok(await G(() => window.__docao.player.weapon === window.__docao.KNIFE), 'rodinha: primária → pistola → faca');
// velocidade com a faca
const speed = async () => { const sp = await stage(6); await G(() => { const p = window.__docao.player; p.vel.set(0, 0, 0); window.__t.pos.set(999, -50, 999); }); await page.keyboard.down('KeyW'); await waitGame(0.6); const v = await G(() => Math.hypot(window.__docao.player.vel.x, window.__docao.player.vel.z)); await page.keyboard.up('KeyW'); await waitGame(0.2); return v; };
const vk = await speed(); await page.keyboard.press('Digit1'); await waitGame(0.5); const vr = await speed(); await page.keyboard.press('Digit3'); await waitGame(0.35);
console.log('velocidade faca/fuzil:', vk.toFixed(2), vr.toFixed(2));
ok(vk > vr * 1.1, `mais rápido com a faca (${vk.toFixed(2)} vs ${vr.toFixed(2)} m/s)`);
// 2) golpe (clique) acerta de frente: 40 de dano
let st = await stage(1.9); ok(st.ok, 'palco: alvo a 1,9 m de frente');
await waitGame(0.5); await page.screenshot({ path: `${SHOTS}/20-faca-primeira-pessoa.png` });
await click(); let r = await tHp(); console.log('golpe:', JSON.stringify(r));
ok(r.hp === 60 && r.last && r.last.kind === 'slash' && !r.last.back, `golpe de frente: 40 de dano (vida ${r.hp})`);
ok(await G(() => window.__docao.fpKnife.kind === 'slash' && window.__docao.fpKnife.t < 0.6), 'animação de golpe tocando');
// cadência: estocada logo depois do golpe não sai antes do cooldown
const nfSlash = await G(() => window.__docao.player.nextFire);
await page.mouse.down({ button: 'right' }); await waitGame(0.05); r = await tHp();
{ const nf = await G(() => window.__docao.player.nextFire); const stabAt = nf > nfSlash ? nf - 1.0 : null; // estocada (rate 1,0) saiu em stabAt
  console.log('cadência:', JSON.stringify(r), { nfSlash, stabAt });
  // máquina lenta: o tempo de jogo pode passar do cooldown entre os passos; o que importa é a estocada não sair antes de nextFire do golpe
  ok(r.hp === 60 || (stabAt !== null && stabAt >= nfSlash - 1e-6), 'cadência: nada antes do cooldown do golpe'); }
await waitGame(0.5); await page.mouse.up({ button: 'right' }); await waitGame(0.05); r = await tHp(); console.log('estocada:', JSON.stringify(r));
ok(r.last.kind === 'stab' && (!r.alive || r.hp === 60 - 75), 'botão direito = estocada (75 de dano)');
ok(r.feed.startsWith('Matheus moggou ' + st.name + ' [Faca'), `kill feed: "${r.feed}"`);
ok(await G(() => { const k = document.querySelector('#killfeed .kf'); const t = k ? k.textContent : ''; return t.includes('moggou') && t.includes('Faca'); }), 'kill feed na tela: "moggou … Faca"');
await page.screenshot({ path: `${SHOTS}/20-faca-killfeed.png` });
// estocada de novo logo depois: só depois de ~1 s
st = await stage(1.9); await G(() => { window.__docao.player.nextFire = window.__docao.time + 0.0; });
await click('right'); const h1 = (await tHp()).hp; await click('right'); const h2 = (await tHp()).hp;
ok(h1 === 25 && h2 === 25, `estocada: 75 de dano e cooldown de ~1 s (vida ${h1} → ${h2})`);
// 3) alcance: alvo a 3,5 m não leva nada
st = await stage(3.5); await waitGame(0.5); await click(); r = await tHp();
ok(st.ok && r.hp === 100 && r.last && r.last.hit === null, `fora do alcance (3,5 m): sem dano (vida ${r.hp})`);
st = await stage(3.5); await waitGame(1.1); await click('right'); r = await tHp(); ok(r.hp === 100, 'estocada também não alcança 3,5 m');
// 4) pelas costas: morte instantânea
st = await stage(1.6, true); await waitGame(1.1); await click(); r = await tHp(); console.log('costas:', JSON.stringify(r));
ok(!r.alive && r.last.back && r.feed.includes('moggou') && r.feed.includes('pelas costas'), `pelas costas: mata na hora ("${r.feed}")`);
// de frente com 100 de vida o golpe não mata
st = await stage(1.6, false); await waitGame(0.5); await click(); r = await tHp(); ok(r.alive && r.hp === 60 && !r.last.back, 'de frente não conta como pelas costas');
// 5) 3ª pessoa: bot com a faca no meio do golpe
await G(() => { const g = window.__docao, t = window.__t; t.target = null; t.frozen = 'anim'; g.switchWeapon(t, g.KNIFE); t.swingKind = 'slash'; });
await waitGame(0.3);
await G(() => { const t = window.__t, a = t.yaw + 1.1; t.vel.set(0, 0, 0); window.__cam = { p: [t.pos.x + Math.sin(a) * 2.6, t.pos.y + 1.7, t.pos.z + Math.cos(a) * 2.6], t: [t.pos.x, t.pos.y + 1.0, t.pos.z] }; document.getElementById('hud').style.visibility = 'hidden'; t.swingT = 0.0; window.__stopAt = g_t(); function g_t() { return window.__docao.time + 0.1; } });
await page.waitForFunction(() => window.__docao.time >= window.__stopAt - 1e-6, null, { timeout: 10000 });
ok(await G(() => window.__t.model.guns[window.__docao.KNIFE].visible && !window.__t.model.guns[0].visible), '3ª pessoa: faca visível na mão do bot');
await wait(400); await page.screenshot({ path: `${SHOTS}/20-faca-terceira-pessoa.png` });
await G(() => { window.__cam = null; window.__stopAt = null; window.__t.frozen = true; document.getElementById('hud').style.visibility = ''; });
// 6) morte do jogador por faca: "Você foi moggado por X" + carimbo MOGGADO!
st = await stage(1.6);
const victim = await G(() => { const g = window.__docao, p = g.player, t = window.__t; p.invulnUntil = 0; p.hp = 30; g.switchWeapon(t, g.KNIFE);
  const eye = new g.V3(t.pos.x, t.pos.y + 1.5, t.pos.z), dir = new g.V3(p.pos.x, p.pos.y + 1.1, p.pos.z).sub(eye).normalize(); const h = g.knifeAttack(t, 'slash', eye, dir); return { hit: !!h, alive: p.alive, name: t.name }; });
ok(victim.hit && !victim.alive, 'bot golpeia o jogador com a faca');
await page.waitForFunction(() => !document.getElementById('deathpick').classList.contains('hidden'), null, { timeout: 15000 });
const dm = await G(() => ({
  msg: (document.getElementById('deathWho') && document.getElementById('deathWho').textContent) || document.getElementById('centermsg').textContent,
  stamp: document.getElementById('stamp').textContent,
  card: ((document.getElementById('classGun') || {}).textContent || '') + ((document.getElementById('deathList') || {}).textContent || ''),
}));
console.log('morte:', JSON.stringify(dm));
ok(dm.msg.startsWith(`Você foi moggado por ${victim.name}`), `mensagem de morte: "${dm.msg}"`);
ok(dm.stamp === 'MOGGADO!', 'carimbo MOGGADO!');
ok(dm.card.includes('Faca'), 'tela de morte: a ficha da classe mostra a faca');
await page.screenshot({ path: `${SHOTS}/20-faca-morte.png` });
await page.waitForFunction(() => window.__docao.player.alive, null, { timeout: 20000 });
ok(await G(() => window.__docao.player.slots.includes(window.__docao.KNIFE) && document.getElementById('stamp').textContent !== ''), 'renasce com a faca no slot 3');
// morte por arma normal continua "pururucado"
await G(() => { const g = window.__docao, p = g.player; p.invulnUntil = 0; g.damage(p, 200, window.__t, 0, false); });
await page.waitForFunction(() => {
  const c = document.getElementById('centermsg').textContent;
  const w = document.getElementById('deathWho') && document.getElementById('deathWho').textContent;
  return (c && c.startsWith('Você foi pururucado')) || (w && w.startsWith('Você foi pururucado'));
}, null, { timeout: 5000 });
ok(await G(() => {
  const c = document.getElementById('centermsg').textContent;
  const w = (document.getElementById('deathWho') || {}).textContent || '';
  return (c.startsWith('Você foi pururucado') || w.startsWith('Você foi pururucado')) && document.getElementById('stamp').textContent === 'PURURUCADO!';
}), 'morte por tiro continua "pururucado"');
await page.waitForFunction(() => window.__docao.player.alive, null, { timeout: 20000 });
// 7) bots soltos: se juntam, alguns usam a faca, ninguém quebra
await G(() => { const g = window.__docao, p = g.player; p.invulnUntil = g.time + 999; window.__knifeStats = { player: 0, bot: 0, hits: 0 };
  const bots = g.entities.filter((e) => !e.isPlayer); bots.forEach((b, i) => { b.frozen = false; b.passive = false; b.pos.set(-1 + i * 0.7, g.groundAt(-1 + i * 0.7, 0, 0.3), (i % 2) * 1.2); b.alive = true; b.hp = 100; b.invulnUntil = 0; b.model.group.visible = true; });
  p.pos.set(30, g.groundAt(30, 30, 0.3), 30); });
const p0 = await G(() => window.__docao.entities.filter((e) => !e.isPlayer).map((e) => [e.pos.x, e.pos.z]));
await waitGame(12);
const bs = await G(() => ({ k: window.__knifeStats, feed: (window.__feedLog || []).slice(-12), pos: window.__docao.entities.filter((e) => !e.isPlayer).map((e) => [e.pos.x, e.pos.z, e.weapon, Number.isFinite(e.pos.x)]) }));
console.log('bots:', JSON.stringify(bs.k), bs.feed.filter((l) => l.includes('Faca')));
ok(bs.pos.every((p) => p[3]), 'bots com posições válidas');
ok(bs.pos.some((p, i) => Math.hypot(p[0] - p0[i][0], p[1] - p0[i][1]) > 1), 'bots continuam andando');
ok(bs.k.bot > 0, `bots usam a faca de perto (${bs.k.bot} golpes, ${bs.k.hits} acertos)`);
ok(await G(() => window.__docao.state === 'playing'), 'partida segue rodando');
console.log('\nerros de console:', errors.length ? errors : 'nenhum');
if (errors.length) fails.push('erros de console');
await browser.close();
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
