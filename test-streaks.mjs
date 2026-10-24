// Fumaça, pau de choque, UAV, mísseis e nuke. Uso: SITE=http://localhost:8123/ node test-streaks.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8123/';
const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(SITE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__docao && window.__docao.startGame, null, { timeout: 180000, polling: 250 });
const G = (fn, a) => page.evaluate(fn, a);
const until = async (fn, ms = 12000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await page.evaluate(fn)) return true;
    await page.waitForTimeout(100);
  }
  return false;
};
// UAV e Gavião: F puxa o rádio, fala por 1 s e só então o streak entra
const callRadio = async () => {
  await G(() => window.__docao.useStreak());
  await page.waitForTimeout(400);
  const mid = await G(() => ({ call: !!window.__docao.radioCall, radio: !!document && window.__docao.radioCall !== null }));
  ok(mid.call, `F abre o rádio e chama antes de soltar o streak (${JSON.stringify(mid)})`);
  ok(await until(() => !window.__docao.radioCall, 40000), 'a chamada no rádio termina');
  await page.waitForTimeout(200);
};
await G(() => {
  const g = window.__docao;
  g.startGame('arena');
  for (const e of g.entities) {
    e.invulnUntil = g.time + 9999;
    if (!e.isPlayer) e.frozen = true;
  }
});
await page.waitForTimeout(400);
await G(() => { window.__docao.player.smokeNades = 1; window.__docao.throwSmoke(); });
ok(await until(() => window.__docao.smokes.length > 0), 'a fumaça estoura');
const smoke = await G(() => {
  const g = window.__docao;
  const s = g.smokes[0];
  if (!s) return { n: 0 };
  const bot = g.entities.find((e) => !e.isPlayer && e.alive);
  bot.pos.set(s.pos.x, 0, s.pos.z + 3);
  g.player.pos.set(s.pos.x, 0, s.pos.z - 8);
  g.player.vel.set(0, 0, 0);
  bot.vel.set(0, 0, 0);
  if (bot.model) bot.model.group.position.copy(bot.pos);
  const blocked = s.blocks(
    { x: s.pos.x, y: s.pos.y, z: s.pos.z - 8 },
    { x: s.pos.x, y: s.pos.y, z: s.pos.z + 3 },
  );
  return { n: g.smokes.length, blocked, left: g.player.smokeNades };
});
ok(smoke.n === 1 && smoke.blocked && smoke.left === 0, `fumaça abre e tampa a linha (${JSON.stringify(smoke)})`);
ok(await until(() => {
  const bot = window.__docao.entities.find((e) => !e.isPlayer && e.alive);
  return !!(bot && bot.model && bot.model.group.visible === false);
}), 'inimigo some atrás da fumaça');

// pau de choque (tecla 5): finca, dá choque no bot da frente e nunca no dono
const shockBot = await G(() => {
  const g = window.__docao, p = g.player, bot = g.entities.find((e) => !e.isPlayer && e.alive);
  p.stunNades = 1; p.stunUntil = 0; p.pitch = -0.6; p.vel.set(0, 0, 0);
  for (let k = 0; k < 32; k++) { const yaw = k / 32 * Math.PI * 2; if ([0.15, 0.5, 1.2].every((h) => { const o = [p.pos.x, p.pos.y + h, p.pos.z]; return [1, 2, 3, 4].every((d) => g.los(o, [o[0] - Math.sin(yaw) * d, o[1], o[2] - Math.cos(yaw) * d])); })) { p.yaw = yaw; break; } } // direção livre até no pé
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  bot.pos.set(p.pos.x + fx * 3, p.pos.y, p.pos.z + fz * 3); bot.vel.set(0, 0, 0); bot.hp = 100; bot.invulnUntil = 0; bot.frozen = true;
  return bot.name;
});
{ const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time > t + 0.05, t0, { timeout: 120000, polling: 100 }); } // um quadro pra câmera pegar o pitch
await G(() => window.__docao.throwShock());
ok(await until(() => { const s = window.__docao.shocks[0]; return !!(s && s.stuck); }, 60000), 'o pau de choque finca');
ok(await until(() => { const g = window.__docao; return g.entities.some((e) => e.stunUntil > g.time && !e.isPlayer); }, 60000), 'o choque chega no bot');
const stun = await G((n) => {
  const g = window.__docao, p = g.player, bot = g.entities.find((e) => e.name === n);
  return { bot: bot.stunUntil > g.time, hp: bot.hp, alive: bot.alive, me: p.stunUntil > g.time, left: p.stunNades };
}, shockBot);
ok(stun.bot && stun.hp < 100 && stun.hp >= 1 && stun.alive && !stun.me && stun.left === 0, `pau de choque atordoa o bot e não o dono (${JSON.stringify(stun)})`);

