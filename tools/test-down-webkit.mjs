// Validação WebKit do down/revive. Dois clientes no mesmo browser WebKit.
// Cada etapa estoura sozinha e fecha só este browser. Sem Chromium.
// node tools/test-down-webkit.mjs
import { webkit } from 'playwright';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';

const SITE = process.argv[2] || 'http://127.0.0.1:8170/';
const SERVER = process.argv[3] || 'ws://127.0.0.1:8787';
const OUT = process.env.SHOTS || '/opt/cursor/artifacts';
mkdirSync(OUT, { recursive: true });
const UZI = 9;
const logs = [];
const steps = [];
let browser;
let ended = false;
const stamp = () => new Date().toISOString().slice(11, 23);
function note(line) { const row = stamp() + ' ' + line; logs.push(row); console.log(row); }
function walk(pid, acc) {
  let rss = 0;
  try { const s = readFileSync('/proc/' + pid + '/status', 'utf8'); const m = s.match(/VmRSS:\s+(\d+)/); rss = m ? +m[1] : 0; } catch { return; }
  acc.push(rss);
  let kids = '';
  try { kids = readFileSync('/proc/' + pid + '/task/' + pid + '/children', 'utf8'); } catch { kids = ''; }
  for (const k of kids.trim().split(/\s+/).filter(Boolean)) walk(+k, acc);
}
function mem() {
  const acc = [];
  let kids = '';
  try { kids = readFileSync('/proc/' + process.pid + '/task/' + process.pid + '/children', 'utf8'); } catch { kids = ''; }
  for (const k of kids.trim().split(/\s+/).filter(Boolean)) walk(+k, acc);
  return acc.reduce((s, n) => s + n, 0);
}
async function finish(why) {
  if (ended) return;
  ended = true;
  const report = { why, steps, mem: mem(), tail: logs.slice(-30) };
  writeFileSync('/tmp/down-webkit.json', JSON.stringify(report, null, 2));
  note('fim ' + why + ' rss=' + report.mem);
  try { if (browser) await browser.close(); } catch { /* */ }
  process.exit(why === 'ok' ? 0 : 2);
}
async function step(name, ms, fn) {
  const t0 = Date.now();
  let timer, memTimer;
  const cap = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('STEP_TIMEOUT')), ms); });
  const fat = new Promise((_, rej) => {
    memTimer = setInterval(() => { const r = mem(); if (r > 7000000) rej(new Error('RSS ' + Math.round(r / 1024) + ' MB')); }, 500);
  });
  try {
    const value = await Promise.race([Promise.resolve().then(fn), cap, fat]);
    clearTimeout(timer); clearInterval(memTimer);
    steps.push({ name, ok: true, ms: Date.now() - t0, mem: mem() });
    note('OK ' + name + ' ' + (Date.now() - t0) + 'ms rss=' + mem());
    return value;
  } catch (e) {
    clearTimeout(timer); clearInterval(memTimer);
    steps.push({ name, ok: false, ms: Date.now() - t0, err: String(e.message).slice(0, 400), mem: mem() });
    note('FALHA ' + name + ' ' + String(e.message).slice(0, 400));
    await finish('timeout:' + name);
  }
}

browser = await webkit.launch();
browser.on('disconnected', () => { if (!ended) { ended = true; note('webkit morreu'); process.exit(3); } });

