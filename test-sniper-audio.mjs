// As três snipers tocam amostra sintetizada (perto, longe, ferrolho, recarga) sem estourar o master.
import { chromium } from 'playwright';

const SITE = process.env.SITE || 'http://127.0.0.1:8124/';
let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'ok' : 'FALHOU'}  ${msg}`); if (!cond) failed++; };

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...args) {
    const ctx = this.context;
    if (dest && ctx && dest === ctx.destination) {
      if (!ctx.__tap) {
        const tap = ctx.createGain();
        const proc = ctx.createScriptProcessor(4096, 1, 1);
        let peak = 0;
        proc.onaudioprocess = (e) => {
          const c = e.inputBuffer.getChannelData(0);
          for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
          window.__outPeak = peak;
        };
        tap.connect(proc);
        orig.call(proc, ctx.destination);
        ctx.__tap = tap;
      }
      return orig.call(this, ctx.__tap, ...args);
    }
    return orig.call(this, dest, ...args);
  };
});
await page.goto(SITE, { waitUntil: 'load' });
await page.evaluate(() => { const s = document.getElementById('modeSel'); s.value = 'explore'; s.dispatchEvent(new Event('change')); });
await page.click('#playBtn');
await page.waitForFunction(() => window.__docao && window.__docao.state === 'playing', null, { timeout: 20000 });
const ready = await page.waitForFunction(() => window.__docao.sniperAudioReady(), null, { timeout: 8000 }).then(() => true).catch(() => false);
ok(ready, 'amostras das três snipers decodificadas antes do tiro');

const guns = [['sniper', 2], ['canhao', 5], ['carabina', 6]];
for (const [key, idx] of guns) {
  await page.evaluate((idx) => {
    const g = window.__docao, p = g.player;
    g.setPrimary(idx);
    p.primary = p.nextPrimary = idx; p.slots[0] = idx;
    p.mag[idx] = g.WEAPONS[idx].mag; p.reserve[idx] = g.WEAPONS[idx].reserve;
    p.reloadEnd = 0; p.nextFire = 0;
    if (p.weapon !== idx) g.switchWeapon(p, idx);
    else p.switchEnd = g.time;
  }, idx);
  // O saque leva ~0,4 s de tempo de jogo; no headless o relógio anda mais devagar que o da parede.
  await page.waitForFunction((idx) => {
    const p = window.__docao.player;
    return p.weapon === idx && p.switchEnd <= window.__docao.time;
  }, idx, { timeout: 8000 });
  const before = await page.evaluate(() => (window.__sniperSfxLog || []).length);
  await page.evaluate(() => document.querySelector('canvas').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, buttons: 1 })));
  await page.waitForTimeout(280);
  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 })));
  await page.waitForTimeout(200);
  await page.evaluate((idx) => {
    const p = window.__docao.player;
    if (p.mag[idx] >= window.__docao.WEAPONS[idx].mag) p.mag[idx] = Math.max(0, window.__docao.WEAPONS[idx].mag - 1);
  }, idx);
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(250);
  const far = await page.evaluate((key) => window.__docao.sniperHeard(key, 36), key);
  ok(far === true, `${key}: tiro longe (32 m+) passou pelo caminho novo`);
  const log = await page.evaluate((n) => (window.__sniperSfxLog || []).slice(n), before);
  const shot = log.find((e) => e.ev === 'shot' && e.dist === 0);
  const bolt = log.find((e) => e.ev === 'bolt' && e.dist === 0);
  const reload = log.find((e) => e.ev === 'reload');
  const farShot = log.find((e) => e.ev === 'shot' && e.dist >= 30);
  ok(!!shot && shot.key === key && shot.far === 0, `${key}: tiro perto usa a amostra seca (${JSON.stringify(shot)})`);
  ok(!!bolt && bolt.key === key, `${key}: ferrolho no tempo da animação`);
  ok(!!reload && reload.key === key, `${key}: recarga própria`);
  ok(!!farShot && farShot.far >= 0.7, `${key}: longe cruza pro arquivo abafado (${JSON.stringify(farShot)})`);
}
const peak = await page.evaluate(() => window.__outPeak || 0);
ok(peak > 0.05 && peak < 0.95, `saída do master sem clip (pico ${peak.toFixed(3)})`);
ok(errors.length === 0, `sem erro de página${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
if (failed) { console.log(failed + ' falha(s)'); process.exit(1); }
console.log('snipers ok');
