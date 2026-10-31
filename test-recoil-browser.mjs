// SITE=http://127.0.0.1:8132 node test-recoil-browser.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.SITE || 'http://127.0.0.1:8132');
  await page.waitForFunction(() => !!window.__docao, null, { timeout: 120000 });
  await page.selectOption('#modeSel', 'explore');
  await page.evaluate(() => window.__docao.startGame('arena'));
  // O handler de mouse exige pointer lock. Simula somente o estado do navegador;
  // as entradas, tiros e atualização da câmera passam pelo jogo real.
  await page.evaluate(() => Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => document.getElementById('game') }));
  const waitGame = async (seconds) => {
    const end = await page.evaluate((s) => window.__docao.time + s, seconds);
    await page.waitForFunction((t) => window.__docao.time >= t, end, { timeout: 120000 });
  };
  const shoot = async (weapon, count, scope = false) => {
    await page.evaluate((w) => {
      const g = window.__docao, p = g.player;
      g.setWeaponOf(p, w); p.mag[w] = g.WEAPONS[w].mag; p.reloadEnd = p.switchEnd = 0;
      p.pitch = p.yaw = 0; p.recoil = null; p.invulnUntil = 1e9;
    }, weapon);
    if (scope) {
      await page.evaluate(() => document.getElementById('game').dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true })));
      await page.waitForFunction(() => window.__docao.scoped, null, { timeout: 120000 });
    }
    await page.evaluate(() => document.getElementById('game').dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })));
    await page.waitForFunction((n) => (window.__docao.player.recoil?.shots || 0) >= n, count, { timeout: 120000 });
    return page.evaluate(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
      document.dispatchEvent(new MouseEvent('mouseup', { button: 2 }));
      const g = window.__docao; return { pitch: g.player.pitch, yaw: g.player.yaw, dir: window.__lastShot.dir, key: g.player.recoil.key, gain: g.player.recoil.profile.gain };
    });
  };
  const spray = await shoot(0, 6);
  assert.ok(spray.pitch > 0.05 && spray.dir[1] > 0.02, 'spray eleva a mira e a direção dos tiros');
  await waitGame(1.4);
  const rest = await page.evaluate(() => ({ pitch: window.__docao.player.pitch, yaw: window.__docao.player.yaw }));
  assert.ok(Math.abs(rest.pitch) < 0.001 && Math.abs(rest.yaw) < 0.001, 'recupera suavemente após soltar');
  console.log('OK spray do fuzil altera os tiros e recupera após a pausa');
  await shoot(0, 5);
  const corrected = await page.evaluate(() => {
    document.dispatchEvent(new MouseEvent('mousemove', { movementX: 80, movementY: 35 }));
    const p = window.__docao.player; return { pitch: p.pitch, yaw: p.yaw, debt: p.recoil.pitch };
  });
  assert.equal(corrected.debt, 0);
  await waitGame(1.2);
  const stable = await page.evaluate(() => ({ pitch: window.__docao.player.pitch, yaw: window.__docao.player.yaw }));
  assert.ok(Math.abs(stable.pitch - corrected.pitch) < 1e-8 && Math.abs(stable.yaw - corrected.yaw) < 1e-8);
  console.log('OK correção manual fica na direção escolhida, sem retorno pendente');
  for (const w of [2, 23]) {
    const shot = await shoot(w, 1);
    assert.ok(shot.pitch > 0, `arma ${w} com recoil real`);
    await waitGame(1.7);
    assert.ok(Math.abs(await page.evaluate(() => window.__docao.player.pitch)) < 0.001);
    console.log(`OK recoil e recuperação da arma ${w} (${shot.key})`);
  }
  for (const w of [21, 22]) {
    const shot = await shoot(w, 5);
    assert.ok(shot.pitch > 0.1 && shot.dir[1] > 0.06, `${shot.key}: rajada deve elevar a câmera e os tiros`);
    await waitGame(1.5);
    console.log(`OK ${shot.key}: cinco tiros levantam a mira ${(shot.pitch * 180 / Math.PI).toFixed(1)}°`);
  }
  for (const w of [5, 6]) {
    const hip = await shoot(w, 1);
    assert.ok(hip.pitch > (w === 5 ? 0.15 : 0.07), `${hip.key}: tranco sem luneta`);
    await waitGame(2);
    const scope = await shoot(w, 1, true);
    assert.equal(scope.gain, 0.85, 'ferrolho não pode aplicar ganho sem luneta ao tiro que saiu com luneta');
    assert.ok(scope.pitch < hip.pitch);
    await waitGame(2);
    console.log(`OK ${hip.key}: tranco sem luneta reforçado, coice com luneta preservado`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