await G(() => { window.__docao.rewardKill(); window.__docao.rewardKill(); window.__docao.rewardKill(); });
await page.waitForTimeout(200);
const armed = await G(() => ({
  n: document.querySelector('#streakCount b')?.textContent,
  shown: !document.getElementById('streakCount').hidden,
  uav: !document.getElementById('uav').hidden,
  prompt: document.getElementById('nukeReady')?.textContent || '',
  promptOn: document.getElementById('nukeReady') && !document.getElementById('nukeReady').hidden,
}));
ok(armed.n === '3' && armed.shown && !armed.uav && armed.promptOn && armed.prompt.includes('Olho'), `3 abates deixam o minimapa pronto, sem ligar (${JSON.stringify(armed)})`);
await callRadio();

const uav = await G(() => ({
  uav: !document.getElementById('uav').hidden,
  time: document.getElementById('uavTime')?.textContent,
}));
ok(uav.uav && uav.time === '10s', `F liga o minimapa (${JSON.stringify(uav)})`);
await G(() => {
  const g = window.__docao;
  g.player.pos.set(0, 0, 0);
  g.player.yaw = 0;
  let i = 0;
  for (const e of g.entities) {
    if (e.isPlayer) continue;
    e.pos.set(i === 0 ? 0 : 90, 0, i === 0 ? -6 : 90);
    i++;
  }
});
await page.waitForTimeout(250);
const aim = await page.evaluate(() => {
  const c = document.querySelector('#uav canvas');
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height, cx = w / 2, cy = h / 2;
  const red = (x, y) => { const d = ctx.getImageData(x | 0, y | 0, 1, 1).data; return d[0] > 180 && d[0] > d[1] + 40 && d[0] > d[2] + 40; };
  let above = 0, below = 0;
  for (let y = cy * 0.35; y < cy - 10; y += 3) for (let x = cx - 24; x < cx + 24; x += 3) if (red(x, y)) above++;
  for (let y = cy + 10; y < cy + (h - cy) * 0.65; y += 3) for (let x = cx - 24; x < cx + 24; x += 3) if (red(x, y)) below++;
  const card = (n) => document.querySelector(`#streakBar .streak-card[data-need="${n}"]`).getBoundingClientRect().top;
  return { above, below, low: card('3'), high: card('7'), left: document.querySelector('#streakBar .streak-card[data-need="3"] b').textContent };
});
ok(aim.above > 0 && aim.above > aim.below, `inimigo na frente fica em cima no minimapa (${JSON.stringify(aim)})`);
// yaw 0 olha pra −Z; a direita do Docão é +X (a mesma do D no teclado). Inimigo em +X tem que aparecer à direita no minimapa.
await G(() => { const g = window.__docao; let i = 0; for (const e of g.entities) { if (e.isPlayer) continue; e.pos.set(i === 0 ? 6 : 90, 0, i === 0 ? 0 : 90); i++; } });
await page.waitForTimeout(250);
const side = await page.evaluate(() => {
  const c = document.querySelector('#uav canvas'), ctx = c.getContext('2d'), w = c.width, h = c.height, cx = w / 2, cy = h / 2;
  const red = (x, y) => { const d = ctx.getImageData(x | 0, y | 0, 1, 1).data; return d[0] > 180 && d[0] > d[1] + 40 && d[0] > d[2] + 40; };
  let right = 0, left = 0;
  for (let y = cy - 24; y < cy + 24; y += 3) { for (let x = cx + 10; x < cx + (w - cx) * 0.65; x += 3) if (red(x, y)) right++; for (let x = cx * 0.35; x < cx - 10; x += 3) if (red(x, y)) left++; }
  return { right, left };
});
ok(side.right > 0 && side.right > side.left, `inimigo à direita fica à direita no minimapa (${JSON.stringify(side)})`);
ok(aim.high < aim.low && aim.left === '0', `barra de baixo pra cima, o de 3 já foi (${JSON.stringify(aim)})`);

