import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.SITE || 'http://localhost:8124/');
  await page.waitForFunction(() => window.__docao);
  await page.evaluate(() => {
    document.getElementById('modeSel').value = 'arms';
    const g = window.__docao; g.startGame('arena');
    for (const e of g.entities) { e.frozen = true; e.invulnUntil = Infinity; }
    g.player.armsStage = 4; g.player.armsKills = 1;
    g.kill(g.player); // sem assassino: reproduz a ficha abrindo automaticamente
    window.armsDeathDelay = g.player.respawnAt - g.time;
  });
  assert.equal(await page.evaluate(() => window.armsDeathDelay), 3);
  await page.waitForTimeout(700);
  const hidden = async id => assert.equal(await page.locator('#' + id).isVisible(), false, id);
  for (const id of ['deathList', 'classGun', 'deathArms', 'deathGunHint']) await hidden(id);
  await page.keyboard.press('KeyB');
  await page.keyboard.press('Digit4');
  for (const id of ['deathList', 'classGun', 'deathArms', 'pauseClass']) await hidden(id);
  await page.waitForFunction(() => !document.getElementById('respawnBtn').disabled);
  assert.equal(await page.locator('#respawnBtn').isVisible(), true);
  assert.equal(await page.locator('#respawnBtn b').textContent(), 'Renascer');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__docao.player.alive);
  assert.deepEqual(await page.evaluate(() => { const p = window.__docao.player; return [p.armsStage, p.armsKills]; }), [4, 1]);
  await page.keyboard.press('Escape');
  await hidden('pauseClassBtn'); await hidden('pauseClass');
  assert.deepEqual(errors, []);
  console.log('OK: morte sem assassino, B/teclas de classe, respawn em 3 s com progresso e pausa sem classes.');
} finally { await browser.close(); }
