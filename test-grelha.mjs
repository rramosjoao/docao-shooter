// Grelha no navegador: HUD das três armas, troca, tiro visível e aviso no chão.
// Uso: SITE=http://localhost:8123/ node test-grelha.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const SITE = process.env.SITE || 'http://localhost:8123/';
const OUT = process.env.OUT || '/opt/cursor/artifacts';
await mkdir(OUT, { recursive: true });
const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: '/tmp/grelha-after', size: { width: 1280, height: 720 } } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(SITE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__docao && window.__docao.grantAc130, null, { timeout: 60000 });
const G = (fn, a) => page.evaluate(fn, a);
await G(() => {
  const g = window.__docao;
  g.startGame('arena');
  for (const e of g.entities) { e.invulnUntil = g.time + 9999; if (!e.isPlayer) e.frozen = true; }
  g.grantAc130();
});
await page.waitForTimeout(300);
const hud = () => G(() => {
  const buttons = [...document.querySelectorAll('#ac130Hud .ac-modes button')].map((b) => ({
    m: b.dataset.m, on: b.classList.contains('on'), name: b.querySelector('b').textContent, key: b.querySelector('i').textContent, small: b.querySelector('small').textContent,
  }));
  return {
    on: window.__docao.ac130On,
    hidden: document.getElementById('ac130Hud').hidden,
    vig: document.getElementById('ac130Vig').hidden,
    reticle: document.querySelector('#ac130Hud .ac-x').className,
    hint: document.querySelector('#ac130Hud .ac-hint').textContent,
    time: document.querySelector('#ac130Hud .ac-top small').textContent,
    toast: document.querySelector('#ac130Hud .ac-toast').textContent,
    buttons,
    st: window.__docao.ac130State,
    tags: document.querySelectorAll('#ac130Hud .ac-tag:not([hidden])').length,
  };
});
let h = await hud();
ok(h.on && !h.hidden && !h.vig && h.buttons.length === 3, `HUD da Grelha aberto (${h.buttons.length} armas)`);
ok(h.buttons.map((b) => b.key + b.name).join() === '1Espeto,2Panela,3Caldeirão' && h.buttons[0].on && h.buttons[0].small === 'pronta', `Espeto ativo e pronta (${JSON.stringify(h.buttons)})`);
ok(h.reticle.includes('espeto') && h.time.endsWith('s') && h.hint.includes('1 / 2 / 3'), `retícula, tempo e dica (${h.reticle}, ${h.time})`);
await page.screenshot({ path: `${OUT}/grelha-depois-hud-espeto.png` });

await G(() => window.__docao.setAc130Mode('panela'));
await page.waitForFunction(() => { const s = window.__docao.ac130State; return s && s.fov < 58; }, null, { timeout: 4000 });
h = await hud();
ok(h.buttons[1].on && h.reticle.includes('panela') && h.st.fov < 58, `trocou pra Panela (fov ${h.st && h.st.fov}, mira ${h.reticle})`);
await G(() => { window.__docao.aimAc130(undefined, -1.2); window.__docao.ac130Fire(); });
await page.waitForFunction(() => /\ds/.test(document.querySelector('#ac130Hud .ac-modes button.on small')?.textContent || ''), null, { timeout: 3000 });
const fired = await G(() => document.querySelector('#ac130Hud .ac-modes button.on small').textContent);
await page.waitForTimeout(80);
await page.screenshot({ path: `${OUT}/grelha-depois-tiro-panela.png` });
await page.waitForFunction(() => (window.__ac130Booms || 0) >= 1, null, { timeout: 4000 });
h = await hud();
ok(h.st.shots >= 1 && h.st.booms >= 1 && /\d/.test(fired) && fired !== 'pronta', `panela saiu e estourou (${JSON.stringify(h.st)}, cd ${fired})`);

