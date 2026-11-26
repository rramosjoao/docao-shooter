// Corrida completa da Granja no WebKit: Carabina, cinco por seção, chegada, Esc e R.
// Sobe o site e o handler de conta sozinho.
// Uso: node test-granja-browser.mjs
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { extname, join, normalize } from 'node:path';
import { webkit } from 'playwright';
import { GRANJA, FINISH_LINE } from './shared/granja.js';
import { handleAccountRoute } from './server/src/auth.js';

const ROOT = new URL('.', import.meta.url).pathname;
const API_PORT = 8791;
const SITE_PORT = 8147;
const SITE = `http://127.0.0.1:${SITE_PORT}/index.html?server=${encodeURIComponent(`ws://127.0.0.1:${API_PORT}`)}&devSkins=0`;
const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

function memory() {
  const db = new DatabaseSync(':memory:');
  const migs = readdirSync(new URL('./server/migrations/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort();
  for (const f of migs) db.exec(read('./server/migrations/' + f));
  const bound = (sql, args) => {
    if (!args.length) return [];
    if (/\?\d/.test(sql)) { const o = {}; args.forEach((v, i) => { o[i + 1] = v; }); return [o]; }
    return args;
  };
  const wrap = (sql, args = []) => ({ sql, args, bind(...a) { return wrap(sql, a); },
    async all() { return { results: db.prepare(sql).all(...bound(sql, args)) }; },
    async first() { return db.prepare(sql).get(...bound(sql, args)) || null; },
    async run() { const r = db.prepare(sql).run(...bound(sql, args)); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } });
  const env = { DB: { prepare: (sql) => wrap(sql), async batch(list) {
    db.exec('BEGIN');
    try {
      const out = [];
      for (const s of list) {
        const st = db.prepare(s.sql);
        const args = bound(s.sql, s.args || []);
        if (/^\s*SELECT/i.test(s.sql)) out.push({ results: st.all(...args) });
        else { const r = st.run(...args); out.push({ meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }); }
      }
      db.exec('COMMIT');
      return out;
    } catch (e) { try { db.exec('ROLLBACK'); } catch { /* já fechada */ } throw e; }
  } } };
  return { env };
}

const { env } = memory();
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' };
const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...cors, ...extra } });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg' };

