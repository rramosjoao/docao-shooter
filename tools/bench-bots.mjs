// Mede mira de verdade: um bot com o Fuzil Pururuca, alvo a ~12 m, posições travadas
// (o deslocamento não entra na conta — só reação, cone, cabeça e previsão).
// Uso: node tools/bench-bots.mjs
import { Game } from '../server/src/game.js';
import { applyBotDiff } from '../shared/bot-difficulty.js';
import { SPIT_GRAV } from '../shared/invasion.js';
import { writeFileSync } from 'node:fs';

const DIFFS = ['leitao', 'ceva', 'javali', 'cachaco'];
const TRIALS = 8;
const CAP = 22;
const DT = 0.05;
const io = { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} };

function findLane(g, want = 12) {
  const P = g.P, [W, H] = g.map.size, nodes = [];
  for (let x = -W / 2 + 3; x <= W / 2 - 3; x += 2) {
    for (let z = -H / 2 + 3; z <= H / 2 - 3; z += 2) {
      const y = P.groundAt(x, z, 1);
      if (!Number.isFinite(y) || y > 0.4 || y < -0.2) continue;
      if (P.collides && P.collides(x, y, z)) continue;
      nodes.push({ x, y, z });
    }
  }
  let best = null;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      if (Math.abs(d - want) > 1.2 || Math.abs(a.y - b.y) > 0.3) continue;
      const eyeA = { x: a.x, y: a.y + 1.5, z: a.z }, chest = { x: b.x, y: b.y + 1.2, z: b.z };
      if (!P.losClear(eyeA, chest)) continue;
      const score = -Math.abs(d - want);
      if (!best || score > best.score) best = { a, b, d, score };
    }
  }
  return best;
}

function boot(diff, mode, map) {
  const g = new Game({ code: 'BENCH', map, max: 2, fillBots: false, mode, botDiff: diff }, io);
  g.now = () => 1000 + g.T;
  const human = g.join({ name: 'Alvo', primary: 0 }).ent;
  g.welcome(human);
  g.onMessage(human.id, { t: 'start' });
  human.connected = true;
  g.T = 0.05;
  return { g, human };
}

function armRifle(bot) {
  bot.primary = bot.nextPrimary = 0;
  bot.secondary = 4; bot.melee = 7;
  bot.slots = [0, 4, 7];
  bot.weapon = 0;
  bot.mag[0] = 30; bot.reserve[0] = 120;
  bot.nades = 0; bot.reloadEnd = 0; bot.nextFire = 0;
  bot.knifeMode = false; bot.aim = 0; bot.think = 0; bot.target = null;
  bot.coverUntil = 0; bot.flankUntil = 0; bot.holdUntil = 0; bot.burstAt = 0;
  bot.hp = 100; bot.alive = true; bot.invulnUntil = 0;
  bot.vel.x = bot.vel.y = bot.vel.z = 0;
}

function stats(rows) {
  const done = rows.filter((r) => r.ttk != null);
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
  const ttks = done.map((r) => r.ttk);
  const shots = rows.reduce((a, r) => a + r.shots, 0);
  const hits = rows.reduce((a, r) => a + r.hits, 0);
  const heads = rows.reduce((a, r) => a + r.heads, 0);
  return {
    kills: done.length,
    timeouts: rows.length - done.length,
    ttkMean: ttks.length ? mean(ttks) : null,
    ttkMed: med(ttks),
    hitPct: shots ? hits / shots : 0,
    headPct: hits ? heads / hits : 0,
    shots, hits,
  };
}