await page.keyboard.press('Digit3');
await page.waitForTimeout(200);
await G(() => window.__docao.ac130Fire());
await page.waitForTimeout(180);
await page.screenshot({ path: `${OUT}/grelha-depois-tiro-caldeirao.png` });
await page.waitForTimeout(500);
h = await hud();
ok(h.buttons[2].on && h.reticle.includes('caldeirao') && h.st.booms >= 2, `Caldeirão no 3 e segundo estouro (${h.reticle}, ${JSON.stringify(h.st)})`);

await page.keyboard.press('Digit1');
await page.waitForTimeout(150);
const yaw0 = await G(() => window.__docao.ac130State);
await page.evaluate(() => {
  const el = document.getElementById('game');
  const mk = (type, x, y) => {
    const t = new Touch({ identifier: 7, target: el, clientX: x, clientY: y });
    el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [t], changedTouches: [t] }));
  };
  mk('touchstart', 400, 320); mk('touchmove', 560, 360); mk('touchend', 560, 360);
});
await G(() => { for (let i = 0; i < 4; i++) window.__docao.ac130Fire(); });
await page.waitForTimeout(80);
await page.screenshot({ path: `${OUT}/grelha-depois-tiro-espeto.png` });
await page.waitForTimeout(250);
h = await hud();
const yaw1 = h.st;
ok(h.buttons[0].on && h.st.shots >= 5, `Espeto no 1 e rajada (${JSON.stringify(h.st)})`);
ok(Math.abs(yaw1.fov - 68) < 4, `fov do Espeto ${yaw1.fov}`);
ok(yaw0 && yaw1 && Math.abs(yaw1.yaw - yaw0.yaw) > 0.02, `toque na tela mexe a mira (${yaw0 && yaw0.yaw} → ${yaw1.yaw})`);

// sai da cabine com um tiro ainda no ar: quem está no chão precisa ver o traço vindo do céu
await G(() => {
  const g = window.__docao;
  g.setAc130Mode('panela');
  g.aimAc130(undefined, -1.05);
  g.ac130Fire();
  g.endAc130(false);
  const L = window.__ac130Last, p = g.player;
  if (!L || !p) return;
  p.pos.x = L.x + 9; p.pos.z = L.z - 3; p.pos.y = L.y;
  const ax = L.x + (L.fx - L.x) * 0.55, ay = L.y + (L.fy - L.y) * 0.55, az = L.z + (L.fz - L.z) * 0.55;
  const dx = ax - p.pos.x, dy = ay - (p.pos.y + 1.6), dz = az - p.pos.z;
  p.yaw = Math.atan2(-dx, -dz);
  p.pitch = Math.atan2(dy, Math.hypot(dx, dz) || 1);
});
if ((await G(() => window.__docao.state)) === 'paused') {
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(200);
}
await page.waitForTimeout(180);
await page.screenshot({ path: `${OUT}/grelha-depois-chao-tiro.png` });
await page.waitForFunction(() => {
  const n = document.getElementById('ac130Alert');
  return window.__docao.state === 'playing' && n && !n.hidden && n.textContent.includes('Grelha');
}, null, { timeout: 4000 }).catch(() => {});
const alert = await G(() => {
  const n = document.getElementById('ac130Alert');
  return { state: window.__docao.state, hidden: !n || n.hidden, text: n ? n.textContent : '', inPlane: document.body.classList.contains('in-ac130') };
});
ok(!alert.inPlane && !alert.hidden && alert.text.includes('Grelha'), `no chão aparece o aviso (${JSON.stringify(alert)})`);
await page.screenshot({ path: `${OUT}/grelha-depois-aviso-chao.png` });

ok(errors.length === 0, `sem erro de página (${errors.join(' | ')})`);
await context.close();
await browser.close();
const { readdir } = await import('node:fs/promises');
const { copyFile } = await import('node:fs/promises');
const files = await readdir('/tmp/grelha-after');
const webm = files.filter((f) => f.endsWith('.webm')).sort().at(-1);
if (webm) await copyFile(`/tmp/grelha-after/${webm}`, `${OUT}/grelha-depois.webm`);
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