async function client(name, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(30000);
  page.on('pageerror', (e) => note('PAGE ' + name + ' ' + String(e.message).slice(0, 240)));
  page.on('crash', () => note('CRASH ' + name));
  await page.addInitScript((n) => { localStorage.setItem('docao.name', n); localStorage.setItem('docao.mode', 'dm'); }, name);
  await page.goto(SITE + '?server=' + encodeURIComponent(SERVER), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__docao && window.__docao.renderer, null, { timeout: 20000 });
  await page.evaluate(() => { const r = window.__docao.renderer; r.setPixelRatio(1); r.shadowMap.enabled = false; });
  return page;
}
async function shot(page, name) {
  const path = OUT + '/' + name + '.png';
  try {
    await page.screenshot({ path, animations: 'disabled', timeout: 12000 });
  } catch (e) {
    const sz = existsSync(path) ? statSync(path).size : 0;
    if (sz < 20000) throw e;
    note('print ' + name + ' ficou no disco (' + sz + ') depois de ' + e.message);
  }
}
const send = (page, msg) => page.evaluate((m) => window.__docao.online.net.send({ t: 'testInv', ...m }), msg);
const state = (page) => page.evaluate(() => {
  const g = window.__docao, p = g.player, v = g.invView;
  const me = v && v.lives.get(g.online.myId);
  const hud = document.getElementById('downHud');
  return {
    alive: p.alive, down: !!p.down, w: p.weapon, mag: p.mag && p.mag[9], res: p.reserve && p.reserve[9],
    pap: p.pap && p.pap[9], downMag: p.downMag, revP: p.revP || 0, lives: me && me.lives,
    title: document.getElementById('wtitle') ? document.getElementById('wtitle').textContent : '',
    downTitle: hud && !hud.classList.contains('hidden') ? document.getElementById('downTitle').textContent : '',
    fill: document.getElementById('downFill') ? document.getElementById('downFill').style.width : '',
  };
});
function hold(page, on) {
  return page.evaluate((down) => {
    document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code: 'KeyL', key: 'l', bubbles: true }));
  }, on);
}

const A = await client('Ana', 1280, 800);
const B = await client('Beto', 1280, 800);
await step('sala', 25000, async () => {
  await A.evaluate(() => {
    document.getElementById('onlineBtn').click();
    const mode = document.getElementById('roomMode'); mode.value = 'inv'; mode.dispatchEvent(new Event('change'));
    const surv = document.getElementById('roomSurv'); if (surv) { surv.value = 'survival'; surv.dispatchEvent(new Event('change')); }
    const bots = document.getElementById('roomBots'); if (bots) bots.value = '0';
    document.getElementById('createBtn').click();
  });
  await A.waitForFunction(() => window.__docao.online && window.__docao.online.myId > 0, null, { timeout: 15000 });
});
const code = await A.evaluate(() => window.__docao.online.code);
note('sala ' + code);
await step('beto', 30000, async () => {
  await B.goto(SITE + '?server=' + encodeURIComponent(SERVER) + '&sala=' + code, { waitUntil: 'domcontentloaded' });
  await B.waitForFunction(() => window.__docao.online && window.__docao.online.myId > 0, null, { timeout: 20000 });
});
await step('partida', 40000, async () => {
  await A.evaluate(() => document.getElementById('startOnline').click());
  await A.waitForFunction(() => window.__docao.state === 'playing' && window.__docao.player, null, { timeout: 30000 });
  await B.waitForFunction(() => window.__docao.state === 'playing' && window.__docao.player, null, { timeout: 30000 });
  const n = await A.evaluate(() => { const v = window.__docao.invView; return v && [...v.lives.values()].length; });
  if (n !== 2) throw new Error('vidas no host: ' + n);
  const nb = await B.evaluate(() => { const v = window.__docao.invView; return v && [...v.lives.values()].every((s) => s.lives === 2); });
  if (!nb) throw new Error('cliente não vê 2 corações');
});
await step('prepara', 15000, async () => {
  await send(A, { hold: true, killAll: true, clearQueue: true, fog: { cx: 0, cz: 0, r: 400, tx: 0, tz: 0, tr: 400 }, gun: UZI, mag: 4, res: 9, tier: 2 });
  await A.waitForFunction(() => window.__docao.player.weapon === 9 && window.__docao.player.mag[9] === 4, null, { timeout: 10000 });
});