function rifleBench(diff, lane) {
  const { g, human } = boot(diff, 'dm', 'arena');
  const bot = g.makeEnt({ name: 'Bot', skin: 'docao', primary: 0, bot: true });
  g.spawn(bot); g.spawn(human);
  const out = {};
  for (const moving of [false, true]) {
    const rows = [];
    for (let n = 0; n < TRIALS; n++) {
      applyBotDiff(bot, diff);
      armRifle(bot);
      human.alive = true; human.hp = 100; human.invulnUntil = 0; human.vel.x = human.vel.y = human.vel.z = 0;
      const A = lane.a, B = lane.b;
      bot.pos.x = A.x; bot.pos.y = A.y; bot.pos.z = A.z;
      human.pos.x = B.x; human.pos.y = B.y; human.pos.z = B.z;
      bot.onGround = human.onGround = true;
      const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz) || 1;
      const px = -dz / L, pz = dx / L;
      bot.yaw = Math.atan2(dx, dz);
      const t0 = g.T;
      let shots = 0, hits = 0, heads = 0;
      while (g.T - t0 < CAP && human.alive && human.hp > 0) {
        if (moving) {
          const ang = (g.T - t0) * 1.5;
          const off = Math.sin(ang) * 2.4;
          human.pos.x = B.x + px * off; human.pos.z = B.z + pz * off; human.pos.y = B.y;
          const spd = 2.4 * 1.5 * Math.cos(ang);
          human.vel.x = px * spd; human.vel.z = pz * spd; human.vel.y = 0;
        }
        const from = g.events.length;
        g.T += DT;
        g.updateBot(bot, DT);
        for (let i = from; i < g.events.length; i++) {
          const ev = g.events[i];
          if (ev[0] === 'sh' && ev[1] === bot.id) shots++;
          else if (ev[0] === 'h' && ev[2] === bot.id && ev[1] === human.id) { hits++; if (ev[4]) heads++; }
        }
        bot.pos.x = A.x; bot.pos.y = A.y; bot.pos.z = A.z;
        bot.vel.x = bot.vel.y = bot.vel.z = 0; bot.onGround = true;
        if (!moving) { human.pos.x = B.x; human.pos.y = B.y; human.pos.z = B.z; human.vel.x = human.vel.y = human.vel.z = 0; }
      }
      rows.push({ ttk: human.hp <= 0 ? g.T - t0 : null, shots, hits, heads });
      g.T += 0.2;
    }
    out[moving ? 'moving' : 'still'] = stats(rows);
  }
  return out;
}

// o cuspe sobe e desce. Linha de visão no peito não basta: o arco bate em telhado.
function arcReaches(P, a, b) {
  const o = { x: a.x, y: a.y + 1.45, z: a.z };
  const to = { x: b.x, y: b.y + 0.9, z: b.z };
  const dx = to.x - o.x, dz = to.z - o.z, dh = Math.hypot(dx, dz) || 1;
  const T = Math.max(0.35, dh / 15);
  let x = o.x, y = o.y, z = o.z;
  let vx = dx / T, vy = (to.y - o.y + 0.5 * SPIT_GRAV * T * T) / T, vz = dz / T;
  for (let t = 0; t < T - 0.06; t += 0.02) {
    vy -= SPIT_GRAV * 0.02; x += vx * 0.02; y += vy * 0.02; z += vz * 0.02;
    if (P.nadeBlocked(x, y, z) || y <= P.groundAt(x, z, y + 0.4) + 0.08) return false;
  }
  return true;
}
function findArc(g, want = 14) {
  const P = g.P, [W, H] = g.map.size, nodes = [];
  for (let x = -W / 2 + 3; x <= W / 2 - 3; x += 2) {
    for (let z = -H / 2 + 3; z <= H / 2 - 3; z += 2) {
      const y = P.groundAt(x, z, 1);
      if (!Number.isFinite(y) || y > 0.4 || y < -0.2) continue;
      if (P.collides(x, y, z)) continue;
      nodes.push({ x, y, z });
    }
  }
  let best = null;
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.z - b.z);
    if (Math.abs(d - want) > 1.3 || Math.abs(a.y - b.y) > 0.25) continue;
    if (!arcReaches(P, a, b)) continue;
    const score = -Math.abs(d - want);
    if (!best || score > best.score) best = { a, b, d, score };
  }
  return best;
}