const api = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  const url = new URL(req.url, `http://127.0.0.1:${API_PORT}`);
  if (url.pathname === '/health') { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true })); return; }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
  const request = new Request(url, { method: req.method, headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body });
  let response;
  try { response = await handleAccountRoute(request, env, url, json); }
  catch (e) { response = json({ error: e.message }, 500); }
  if (!response) response = json({ error: 'não achei' }, 404);
  const buf = Buffer.from(await response.arrayBuffer());
  res.writeHead(response.status, { ...cors, 'Content-Type': response.headers.get('Content-Type') || 'application/json' });
  res.end(buf);
});
const site = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${SITE_PORT}`);
  let path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
  if (path.endsWith('/')) path += 'index.html';
  if (!path.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  try {
    const data = readFileSync(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('nao achei'); }
});
await new Promise((r) => api.listen(API_PORT, '127.0.0.1', r));
await new Promise((r) => site.listen(SITE_PORT, '127.0.0.1', r));

const errors = [];
const browser = await webkit.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push(String(e.message || e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => { localStorage.setItem('docao.name', 'Joao'); localStorage.setItem('docao.primary', '0'); });
await page.goto(SITE, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('#modeSel', { timeout: 20000 });
await page.selectOption('#modeSel', 'pocilga');
await page.click('#pitMaps button[data-pit-map=granja]');
await page.waitForTimeout(400);
const menu = await page.evaluate(() => ({
  opt: document.querySelector('#modeSel option:checked')?.textContent || '',
  note: document.getElementById('pitBlurb')?.innerText || '',
  on: document.querySelector('#pitMaps button.on')?.dataset.pitMap || '',
}));
ok(menu.opt.trim() === 'Pistoleiro' && menu.on === 'granja' && /Carabina/.test(menu.note), `menu na Granja (${menu.opt} / ${menu.on})`);
await page.click('#playBtn');
await page.waitForFunction(() => window.__docao && window.__docao.state === 'playing' && window.__docao.pit && window.__docao.pit.on, null, { timeout: 20000 });
const boot = await page.evaluate(() => ({
  map: window.__docao.map.id,
  w: window.__docao.player.weapon,
  n: window.__docao.pit.targets.length,
  enemies: window.__docao.pit.targets.filter((t) => t.kind === 'enemy').length,
  coach: window.__docao.pit.coach,
}));
ok(boot.map === 'granja' && boot.w === 6 && boot.enemies === 30 && boot.n === 32 && boot.coach, `Carabina e 30 placas (${JSON.stringify(boot)})`);

const go = (x, y, z, yaw = -Math.PI / 2) => page.evaluate(({ x, y, z, yaw }) => {
  const p = window.__docao.player;
  p.pos.set(x, y, z); p.vel.set(0, 0, 0); p.yaw = yaw; p.pitch = 0;
}, { x, y, z, yaw });
await go(GRANJA.gates[0].x, GRANJA.gates[0].y, GRANJA.gates[0].z);
await page.waitForFunction(() => window.__docao.pit.started, null, { timeout: 5000 });

const shot = await page.evaluate(() => {
  const g = window.__docao;
  const out = {};
  const enemies = g.pit.targets.filter((t) => t.kind === 'enemy');
  for (const t of enemies) {
    const p = g.player;
    const extra = 3.1;
    const scale = t.scale || 1;
    let spot = { x: t.x - extra, y: t.y || 0, z: t.z, yaw: -Math.PI / 2 };
    if (t.face === 1) spot = { x: t.x, y: t.y || 0, z: t.z + extra, yaw: 0 };
    else if (t.face === -1) spot = { x: t.x, y: t.y || 0, z: t.z - extra, yaw: Math.PI };
    p.pos.set(spot.x, spot.y, spot.z); p.vel.set(0, 0, 0); p.yaw = spot.yaw; p.pitch = 0;
    const eyeY = spot.y + 1.6;
    const aimY = (t.y || 0) + 0.02 + 1.85 * scale * 0.45;
    const dir = new g.V3(t.x - spot.x, aimY - eyeY, t.z - spot.z).normalize();
    const origin = new g.V3(spot.x, eyeY, spot.z);
    g.fire(p, origin, dir, p.weapon, 0, origin.clone());
    const now = g.pit.targets.find((x) => x.id === t.id);
    out[t.id] = now.phase;
  }
  return out;
});
const missed = Object.entries(shot).filter(([, phase]) => phase !== 'fall' && phase !== 'dead');
ok(!missed.length, `as 30 placas caem com a Carabina${missed.length ? ' (' + missed.map(([id, phase]) => id + ':' + phase).join(',') + ')' : ''}`);

const tulha = GRANJA.gates.find((g) => g.pop === 'tulha');
await go(tulha.x, tulha.y, tulha.z);
await page.waitForTimeout(250);
const pops = await page.evaluate(() => window.__docao.pit.pops);
ok(pops.length === GRANJA.bays.length, `as seções fecham ao cruzar a última (${pops.join(',')})`);

await go(FINISH_LINE.x, 0, (FINISH_LINE.z0 + FINISH_LINE.z1) / 2, -Math.PI / 2);
await page.waitForFunction(() => window.__docao.pit.done && window.__docao.pit.card, null, { timeout: 8000 });
const done = await page.evaluate(() => {
  const pit = window.__docao.pit;
  return { stars: pit.result && pit.result.stars, civs: pit.result && pit.result.civs, missed: pit.result && pit.result.missed, final: pit.result && pit.result.final, reason: pit.result && pit.result.reason, w: window.__docao.player.weapon };
});
ok(done.reason === 'ok' && done.civs === 0 && done.stars >= 1 && !(done.missed && done.missed.length) && done.w === 6, `corrida fechada (${JSON.stringify(done)})`);
const card = await page.locator('#pitCard').innerText();
ok(/MISSÃO CUMPRIDA/.test(card) && /Pistoleiro da Granja/.test(card) && /FECHAR/.test(card), 'cartaz da Granja com a missão');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
const closed = await page.evaluate(() => ({ card: window.__docao.pit.card, state: window.__docao.state, pause: document.getElementById('pause').classList.contains('hidden') }));
ok(!closed.card && closed.state === 'playing' && closed.pause, `Esc fecha o cartaz (${JSON.stringify(closed)})`);
await page.keyboard.press('KeyR');
await page.waitForTimeout(400);
const again = await page.evaluate(() => ({ started: window.__docao.pit.started, card: window.__docao.pit.card, w: window.__docao.player.weapon, up: window.__docao.pit.targets.filter((t) => t.kind === 'enemy').every((t) => t.phase === 'up') }));
ok(!again.started && !again.card && again.w === 6 && again.up, `R recomeça de Carabina (${JSON.stringify(again)})`);

const noisy = errors.filter((e) => !/WebGL|gpu|GPU|context lost|favicon/i.test(e));
ok(!noisy.length, 'sem erro de página' + (noisy.length ? ': ' + noisy.slice(0, 4).join(' | ') : ''));
console.log(fails.length ? `FALHOU ${fails.length}` : 'TUDO OK');
await browser.close();
await new Promise((r) => api.close(r));
await new Promise((r) => site.close(r));
process.exit(fails.length ? 1 : 0);