await G(() => { window.__docao.rewardKill(); window.__docao.rewardKill(); });
await page.waitForTimeout(300);
const armedMissile = await G(() => ({
  map: !document.getElementById('strikeMap').hidden,
  prompt: document.getElementById('nukeReady')?.textContent || '',
  fly: !!window.__docao.predator,
}));
ok(!armedMissile.map && !armedMissile.fly && armedMissile.prompt.includes('Míssil'), `5 abates armam o míssil, sem abrir o mapa (${JSON.stringify(armedMissile)})`);
const before = await G(() => window.__docao.explosions);
await G(() => window.__docao.useStreak());
ok(await until(() => window.__docao.predator && window.__docao.predator.phase === 'fly'), 'o laptop abre e a câmera vira o míssil');
await G(() => {
  const g = window.__docao;
  g.player.pos.set(80, 0, 80);
  g.player.vel.set(0, 0, 0);
  let x = 0, z = 0, gy = 0, best = 1e9;
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
    const tx = i * 2, tz = j * 2;
    const h = g.groundAt(tx, tz, 40);
    const d = tx * tx + tz * tz;
    if (h < 0.8 && d < best && !g.collides(tx, h + 4, tz) && !g.collides(tx, h + 10, tz)) { x = tx; z = tz; gy = h; best = d; }
  }
  for (const e of g.entities) if (!e.isPlayer) { e.pos.set(70, 0, -70); e.invulnUntil = g.time + 999; e._missileTarget = false; }
  const bot = g.entities.find((e) => !e.isPlayer && e.alive);
  bot._missileTarget = true;
  bot.invulnUntil = 0;
  bot.hp = 100;
  bot.pos.set(x, gy, z);
  const p = g.predator;
  p.pos.set(x, gy + 14, z);
  p.pitch = -Math.PI / 2;
  p.yaw = 0;
  window.__drop = { x, z, gy };
});
ok(await until(() => !window.__docao.predator, 8000), 'o míssil chega no chão');
const boom = await G(() => {
  const bot = window.__docao.entities.find((e) => e._missileTarget);
  return { n: window.__docao.explosions, hp: bot ? bot.hp : -1, alive: !!(bot && bot.alive), kills: window.__docao.rewardKills, drop: window.__drop };
});
ok(boom.n >= before + 1 && !boom.alive, `o míssil estoura e mata (${JSON.stringify(boom)})`);

await G(() => { while (window.__docao.rewardKills < 7) window.__docao.rewardKill(); });
await page.waitForTimeout(200);
const heliWait = await G(() => {
  const h = window.__docao.heli;
  const prompt = document.getElementById('nukeReady')?.textContent || '';
  return { up: !!(h && h.alive), prompt, kills: window.__docao.rewardKills };
});
ok(!heliWait.up && heliWait.prompt.includes('Gavião') && heliWait.kills === 7, `7 abates deixam o helicóptero pronto (${JSON.stringify(heliWait)})`);
await callRadio();

const heliOn = await G(() => {
  const h = window.__docao.heli;
  const ready = document.getElementById('nukeReady');
  const card = document.querySelector('#streakBar .streak-card[data-need="7"]');
  return { up: !!(h && h.alive), hp: h ? Math.round(h.hp) : 0, ready: !!(ready && !ready.hidden), kills: window.__docao.rewardKills, card: card?.className || '' };
});
ok(heliOn.up && heliOn.hp >= 200 && !heliOn.ready && heliOn.kills === 7 && heliOn.card.includes('earned'), `F chama o helicóptero, sem nuke (${JSON.stringify(heliOn)})`);

