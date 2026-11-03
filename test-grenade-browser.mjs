// SITE=http://127.0.0.1:8124 CHROMIUM_EXECUTABLE=/usr/bin/chromium node test-grenade-browser.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.SITE || 'http://127.0.0.1:8124');
  await page.waitForFunction(() => !!window.__docao, null, { timeout: 120000 });
  await page.selectOption('#modeSel', 'explore');
  await page.evaluate(() => window.__docao.startGame('arena'));
  for (const scenario of [
    { name: 'toque curto', charge: 0.01 },
    { name: 'meia carga andando', charge: 0.6, moving: true },
    { name: 'carga máxima', charge: 1.3 },
    { name: 'agachado junto à parede', charge: 1.3, wall: true, crouch: true },
    { name: 'zoom e mira para cima', charge: 0.6, fov: 40, pitch: 0.7 },
    { name: 'Pokébola', charge: 0.6, poke: true },
  ]) {
    await page.evaluate((s) => {
      const g = window.__docao, p = g.player;
      p.nades = 3; p.pokeballs = s.poke ? 1 : 0; p.pos.set(-25, 0, s.wall ? -g.map.size[1] + 0.45 : -22); p.vel.set(0, 0, 0);
      p.yaw = 0; p.pitch = s.pitch || 0; p.invulnUntil = 1e9;
    }, scenario);
    if (scenario.crouch) await page.keyboard.down('ShiftLeft');
    if (scenario.moving) await page.keyboard.down('KeyD');
    await page.waitForTimeout(250);
    // Freeze charge and release within one JS turn: preview and launch must agree exactly.
    const result = await page.evaluate((s) => {
      const g = window.__docao, p = g.player;
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
      p.chargeStart = g.time - s.charge;
      if (s.fov) { g.camera.fov = s.fov; g.camera.updateProjectionMatrix(); }
      return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
        const aim = g.grenadeAim;
        document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ' }));
        const n = g.grenades.at(-1), initial = { pos: n.pos.toArray(), vel: n.vel.toArray() };
        const projected = n.pos.clone().project(g.camera).toArray();
        const hold = { marker: aim.marker, points: aim.points, initial, velocity: aim.velocity, projected, visible: aim.visible, blocked: g.PHYS.nadeBlocked(n.pos.x, n.pos.y, n.pos.z) };
        window.__grenadeUnderTest = { n, hold };
        resolve(hold);
      })));
    }, scenario);
    const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
    assert.ok(result.visible);
    assert.equal(result.blocked, false, 'origem fora da parede, inclusive com a mão atravessando a superfície');
    assert.ok(distance(result.velocity, result.initial.vel) < 1e-8, `${scenario.name}: força da preview e lançamento`);
    assert.ok(distance(result.points.slice(0, 3), result.initial.pos) < 1e-4, `${scenario.name}: origem da preview e lançamento`);
    assert.ok(result.projected.every(Number.isFinite));
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => window.__docao.grenadeAim.cupVisible), false, 'sem segundo copo voando na camada da mão');
    await page.waitForFunction(() => !window.__docao.grenades.includes(window.__grenadeUnderTest.n), null, { timeout: 120000 });
    const actual = await page.evaluate(() => window.__grenadeUnderTest.n.pos.toArray());
    const endpoint = result.points.slice(-3);
    assert.ok(distance(actual, endpoint) < 1e-4, `${scenario.name}: explosão real ${actual} ≠ previsão ${endpoint}`);
    assert.ok(Math.abs(result.marker[0] - actual[0]) < 1e-5 && Math.abs(result.marker[2] - actual[2]) < 1e-5);
    if (scenario.crouch) await page.keyboard.up('ShiftLeft');
    if (scenario.moving) await page.keyboard.up('KeyD');
    console.log(`OK ${scenario.name}: origem e explosão coincidem com a preview`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