async function place() {
  await send(A, { pos: [0, 0, 20] });
  await send(B, { pos: [0.9, 0, 20] });
  await A.waitForFunction(() => Math.hypot(window.__docao.player.pos.x, window.__docao.player.pos.z - 20) < 1.6, null, { timeout: 8000 });
  await B.waitForFunction(() => Math.hypot(window.__docao.player.pos.x - 0.9, window.__docao.player.pos.z - 20) < 1.6, null, { timeout: 8000 });
}
async function heart(page, name) {
  await page.waitForFunction(() => window.__docao.time > window.__docao.player.invulnUntil, null, { timeout: 8000 });
  await send(page, { hurt: 500 });
  await page.waitForFunction(() => !window.__docao.player.alive && !window.__docao.player.down, null, { timeout: 8000 });
  const lives = await page.evaluate(() => window.__docao.invView.lives.get(window.__docao.online.myId).lives);
  if (lives !== 1) throw new Error(name + ' vidas ' + lives);
  await send(page, { rs: true });
  await page.waitForFunction(() => window.__docao.player.alive && window.__docao.player.weapon === 9 && window.__docao.player.mag[9] === 4, null, { timeout: 8000 });
}
async function fall(page) {
  await page.waitForFunction(() => window.__docao.time > window.__docao.player.invulnUntil, null, { timeout: 8000 });
  await send(page, { hurt: 500 });
  await page.waitForFunction(() => window.__docao.player.down && window.__docao.player.alive && window.__docao.player.weapon === 4 && window.__docao.player.mag[9] === 4, null, { timeout: 8000 });
}
async function aim(page) {
  const info = await page.evaluate(() => new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const g = window.__docao;
      const mate = g.entities.find((e) => e !== g.player && !e.zt && e.down);
      if (!mate || !mate.model) { resolve({ err: 'sem modelo' }); return; }
      if ((mate.downBlend || 0) < 0.9 && performance.now() - t0 < 1500) { requestAnimationFrame(tick); return; }
      const p = mate.pos;
      window.__cam = { p: [p.x + 3.2, p.y + 1.8, p.z + 2.4], t: [p.x, p.y + 0.7, p.z], fov: 42 };
      const banner = document.getElementById('invBanner');
      if (banner) banner.classList.add('hidden');
      resolve({ blend: +(mate.downBlend || 0).toFixed(2), y: +p.y.toFixed(2), vis: mate.model.group.visible });
    };
    tick();
  }));
  note('pose ' + JSON.stringify(info));
  if (!info || info.err) throw new Error('modelo caído fora da cena ' + JSON.stringify(info));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

await step('ciclo1-coracao', 20000, () => heart(A, 'Ana'));
await step('ciclo1-cair', 20000, async () => { await place(); await fall(A); });
await step('ciclo1-prints-down', 20000, async () => {
  const s = await state(A);
  if (!s.downTitle.includes('caído')) throw new Error('prompt Ana: ' + s.downTitle);
  if (s.lives !== 0 || s.w !== 4 || s.mag !== 4) throw new Error('ana down ' + JSON.stringify(s));
  const livesB = await B.evaluate(() => window.__docao.invView.lives.get(window.__docao.online.myId).lives);
  if (livesB !== 2) throw new Error('Beto perdeu coração ' + livesB);
  await shot(A, 'down-1280-caido');
  await B.waitForFunction(() => window.__docao.entities.some((e) => e !== window.__docao.player && !e.zt && e.down), null, { timeout: 8000 });
  await aim(B);
  await shot(B, 'down-1280-pose');
});
await step('ciclo1-segura-e-solta', 20000, async () => {
  await hold(B, true);
  await A.waitForFunction(() => (window.__docao.player.revP || 0) > 0.15, null, { timeout: 8000 });
  await shot(B, 'down-1280-progresso');
  await shot(A, 'down-1280-progresso-caido');
  await hold(B, false);
  await B.evaluate(() => { window.__cam = null; });
  await A.waitForFunction(() => (window.__docao.player.revP || 0) === 0, null, { timeout: 5000 });
});
await step('ciclo1-revive', 20000, async () => {
  await hold(B, true);
  await A.waitForFunction(() => !window.__docao.player.down && window.__docao.player.weapon === 9 && window.__docao.player.mag[9] === 4 && window.__docao.player.reserve[9] === 9 && window.__docao.player.pap[9] === 2, null, { timeout: 12000 });
  await hold(B, false);
  const s = await state(A);
  if (!s.title.includes('MP5K')) throw new Error('HUD ' + s.title);
  await shot(A, 'down-1280-armas');
});
await step('ciclo2-cair', 20000, async () => { await place(); await fall(A); });
await step('parede', 20000, async () => {
  const pair = await A.evaluate(() => {
    const g = window.__docao;
    const solids = g.solids.filter((s) => (s.max.y - s.min.y) > 1.6 && Math.min(s.max.x - s.min.x, s.max.z - s.min.z) < 0.9);
    for (const s of solids) {
      const thinX = (s.max.x - s.min.x) < (s.max.z - s.min.z);
      const cx = (s.min.x + s.max.x) / 2, cz = (s.min.z + s.max.z) / 2;
      const a = thinX ? [s.min.x - 0.75, 0, cz] : [cx, 0, s.min.z - 0.75];
      const b = thinX ? [s.max.x + 0.75, 0, cz] : [cx, 0, s.max.z + 0.75];
      if (Math.hypot(a[0] - b[0], a[2] - b[2]) > 2.05) continue;
      const ya = g.groundAt(a[0], a[2], 3), yb = g.groundAt(b[0], b[2], 3);
      if (g.collides(a[0], ya + 0.3, a[2]) || g.collides(b[0], yb + 0.3, b[2])) continue;
      if (g.los([a[0], ya + 1.5, a[2]], [b[0], yb + 0.32, b[2]])) continue;
      return { a: [a[0], ya, a[2]], b: [b[0], yb, b[2]] };
    }
    return null;
  });
  if (!pair) throw new Error('sem parede');
  await send(A, { pos: pair.a });
  await send(B, { pos: pair.b });
  await B.waitForFunction((p) => Math.hypot(window.__docao.player.pos.x - p[0], window.__docao.player.pos.z - p[2]) < 1.4, pair.b, { timeout: 8000 });
  await hold(B, true);
  await new Promise((r) => setTimeout(r, 1500));
  const rev = await A.evaluate(() => window.__docao.player.revP || 0);
  if (rev !== 0) throw new Error('parede encheu ' + rev);
  await hold(B, false);
  await shot(B, 'down-1280-parede');
  note('parede ' + pair.a.map((n) => n.toFixed(1)).join(','));
});
await step('ciclo2-revive', 20000, async () => {
  await place();
  await hold(B, true);
  await A.waitForFunction(() => !window.__docao.player.down && window.__docao.player.weapon === 9 && window.__docao.player.mag[9] === 4, null, { timeout: 12000 });
  await hold(B, false);
});