let arcMemo = null;
function spitBench(diff) {
  const { g, human } = boot(diff, 'inv', 'fazenda-assombrada');
  if (!arcMemo) arcMemo = findArc(g, 14);
  const spot = arcMemo;
  if (!spot) { console.error('sem arco livre pro cuspe'); return { firstMean: null, hitPct: 0, spits: 0, hurts: 0, trials: 0, missing: true }; }
  if (diff === 'leitao') console.error(`arco do cuspe ${spot.d.toFixed(1)} m`);
  human.pos.x = spot.b.x; human.pos.y = spot.b.y; human.pos.z = spot.b.z;
  human.hp = 5000; human.invulnUntil = 0; human.alive = true;
  if (g.inv) g.inv.phaseEnd = 1e12;
  const rows = [];
  for (let n = 0; n < 6; n++) {
    const z = g.inv.spawn('spitter');
    if (!z) { rows.push({ first: null, spits: 0, hurts: 0 }); continue; }
    z.pos.x = spot.a.x; z.pos.y = spot.a.y; z.pos.z = spot.a.z;
    z.vel.x = z.vel.y = z.vel.z = 0; z.nextAtk = 1e12; z.nextSpit = g.T + 0.35; z.yaw = Math.atan2(spot.b.x - spot.a.x, spot.b.z - spot.a.z);
    human.hp = 5000; human.alive = true; human.invulnUntil = 0;
    const t0 = g.T; let spits = 0, hurts = 0, first = null;
    while (g.T - t0 < 16) {
      human.pos.x = spot.b.x; human.pos.y = spot.b.y; human.pos.z = spot.b.z;
      human.vel.x = human.vel.y = human.vel.z = 0;
      const from = g.events.length;
      g.T += DT;
      g.inv.step(DT);
      for (let i = from; i < g.events.length; i++) {
        const ev = g.events[i];
        if (ev[0] === 'zs' && ev[1]) spits++;
        else if (ev[0] === 'h' && ev[1] === human.id && ev[2] === z.id) { hurts++; if (first == null) first = g.T - t0; }
      }
      z.pos.x = spot.a.x; z.pos.y = spot.a.y; z.pos.z = spot.a.z;
      z.vel.x = z.vel.y = z.vel.z = 0;
      human.pos.x = spot.b.x; human.pos.y = spot.b.y; human.pos.z = spot.b.z;
    }
    z.alive = false; z.removeAt = -1;
    g.inv.zombies = g.inv.zombies.filter((q) => q !== z);
    rows.push({ first, spits, hurts });
    g.T += 0.3;
  }
  const got = rows.filter((r) => r.first != null);
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const spits = rows.reduce((a, r) => a + r.spits, 0);
  const hurts = rows.reduce((a, r) => a + r.hurts, 0);
  return { firstMean: got.length ? mean(got.map((r) => r.first)) : null, hitPct: spits ? hurts / spits : 0, spits, hurts, trials: rows.length };
}

const probe = boot('ceva', 'dm', 'arena');
const lane = findLane(probe.g, 12);
if (!lane) { console.error('sem corredor com visão na arena'); process.exit(1); }
console.log(`corredor ${lane.d.toFixed(1)} m  (${lane.a.x.toFixed(0)},${lane.a.z.toFixed(0)}) → (${lane.b.x.toFixed(0)},${lane.b.z.toFixed(0)})`);

const report = { lane: lane.d, rifle: {}, spit: {} };
for (const id of DIFFS) {
  process.stderr.write(`fuzil ${id}…\n`);
  report.rifle[id] = rifleBench(id, lane);
  process.stderr.write(`cuspe ${id}…\n`);
  report.spit[id] = spitBench(id);
}

const f = (n, d = 2) => n == null ? '—' : n.toFixed(d);
const pct = (n) => n == null ? '—' : (n * 100).toFixed(0) + '%';
let md = `| Nível | TTK parado (média / mediana) | Acertos parado | TTK em movimento | Acertos em movimento | Cabeça (parado) | Cuspe: 1º dano | Cuspe que acerta |\n|---|---:|---:|---:|---:|---:|---:|---:|\n`;
for (const id of DIFFS) {
  const s = report.rifle[id].still, m = report.rifle[id].moving, z = report.spit[id];
  md += `| ${id} | ${f(s.ttkMean)} s / ${f(s.ttkMed)} s (${s.kills}/${TRIALS}) | ${pct(s.hitPct)} | ${f(m.ttkMean)} s / ${f(m.ttkMed)} s (${m.kills}/${TRIALS}) | ${pct(m.hitPct)} | ${pct(s.headPct)} | ${f(z.firstMean)} s | ${pct(z.hitPct)} (${z.hurts}/${z.spits}) |\n`;
}
console.log('\n' + md);
writeFileSync('/tmp/bot-bench.json', JSON.stringify(report, null, 2));
writeFileSync('/tmp/bot-bench.md', md);
console.log('salvo em /tmp/bot-bench.json');