await G(() => { window.__docao.rewardKill(); window.__docao.rewardKill(); window.__docao.rewardKill(); });
await page.waitForTimeout(200);
const gunReady = await G(() => ({ prompt: document.getElementById('nukeReady')?.textContent || '', ready: [...document.querySelectorAll('#streakBar .streak-card.ready')].map((c) => c.dataset.need), kills: window.__docao.rewardKills }));
ok(gunReady.kills === 10 && gunReady.prompt.includes('Chopper') && gunReady.ready.join() === '10', `10 abates armam o Chopper da granja (${JSON.stringify(gunReady)})`);
await callRadio();
const gunOn = await G(() => ({ on: !!window.__docao.gunner, hud: !document.getElementById('gunnerHud').hidden, hp: window.__docao.gunHeli && window.__docao.gunHeli.hp }));
ok(gunOn.on && gunOn.hud && gunOn.hp === 560, `F chama o Chopper e a câmera vai pra ele (${JSON.stringify(gunOn)})`);
await G(() => window.__docao.endGunner(true));
await G(() => { for (let i = 0; i < 3; i++) window.__docao.rewardKill(); });
await page.waitForTimeout(200);
const acReady = await G(() => ({ ready: [...document.querySelectorAll('#streakBar .streak-card.ready')].map((c) => c.dataset.need), bank: window.__docao.streakReady, kills: window.__docao.rewardKills }));
ok(acReady.kills === 13 && acReady.ready.join() === '13' && acReady.bank.join() === 'ac130', `13 abates armam o AC-130 Grelha (${JSON.stringify(acReady)})`);
await callRadio();
ok(await G(() => window.__docao.ac130On), 'F chama o AC-130 e a câmera vai pra ele');
await G(() => window.__docao.endAc130(true));
await G(() => { for (let i = 0; i < 2; i++) window.__docao.rewardKill(); });
await page.waitForTimeout(200);
const nukeOn = await G(() => {
  const b = document.getElementById('nukeBanner');
  const ready = document.getElementById('nukeReady');
  return { hidden: !b || b.hidden, ready: ready && !ready.hidden, kills: window.__docao.rewardKills, bots: window.__docao.entities.filter((e) => !e.isPlayer && e.alive).length };
});
ok(nukeOn.hidden && nukeOn.ready && nukeOn.kills === 15 && nukeOn.bots > 0, `15 abates armam o nuke secreto, sem estourar (${JSON.stringify(nukeOn)})`);
await G(() => window.__docao.useStreak());
await page.waitForTimeout(200);
const counting = await G(() => document.getElementById('nukeBanner')?.querySelector('b')?.textContent);
ok(counting === '5', `apertar o rádio começa a contagem (${counting})`);
const beforeDie = await G(() => window.__docao.rewardKills);
ok(beforeDie === 15, `a contagem não soma abate secreto (${beforeDie})`);
await G(() => window.__docao.kill(window.__docao.player));
const still = await G(() => ({ at: window.__docao.nukeAt > window.__docao.time, me: window.__docao.player.alive }));
ok(still.at && !still.me, `morrer depois do F não cancela a contagem (${JSON.stringify(still)})`);
ok(await until(() => window.__docao.entities.filter((e) => !e.isPlayer && e.alive).length === 0, 15000), 'a contagem do nuke acaba');
const after = await G(() => ({
  bots: window.__docao.entities.filter((e) => !e.isPlayer && e.alive).length,
  kills: window.__docao.rewardKills,
}));
ok(after.bots === 0 && after.kills === 0, `nuke mata os inimigos e não soma abate secreto (${JSON.stringify(after)})`);

// o nuke agora encerra a partida (v1.16): começa uma nova pra seguir testando os cards
await G(() => {
  const g = window.__docao;
  g.startGame('arena');
  for (const e of g.entities) { e.invulnUntil = g.time + 9999; if (!e.isPlayer) e.frozen = true; }
});
await page.waitForTimeout(400);
await G(() => { window.__docao.player.alive = true; window.__docao.player.hp = 100; window.__docao.rewardKill(); });
const mid = await G(() => {
  const card = document.querySelector('#streakBar .streak-card[data-need="3"]');
  return { n: document.querySelector('#streakCount b')?.textContent, card: card?.className || '' };
});
ok(mid.n === '1' && mid.card.includes('next'), `depois do 15 o ciclo recomeça (${JSON.stringify(mid)})`);

await G(() => window.__docao.kill(window.__docao.player));
await page.waitForTimeout(200);
const dead = await G(() => document.getElementById('streakCount').hidden);
ok(dead, 'morrer zera o número de seguidos');

// cards: sem setas; só brilha (ready) o que está guardado pra usar; o guardado sobrevive à morte
await G(() => { const g = window.__docao; g.respawn(g.player); g.player.invulnUntil = g.time + 9999; });
await page.waitForTimeout(300);
const cardState = () => G(() => ({ chev: document.querySelectorAll('#streakBar .streak-chevron').length, ready: [...document.querySelectorAll('#streakBar .streak-card.ready')].map((c) => c.dataset.need), bank: window.__docao.streakReady }));
let cs = await cardState();
ok(cs.chev === 0 && cs.ready.length === 0, `sem setas e nada brilhando sem streak guardado (${JSON.stringify(cs)})`);
await G(() => { for (let i = 0; i < 3; i++) window.__docao.rewardKill(); });
cs = await cardState();
ok(cs.ready.join() === '3' && cs.bank.join() === 'uav', `3 abates: só o Olho da granja brilha (${JSON.stringify(cs)})`);
await G(() => window.__docao.kill(window.__docao.player));
await page.waitForTimeout(200);
cs = await cardState();
ok(cs.ready.join() === '3' && cs.bank.join() === 'uav', `morreu: o streak ganho continua guardado (${JSON.stringify(cs)})`);
await G(() => { const g = window.__docao; g.respawn(g.player); g.player.invulnUntil = g.time + 9999; });
await page.waitForTimeout(300);
await G(() => window.__docao.useStreak());
cs = await cardState();
ok(cs.ready.length === 0 && cs.bank.length === 0, `renasceu e usou com F: para de brilhar (${JSON.stringify(cs)})`);

if (errors.length) console.log('erros:', errors.slice(0, 8).join('\n'));
ok(errors.length === 0, 'sem erro no console');
await browser.close();
if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
