// Teste de tela do login: faixa Convidado/Logado, criar conta, apelido fixo, skin guardada, ranking e convidado ainda joga.
// Precisa do servidor local (wrangler dev + D1 migrado) e do site: node test-login-ui.mjs [urlSite] [urlServidor]
import { chromium } from 'playwright';
const SITE = process.argv[2] || 'http://localhost:8124/', SERVER = process.argv[3] || 'ws://127.0.0.1:8787', SHOTS = process.env.SHOTS || 'screenshots/login';
import { mkdirSync } from 'node:fs'; mkdirSync(SHOTS, { recursive: true });
const errors = [], fails = []; const ok = (c, m) => { console.log((c ? 'OK    ' : 'FALHA ') + m); if (!c) fails.push(m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = Math.random().toString(36).slice(2, 6), NICK = 'Porco' + tag;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
const url = (q = '') => `${SITE}?server=${encodeURIComponent(SERVER)}${q}`;
async function until(fn, ms = 10000, arg) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await wait(100); } return false; }
await page.goto(url(), { waitUntil: 'load' }); await wait(2000);
// convidado
ok(/Convidado/.test(await page.textContent('#acctTxt')), 'menu começa como Convidado');
ok(await page.isVisible('#acctBtn') && await page.isVisible('#rankBtn'), 'botões ENTRAR e RANKING visíveis no menu');
await page.screenshot({ path: `${SHOTS}/1-menu-convidado.png` });
// criar conta: erros de validação antes de ir pro servidor
await page.click('#acctBtn'); await page.click('#acctTabReg');
await page.fill('#acctNick', 'ab'); await page.fill('#acctPass', 'senha-forte-123'); await page.fill('#acctPass2', 'senha-forte-123'); await page.click('#acctSubmit');
ok(/apelido/i.test(await page.textContent('#acctErr')), 'apelido curto mostra erro em pt-BR');
await page.fill('#acctNick', NICK); await page.fill('#acctPass2', 'outra-coisa-123'); await page.click('#acctSubmit');
ok(/não são iguais/.test(await page.textContent('#acctErr')), 'senhas diferentes mostram erro');
await page.screenshot({ path: `${SHOTS}/2-criar-conta.png` });
await page.fill('#acctPass2', 'senha-forte-123'); await page.click('#acctSubmit');
ok(await until(() => document.getElementById('acctModal').classList.contains('hidden')), 'conta criada: janela fecha');
ok(new RegExp(NICK).test(await page.textContent('#acctTxt')), 'faixa mostra "Logado como ' + NICK + '"');
ok(await page.evaluate(() => ['nameInput', 'onlineName', 'lobbyName'].every((id) => document.getElementById(id).value && document.getElementById(id).readOnly)), 'campos de nome trancados com o apelido da conta');
ok(await page.evaluate((n) => document.getElementById('nameInput').value === n, NICK), 'campo de nome mostra o apelido');
// skin guardada: troca de visual e confere na conta
const skinId = await page.evaluate(() => { const chips = [...document.querySelectorAll('.skinchip')]; const c = chips[Math.min(4, chips.length - 1)]; return c ? c.dataset.id : null; });
if (skinId) { await page.evaluate(() => document.querySelector('[data-menu-view=operator]').click()); await wait(400); await page.evaluate((id) => { document.querySelector(`.skinchip[data-id="${id}"]`).click(); }, skinId); await wait(800); }
const tok = await page.evaluate(() => localStorage.getItem('docao.auth'));
ok(!!tok, 'token guardado no navegador');
const me = await (await fetch(SERVER.replace(/^ws/, 'http') + '/api/me', { headers: { Authorization: 'Bearer ' + tok } })).json();
ok(!skinId || me.account.skin === skinId, 'skin escolhida ficou guardada na conta (' + (me.account && me.account.skin) + ')');
// recarregar: continua logado
await page.goto(url(), { waitUntil: 'load' }); await wait(2500);
ok(new RegExp(NICK).test(await page.textContent('#acctTxt')), 'depois de recarregar continua logado');
ok(!skinId || await page.evaluate((id) => localStorage.getItem('docao.skin') === id, skinId), 'skin da conta volta ao recarregar');
// sala online com conta: nome fixo
await page.click('#onlineBtn'); await page.selectOption('#roomBots', '1'); await page.click('#createBtn');
ok(await until(() => window.__docao.online && window.__docao.online.myId > 0, 20000), 'criou sala online logado');
await wait(800);
ok(await page.evaluate((n) => (window.__docao.online.lobby?.players || []).some((p) => p.name === n && !p.bot), NICK), 'no lobby aparece o apelido da conta');
await page.screenshot({ path: `${SHOTS}/3-lobby-logado.png` });
// ranking
await page.evaluate(() => document.getElementById('lobby') && 0);
await page.goto(url(), { waitUntil: 'load' }); await wait(2000);
await page.click('#rankBtn'); await wait(800);
ok(await page.isVisible('#rankModal'), 'ranking abre pelo menu');
ok((await page.textContent('#rankBody')).length > 10, 'ranking mostra tabela ou mensagem de vazio');
await page.click('#rankModes button[data-mode=dm]'); await page.click('.rank-sort button[data-sort=wins]'); await wait(500);
await page.screenshot({ path: `${SHOTS}/4-ranking.png` });
await page.click('#rankClose');
// sair da conta → convidado
await page.click('#acctBtn'); await page.screenshot({ path: `${SHOTS}/5-minha-conta.png` }); await page.click('#acctLogout'); await wait(500); await page.click('#acctClose');
ok(/Convidado/.test(await page.textContent('#acctTxt')), 'sair da conta volta pra Convidado');
ok(await page.evaluate(() => !localStorage.getItem('docao.auth') && !document.getElementById('nameInput').readOnly), 'token apagado e nome liberado de novo');
// login com senha errada
await page.click('#acctBtn'); await page.fill('#acctNick', NICK); await page.fill('#acctPass', 'senha-errada-000'); await page.click('#acctSubmit'); await wait(800);
ok(/incorretos/.test(await page.textContent('#acctErr')), 'senha errada: mensagem genérica na tela');
await page.fill('#acctPass', 'senha-forte-123'); await page.click('#acctSubmit'); await wait(1200);
ok(new RegExp(NICK).test(await page.textContent('#acctTxt')), 'entrar com a senha certa funciona');
await page.click('#acctBtn'); await page.click('#acctLogout'); await page.click('#acctClose');
// convidado ainda joga (solo e online)
await page.fill('#nameInput', 'Visitante'); await page.press('#nameInput', 'Tab');
await page.click('#playBtn'); ok(await until(() => window.__docao && window.__docao.state === 'playing' || document.getElementById('hud') && !document.getElementById('hud').classList.contains('hidden'), 15000), 'convidado joga solo contra bots');
await page.goto(url(), { waitUntil: 'load' }); await wait(2000);
await page.fill('#nameInput', 'Visitante'); await page.press('#nameInput', 'Tab'); await page.click('#onlineBtn'); await page.click('#createBtn');
ok(await until(() => window.__docao.online && window.__docao.online.myId > 0, 20000), 'convidado cria sala online e entra');
const bad = errors.filter((e) => !/favicon|WebGL|GPU|swiftshader|status of 401/i.test(e)); ok(bad.length === 0, 'sem erros no console ' + (bad[0] || ''));
await browser.close(); console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
