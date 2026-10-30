// Regressão: depois do fim da partida, "Próximo mapa" (e "Jogar de novo") — as armas continuam dando dano.
// Uso: SITE=http://localhost:8124/ node test-nextmap.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8124/';
const errors = [], fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[error] ' + m.text()); });
await page.addInitScript(() => { localStorage.setItem('docao.primary', '0'); localStorage.setItem('docao.map', 'vizinhanca-cheers'); localStorage.setItem('docao.name', 'Matheus'); });
await page.goto(SITE, { waitUntil: 'load' }); await page.waitForTimeout(2000);
const G = (fn, a) => page.evaluate(fn, a); const wait = (ms) => page.waitForTimeout(ms);
const waitGame = async (sec) => { const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time >= t, t0 + sec, { timeout: 30000, polling: 16 }); };
const stage = () => G(() => { // bot parado 4 m à frente, à vista; jogador e bot sem proteção de renascimento
  const g = window.__docao, p = g.player, bots = g.entities.filter((e) => !e.isPlayer);
  for (const b of bots) { b.frozen = true; b.passive = true; }
  for (const s of g.spawns) for (let k = 0; k < 8; k++) {
    const yaw = k * 0.785, dx = -Math.sin(yaw) * 4, dz = -Math.cos(yaw) * 4, x = s.x + dx, z = s.z + dz, y = g.groundAt(x, z, s.y + 0.5);
    if (Math.abs(y - s.y) > 0.3 || g.collides(x, y, z)) continue;
    p.pos.set(s.x, s.y, s.z); p.vel.set(0, 0, 0); p.yaw = yaw; p.pitch = -0.08; p.invulnUntil = 0; p.alive = true;
    const t = bots[0]; t.pos.set(x, y, z); t.vel.set(0, 0, 0); t.alive = true; t.hp = 100; t.invulnUntil = 0; if (t.bubble) t.bubble.visible = false; t.model.group.visible = true;
    if (!g.visible(t)) continue;
    for (const o of bots) if (o !== t) { o.pos.set(999, -50, 999); }
    window.__t = t; return true;
  }
  return false;
});
const shoot = async () => { // 3 tiros de fuzil
  await G(() => { const p = window.__docao.player; p.weapon !== 0 && window.__docao.switchWeapon(p, 0); }); await waitGame(0.5);
  await G(() => { const p = window.__docao.player; p.mag[0] = 30; p.reloadEnd = 0; p.nextFire = 0; });
  for (let i = 0; i < 3; i++) { await stage(); await page.mouse.move(640, 360); await page.mouse.down(); await waitGame(0.06); await page.mouse.up(); await waitGame(0.15); }
  return G(() => ({ hp: Math.round(window.__t.hp), alive: window.__t.alive }));
};
const check = async (label) => {
  await page.waitForFunction(() => window.__docao.state === 'playing', null, { timeout: 15000 }); await waitGame(3.2); // passa a proteção de renascimento
  ok(await stage(), `${label}: palco montado`);
  const r = await shoot(); ok(!r.alive || r.hp < 100, `${label}: fuzil dá dano (vida ${r.hp}, vivo=${r.alive})`);
  // granada/explosão também
  await stage(); await G(() => { const t = window.__t; window.__docao.blastAt(t.pos.x, t.pos.y + 0.3, t.pos.z, 'r'); }); await waitGame(0.1);
  const r2 = await G(() => ({ hp: Math.round(window.__t.hp), alive: window.__t.alive })); ok(!r2.alive || r2.hp < 100, `${label}: explosão dá dano (vida ${r2.hp})`);
};
await page.selectOption('#modeSel', 'dm'); await page.selectOption('#botCount', '4');
await page.click('#playBtn'); await wait(1200);
await check('1ª partida');
// fim de jogo → Próximo mapa
for (const [btn, n] of [['#nextMapBtn', 'próximo mapa'], ['#againBtn', 'jogar de novo'], ['#nextMapBtn', 'próximo mapa (2ª vez)']]) {
  const before = await G(() => window.__docao.map.id);
  await G(() => window.__docao.endGame()); await wait(600);
  ok(await G(() => window.__docao.state === 'over'), `${n}: fim de jogo`);
  await page.click(btn); await wait(1500);
  if (btn === '#nextMapBtn') ok(await G((b) => window.__docao.map.id !== b, before), `${n}: mapa trocou (${before} → ${await G(() => window.__docao.map.id)})`);
  await check(n);
}
console.log('erros:', errors.length ? errors.slice(0, 5).join('\n') : 'nenhum'); ok(!errors.length, 'sem erros de console');
await browser.close();
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
