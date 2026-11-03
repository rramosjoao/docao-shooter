// Safari desktop ficava mudo: dois AudioContext e o do jogo suspenso.
// Clica em Jogar, exige state === 'running', e confere tiro, passo e menu
// pelos nós que o módulo de áudio registra. Roda no WebKit e no Chromium.
// Uso: SITE=http://127.0.0.1:8123/ node test-audio-safari.mjs
import { chromium, webkit } from 'playwright';

const SITE = process.env.SITE || 'http://127.0.0.1:8123/';
const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };

function wrapAudio() {
  const Orig = window.AudioContext || window.webkitAudioContext;
  if (!Orig || window.__audioCtor) return;
  let n = 0;
  class Counted extends Orig {
    constructor(opts) { super(opts); n += 1; }
  }
  if (window.AudioContext) window.AudioContext = Counted;
  if (window.webkitAudioContext) window.webkitAudioContext = Counted;
  window.__audioCtor = () => n;
}

async function run(name, browserType, launch) {
  const errors = [];
  const browser = await browserType.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[error] ' + m.text()); });
  await page.addInitScript(wrapAudio);
  await page.addInitScript((vol) => {
    localStorage.setItem('docao.vol', vol);
    localStorage.setItem('docao.primary', '0');
    localStorage.setItem('docao.map', 'arena');
    localStorage.setItem('docao.mode', 'explore');
  }, name === 'webkit' ? '0' : 'NaN');
  await page.goto(SITE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__audio && window.__docao, null, { timeout: 20000 });
  const before = await page.evaluate(() => ({ made: window.__audioCtor(), count: window.__audio.count, state: window.__audio.state }));
  ok(before.made === 0 && before.count === 0 && before.state === 'none', `${name}: contexto ainda não existe antes do gesto (${JSON.stringify(before)})`);
  await page.selectOption('#modeSel', 'explore');
  await page.click('#playBtn');
  await page.waitForFunction(() => window.__docao.state === 'playing' && window.__audio.state === 'running', null, { timeout: 20000 });
  const started = await page.evaluate(() => ({
    state: window.__audio.state,
    made: window.__audioCtor(),
    count: window.__audio.count,
    master: window.__audio.master(),
    menu: window.__audio.log.filter((r) => r.kind === 'menu').length,
    nodes: window.__audio.log.filter((r) => r.kind === 'menu').map((r) => r.node),
  }));
  ok(started.state === 'running', `${name}: AudioContext.state === 'running' depois do clique (${started.state})`);
  ok(started.made === 1 && started.count === 1, `${name}: um único AudioContext (${started.made} ctor, ${started.count} no módulo)`);
  ok(started.master > 0.2 && started.master < 0.5, `${name}: volume 0/NaN no localStorage não zera o master (${started.master})`);
  ok(started.menu > 0 && started.nodes.includes('osc'), `${name}: som de menu criou nó (${JSON.stringify(started)})`);
  await page.keyboard.down('KeyW');
  await page.waitForFunction(() => window.__audio.log.some((r) => r.kind === 'step'), null, { timeout: 8000 });
  await page.keyboard.up('KeyW');
  const steps = await page.evaluate(() => window.__audio.log.filter((r) => r.kind === 'step').map((r) => r.node));
  ok(steps.includes('noise') && steps.includes('osc'), `${name}: passo criou nós (${steps.join(',')})`);
  const shots0 = await page.evaluate(() => window.__audio.log.filter((r) => r.kind === 'shot').length);
  await page.mouse.move(640, 360);
  await page.mouse.down();
  await page.waitForTimeout(280);
  await page.mouse.up();
  await page.waitForFunction((n) => window.__audio.log.filter((r) => r.kind === 'shot').length > n, shots0, { timeout: 5000 });
  const shots = await page.evaluate(() => window.__audio.log.filter((r) => r.kind === 'shot').map((r) => r.node));
  ok(shots.includes('noise') && shots.includes('osc'), `${name}: tiro criou nós (${shots.join(',')})`);
  const probe = await page.evaluate(() => window.__audio.probe());
  ok(probe.boom.length === 0 && probe.state === 'running', `${name}: rampa inválida e trenó não derrubam o áudio (${JSON.stringify(probe)})`);
  const audioErr = errors.filter((e) => /audio|InvalidState|NotAllowed|exponential|AudioContext/i.test(e));
  ok(audioErr.length === 0 && !errors.some((e) => e.startsWith('[pageerror]')), `${name}: sem erro de áudio no console${errors.length ? ' — ' + errors.slice(0, 6).join(' | ') : ''}`);
  if (errors.length && audioErr.length === 0) console.log(name + ' outros erros de console:', errors.slice(0, 8).join(' | '));
  await browser.close();
}

const gpu = { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
await run('webkit', webkit, {});
await run('chromium', chromium, gpu);
if (fails.length) { console.error('\n' + fails.length + ' falha(s)'); process.exit(1); }
console.log('\ntudo ok');