await step('viewport-1440', 10000, async () => {
  await A.setViewportSize({ width: 1440, height: 900 });
  await B.setViewportSize({ width: 1440, height: 900 });
});
await step('cliente-arma', 15000, async () => {
  await send(B, { gun: UZI, mag: 4, res: 9, tier: 2 });
  await B.waitForFunction(() => window.__docao.player.weapon === 9 && window.__docao.player.mag[9] === 4, null, { timeout: 8000 });
});
await step('cliente-coracao', 20000, () => heart(B, 'Beto'));
await step('cliente-cair', 20000, async () => { await place(); await fall(B); });
await step('cliente-prints', 25000, async () => {
  const s = await state(B);
  if (s.w !== 4 || s.mag !== 4 || !s.down) throw new Error('beto down ' + JSON.stringify(s));
  await shot(B, 'down-1440-caido');
  await A.waitForFunction(() => window.__docao.entities.some((e) => e !== window.__docao.player && !e.zt && e.down), null, { timeout: 8000 });
  await aim(A);
  await shot(A, 'down-1440-pose');
  await hold(A, true);
  await B.waitForFunction(() => (window.__docao.player.revP || 0) > 0.15, null, { timeout: 8000 });
  await shot(A, 'down-1440-progresso');
  await hold(A, false);
  await A.evaluate(() => { window.__cam = null; });
  await B.waitForFunction(() => (window.__docao.player.revP || 0) === 0, null, { timeout: 5000 });
  await hold(A, true);
  await B.waitForFunction(() => !window.__docao.player.down && window.__docao.player.weapon === 9 && window.__docao.player.mag[9] === 4 && window.__docao.player.reserve[9] === 9, null, { timeout: 12000 });
  await hold(A, false);
  const back = await state(B);
  if (!back.title.includes('MP5K')) throw new Error('HUD beto ' + back.title);
  await shot(B, 'down-1440-armas');
});

note('webkit fechou hold, cancelamento, parede, cliente e os dois ciclos');
await finish('ok');
