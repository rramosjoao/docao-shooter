// SITE=http://localhost:8124/ node test-match-end.mjs
// Online exercises the real message handler with a controlled WebSocket peer.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', e => errors.push(e.message));
page.setDefaultTimeout(180000); // máquina lenta (swiftshader)
const site = process.env.SITE || 'http://localhost:8124/';
const hidden = id => page.locator(`#${id}`).isHidden();
const read = () => page.evaluate(() => {
  const g = window.__docao;
  return { state: g.state, time: g.time, pos: g.player.pos.toArray(), camera: g.camera.position.toArray(), rotation: g.camera.quaternion.toArray(), fov: g.fov,
    scores: g.entities.map(e => [e.kills, e.deaths, e.hp, e.caps]), board: document.getElementById('finalboard').innerHTML,
    elapsed: g.ending?.elapsed, title: document.getElementById('resultTitle').textContent };
});
const start = async (mode = 'dm') => {
  await page.evaluate(mode => {
    document.getElementById('modeSel').value = mode;
    window.__docao.startGame('arena');
    for (const e of window.__docao.entities) { e.frozen = true; e.invulnUntil = Infinity; }
    const g = window.__docao, p = g.player;
    outer: for (let x = -24; x < 24; x += 2) for (let z = -24; z < 24; z += 2) {
      const y = g.groundAt(x, z, 0.3);
      if ([0, 0.5, 1, 1.5, 2].every(dx => !g.collides(x + dx, y, z)) && !g.collides(x, y, z - 2)) { p.pos.set(x, y, z); break outer; }
    }
    p.vel.set(0, 0, 0); p.yaw = 0; p.pitch = 0;
  }, mode);
  await page.waitForTimeout(100);
};
const end = async (outcome = 'win') => page.evaluate(outcome => {
  const g = window.__docao;
  g.player.vel.set(4, 0, 0);
  for (const e of g.entities) { e.kills = 0; e.deaths = 0; }
  if (g.mode === 'dom') { g.teamScore[g.player.team] = outcome === 'win' ? 5 : outcome === 'loss' ? 2 : 3; g.teamScore[1 - g.player.team] = outcome === 'win' ? 2 : outcome === 'loss' ? 5 : 3; }
  else if (outcome !== 'draw') (outcome === 'win' ? g.player : g.entities[1]).kills = 20;
  const before = { pos: g.player.pos.toArray(), camera: g.camera.position.toArray(), rotation: g.camera.quaternion.toArray(), fov: g.fov };
  g.endGame();
  return before;
}, outcome);
try {
  await page.goto(site);
  await page.waitForFunction(() => !!window.__docao && window.__thumbsReady);
  await page.evaluate(() => { window.__endDt = 1 / 60; }); // a transição anda como a 60 FPS mesmo com o swiftshader lento
  await start();
  const before = await end();
  await page.keyboard.down('KeyW');
  const initial = await read();
  assert.equal(initial.state, 'over'); assert.equal(initial.title, 'VITÓRIA!');
  assert.deepEqual(initial.rotation, before.rotation); assert.equal(initial.fov, before.fov);
  assert.equal(await hidden('gameover'), true); assert.equal(await hidden('matchResult'), false);
  await page.evaluate(() => { const g = window.__docao; g.entities[1].invulnUntil = -1; g.damage(g.entities[1], 10000, g.player, 0, false); g.endGame(); });
  await page.waitForFunction(() => window.__docao.ending.elapsed >= 0.35);
  const slow = await read();
  assert(slow.pos[0] > before.pos[0], `existing movement continues: ${JSON.stringify({ before: before.pos, slow: slow.pos, elapsed: slow.elapsed })}`);
  assert(slow.pos[0] - before.pos[0] <= 1.5, 'movement is slowed');
  assert.deepEqual(slow.rotation, initial.rotation); assert.equal(slow.time, initial.time);
  assert.deepEqual(slow.scores, initial.scores); assert.equal(slow.board, initial.board);
  assert(slow.elapsed >= initial.elapsed, 'duplicate end does not restart transition');
  await page.waitForFunction(() => !document.getElementById('gameover').classList.contains('hidden'));
  assert.equal(await hidden('matchResult'), true);
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/docao-match-end-menu.png' });
  // placar já na tela e a dança ainda não começou: a visão continua a do jogador até a câmera lenta acabar
  assert.equal(await page.evaluate(() => document.getElementById('gameover').classList.contains('dancing')), false);
  await page.waitForFunction(() => window.__docao.ending.elapsed >= window.__docao.ending.duration);
  // venceu: quando a câmera lenta acaba, a dança da vitória entra (main v1.11)
  await page.waitForFunction(() => document.getElementById('gameover').classList.contains('dancing'));
  await page.keyboard.up('KeyW');
  await page.click('#againBtn');
  assert.equal((await read()).state, 'playing');
  assert.equal(await page.evaluate(() => document.body.classList.contains('match-ended')), false);
  console.log('OK slow motion, fixed view, frozen rules, delayed menu, duplicate end and restart');

  for (const mode of ['dm', 'dom']) for (const outcome of ['win', 'loss', 'draw']) {
    await start(mode); await end(outcome);
    assert.equal((await read()).title, {win:'VITÓRIA!', loss:'DERROTA', draw:'EMPATE!'}[outcome]);
  }
  console.log('OK victory, defeat and draw in both modes');

  await start();
  await page.evaluate(() => { const g = window.__docao; g.player.kills = 19; const rival = g.entities[1]; rival.invulnUntil = -1; g.damage(rival, 1000, g.player, 0, false); });
  assert.equal((await read()).state, 'over'); assert.equal((await read()).title, 'VITÓRIA!');
  for (const mode of ['dm', 'dom']) {
    await start(mode);
    await page.evaluate(() => { const g = window.__docao; g.time = g.mode === 'dom' ? g.DOM.TIME_LIMIT_DOM : 300; });
    await page.waitForFunction(() => window.__docao.state === 'over');
    assert.equal((await read()).title, 'EMPATE!');
  }
  await start('dom');
  await page.evaluate(() => {
    const g = window.__docao, p = g.player, z = g.zone;
    g.teamScore[p.team] = g.DOM.WIN_CAPS - 1; z.team = p.team; z.progress = 0.9999;
    p.pos.set(z.x, z.y, z.z); p.vel.set(0, 0, 0);
    for (const e of g.entities) if (!e.isPlayer) { e.pos.set(-30, 0, -30); e.vel.set(0, 0, 0); }
  });
  await page.waitForFunction(() => window.__docao.state === 'over');
  assert.equal((await read()).title, 'VITÓRIA!');
  console.log('OK automatic kill limit, time limits and final zone capture');

  await page.evaluate(() => window.__docao.setPrimary(2));
  await start(); await page.mouse.move(480, 270); await page.mouse.down({ button: 'right' }); await page.waitForTimeout(250); // mira é no botão direito (Shift agacha)
  const aimed = await end(); assert(aimed.fov < 75); assert.equal((await read()).fov, aimed.fov);
  await page.waitForTimeout(200); assert.equal((await read()).fov, aimed.fov); await page.mouse.up({ button: 'right' });
  console.log('OK aiming FOV preserved');
  await page.evaluate(() => window.__docao.setPrimary(0));

  await start();
  await page.evaluate(() => { const g = window.__docao; g.kill(g.player); });
  await page.waitForTimeout(100);
  const deadBefore = await end('loss'); await page.waitForTimeout(250);
  assert.deepEqual((await read()).rotation, deadBefore.rotation);
  assert.deepEqual((await read()).camera, deadBefore.camera);
  assert.equal(await hidden('deathpick'), true);
  console.log('OK death camera held without respawn or weapon menu');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(); await end(); assert.equal(await hidden('gameover'), false);
  const reduced = await read(); await page.waitForTimeout(150); { const now = (await read()).camera; assert.ok(now.every((v, i) => Math.abs(v - reduced.camera[i]) < 0.05), `câmera parada no movimento reduzido (tolerância 0,05): ${now} vs ${reduced.camera}`); }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  console.log('OK reduced motion');

  // Inject server messages into the real client handler; no deployed Worker is used.
  await page.routeWebSocket('**/ws/**', ws => { ws.onMessage(msg => { if (msg === 'ping') ws.send('pong'); }); });
  await page.evaluate(() => {
    const g = window.__docao; g.joinRoom('TEST');
    const receive = m => g.online.net.h.onMessage(m);
    receive({ t: 'welcome', id: 1, hostId: 1, cfg: {} });
    const skin = g.player.skinId;
    receive({ t: 'start', map: 'arena', mode: 'dm', T: 12, ents: [{ id: 1, name: 'Você', skin, kills: 0, deaths: 0 }, { id: 2, name: 'Rival', skin, kills: 0, deaths: 0 }] });
    receive({ t: 's', T: 12, ev: [['sp', 1, [-28, 0, -28], 0, 0, 1], ['sp', 2, [-24, 0, -28], 0, 0, 1]], e: [] });
    g.player.vel.set(4, 0, 0);
    receive({ t: 'end', mode: 'dm', map: 'arena', next: 'arena', board: [[1, 'Você', 20, 1, false, -1, 0], [2, 'Rival', 12, 3, false, -1, 0]], winner: 1 });
  });
  const online = await read(); assert.equal(online.title, 'VITÓRIA!');
  await page.evaluate(() => window.__docao.online.net.h.onMessage({ t: 's', T: 99, ev: [['sp', 1, [0, 0, 0], 0, 0, 2]], e: [] }));
  await page.waitForTimeout(300);
  assert.equal((await read()).time, online.time); assert.deepEqual((await read()).scores, online.scores);
  await page.waitForFunction(() => !document.getElementById('gameover').classList.contains('hidden'));
  assert.equal(await hidden('againBtn'), false);
  await page.click('#menuBtn'); assert.equal((await read()).state, 'menu');
  assert.equal(await page.evaluate(() => window.__docao.ending), null);
  console.log('OK online result handler, late snapshot ignored, host controls and exit');
  assert.deepEqual(errors, []);
  console.log('ALL MATCH END TESTS PASSED');
} finally { await browser.close(); }
