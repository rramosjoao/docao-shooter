// Indicador de direção do dano: arco na borda apontando pro atacante, vários marcadores, fade, sem origem = só flash, nada morto. Uso: node tools/test-dano-dir.mjs [urlDoSite] [shot.png]
import { chromium } from 'playwright';
const SITE = process.argv[2] || 'http://127.0.0.1:8170/', SHOT = process.argv[3] || 'screenshots/dano-direcao.png';
const fails = [], errors = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { localStorage.setItem('docao.name', 'Matheus'); });
await page.goto(SITE, { waitUntil: 'load' }); await page.waitForTimeout(3000);
const G = (f, a) => page.evaluate(f, a), wait = (ms) => page.waitForTimeout(ms);
await page.selectOption('#modeSel', 'dm'); await page.click('#playBtn'); await wait(2500);
// jogador parado olhando pra +x (a câmera olha (-sin yaw, -cos yaw): yaw = -π/2)
const hit = (dx, dz, who) => G(([dx, dz]) => { const g = window.__docao, p = g.player; p.invulnUntil = 0; p.hp = 100; const k = g.entities.find((e) => !e.isPlayer && e.alive); k.pos.set(p.pos.x + dx, p.pos.y, p.pos.z + dz); k.vel.set(0, 0, 0); g.damage(p, 5, k, 0, false); }, [dx, dz]);
await G(() => { const g = window.__docao, p = g.player; p.yaw = -Math.PI / 2; p.pitch = 0; window.__stopAt = null; });
const rot = () => G(() => [...document.querySelectorAll('#hitDirs .hitmark')].map((e) => { const m = /rotate\(([-\d.e]+)rad\)/.exec(e.style.transform); return m ? +(+m[1]).toFixed(2) : null; }));
await hit(8, 0); await wait(250);
let r = await rot(); ok(r.length === 1 && Math.abs(r[0]) < 0.15, `atacante na frente → marcador no topo (${JSON.stringify(r)})`);
await hit(0, 8); await wait(250);   // +z: pra direita de quem olha pra +x? right = (-fz, fx) = (0,1) → +z é a direita
r = await rot(); ok(r.length === 2 && Math.abs(r[1] - Math.PI / 2) < 0.2, `atacante à direita → marcador a 90° (${JSON.stringify(r)})`);
await hit(-8, 0); await wait(250);
r = await rot(); ok(r.length === 3 && Math.abs(Math.abs(r[2]) - Math.PI) < 0.2, `atacante atrás → marcador embaixo; 3 marcadores ao mesmo tempo (${JSON.stringify(r)})`);
await hit(8, 2); await wait(250); ok((await rot()).length === 3, 'golpe de direção parecida (≤30°) funde no mesmo arco (fusão, PR #15)');
await G(() => { const g = window.__docao, p = g.player; p.yaw = 0; }); await wait(300);
const r2 = await rot(); ok(r2[0] !== r[0], `o arco gira quando o jogador vira (${r[0]} → ${r2[0]})`);
await G(() => { window.__docao.player.yaw = -Math.PI / 2; }); await wait(200);
await page.screenshot({ path: SHOT });
// sem origem (névoa/dano próprio): sem marcador
await G(() => { const g = window.__docao, p = g.player; const n = document.querySelectorAll('#hitDirs .hitmark').length; window.__n0 = n; g.damage(p, 3, p, 0, false); g.damage(p, 3, { fog: true, pos: p.pos, name: 'Névoa' }, 0, false); });
await wait(200); ok((await G(() => document.querySelectorAll('#hitDirs .hitmark').length)) === (await G(() => window.__n0)), 'sem origem conhecida (dano próprio/névoa): não cria marcador (só o flash)');
// fade ~1,5 s de tempo de jogo
const t0 = await G(() => window.__docao.time); await page.waitForFunction((t) => window.__docao.time - t > 1.7, t0, { timeout: 60000 }); await wait(300);
ok((await G(() => document.querySelectorAll('#hitDirs .hitmark').length)) === 0, 'marcadores somem sozinhos em ~1,5 s');
// morto: nada
await hit(8, 0); await G(() => { const g = window.__docao, p = g.player, k = g.entities.find((e) => !e.isPlayer && e.alive); g.damage(p, 500, k, 0, false); }); await wait(400);
ok((await G(() => document.querySelectorAll('#hitDirs .hitmark').length)) === 0, 'morto: nenhum marcador na tela');
ok(errors.length === 0, 'sem erro no console' + (errors.length ? ': ' + errors.slice(0, 2).join(' | ') : ''));
await browser.close(); console.log(fails.length ? 'FALHOU ' + fails.length : 'TUDO OK'); process.exit(fails.length ? 1 : 0);
