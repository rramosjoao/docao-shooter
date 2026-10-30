// Tela do Brechó da Porca Véia: convidado é convidado a entrar; conta compra parte (servidor decide), personaliza com prévia 3D, salva, e o visual volta depois de recarregar.
// Precisa do servidor local (wrangler dev + D1 com 0001 e 0002) e do site: node test-loja-ui.mjs [urlSite] [urlServidor]   (SÓ LOCAL)
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const SITE = process.argv[2] || 'http://localhost:8124/', SERVER = process.argv[3] || 'ws://127.0.0.1:8787', SHOTS = process.env.SHOTS || 'screenshots/loja'; mkdirSync(SHOTS, { recursive: true });
const errors = [], fails = []; const ok = (c, m) => { console.log((c ? 'OK    ' : 'FALHA ') + m); if (!c) fails.push(m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = Math.random().toString(36).slice(2, 6), NICK = 'Brecho' + tag;
const sql = (q) => JSON.parse(execSync(`cd server && npx wrangler d1 execute docao-contas --local --json --command "${q}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))[0].results;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
const url = `${SITE}?server=${encodeURIComponent(SERVER)}`;
async function until(fn, ms = 10000, arg) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await wait(100); } return false; }
const vis = (s) => page.isVisible(s);
await page.goto(url, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__docao, null, { timeout: 120000 }); await wait(1500);
// convidado
ok(await vis('#dailyPanel [data-daily-enter]') && /Desafios do dia/.test(await page.textContent('#dailyPanel')), 'menu (convidado): painel dos desafios convida a entrar na conta');
ok(await vis('#closetBtn') && /BRECHÓ/.test(await page.textContent('#closetBtn')), 'botão 🧺 BRECHÓ aparece no menu');
ok(/Brechó da Porca Véia/.test(await page.textContent('#closetTitle')), 'título da janela: Brechó da Porca Véia');
await page.click('#closetBtn');
ok(await vis('#closetGuest') && !(await vis('#closetMain')), 'convidado: o Brechó só convida a entrar na conta (não salva, não compra)');
await page.screenshot({ path: `${SHOTS}/1-guest.png` });
await page.click('#closetLogin'); ok(await vis('#acctModal'), 'convite abre a janela de conta');
await page.click('#acctTabReg'); await page.fill('#acctNick', NICK); await page.fill('#acctPass', 'senha-forte-123'); await page.fill('#acctPass2', 'senha-forte-123'); await page.click('#acctSubmit');
ok(await until(() => document.getElementById('acctModal').classList.contains('hidden')), 'conta criada');
ok(await until(() => document.querySelectorAll('#dailyPanel .daily-row').length === 3), 'menu (conta): painel mostra os 3 desafios do dia');
ok(/\d+\/\d+/.test(await page.textContent('#dailyPanel .daily-row')) && /🪙 \d+/.test(await page.textContent('#dailyPanel')) && /novos em/.test(await page.textContent('#dailyPanel')), 'painel: progresso x/meta, prêmio em Docoins e contagem até o reset');
ok(!/Logado como/.test(await page.textContent('#acctTxt')), 'faixa da conta enxuta (sem "Logado como")');
ok(/500<\/b>\s*Docoins|🪙\s*500\s*Docoins/.test(await page.innerHTML('#acctTxt')), 'faixa do menu mostra os 500 Docoins iniciais');
// Brechó com conta
await page.click('#closetBtn'); await until(() => !document.getElementById('closetMain').classList.contains('hidden'));
ok(await vis('#closetMain') && await vis('#closetCanvas'), 'conta: o Brechó abre com prévia 3D');
ok(/🪙\s*500/.test(await page.textContent('#closetWallet')), 'conta nova: carteira começa com 500 Docoins');
await page.click('#closetClose');
const id = sql(`SELECT id FROM accounts WHERE nick = '${NICK}'`)[0].id;
sql(`UPDATE accounts SET coins = 0 WHERE id = ${id}`);
await page.click('#closetBtn'); await until(() => /🪙\s*0/.test(document.getElementById('closetWallet').textContent), 8000);
ok(/🪙\s*0/.test(await page.textContent('#closetWallet')), 'saldo zerado no teste: carteira mostra 0');
await page.click('#closetTabShop');
ok((await page.$$('#closetShop .closet-card')).length >= 30, 'loja lista as partes (30+)');
ok(await page.isDisabled('[data-buy="h1"]') && /FALTAM 60/.test(await page.textContent('[data-buy="h1"]')), 'sem Docoins o botão de comprar fica travado ("FALTAM 60")');
await page.click('[data-try="h3"]'); ok(await page.evaluate(() => document.querySelector('[data-try="h3"]').classList.contains('try')), 'clicar no cartão experimenta a parte na prévia (sem comprar)');
await page.click('[data-try="h3"]');
await page.click('#closetClose');
// ganha Docoins "jogando": no teste, coloca saldo direto no D1 LOCAL
sql(`UPDATE accounts SET coins = 200 WHERE id = ${id}`);
await page.click('#closetBtn'); await until(() => /200/.test(document.getElementById('closetWallet').textContent), 8000);
ok(/200/.test(await page.textContent('#closetWallet')), 'ao abrir, o saldo vem do servidor (200)');
await page.click('#closetTabShop'); await page.screenshot({ path: `${SHOTS}/2-loja.png` });
ok(!(await page.isDisabled('[data-buy="h1"]')), 'com saldo o botão COMPRAR libera');
await page.click('[data-buy="h1"]');
ok(await vis('#closetBuyAsk') && /Deseja comprar Boné do Churrasqueiro por 60 Docoins\?/.test(await page.textContent('#closetBuyAskText')), 'compra pede confirmação antes de gastar');
await page.click('#closetBuyNo');
ok(!(await vis('#closetBuyAsk')) && /🪙\s*200/.test(await page.textContent('#closetWallet')) && /COMPRAR/.test(await page.textContent('[data-buy="h1"]')), 'cancelar não compra e não mexe no saldo');
await page.click('[data-buy="h1"]');
await page.click('#closetBuyYes');
ok(await until(() => /NA MOCHILA/.test(document.querySelector('[data-buy="h1"]').textContent), 8000), 'compra feita: cartão vira "NA MOCHILA"');
ok(/🪙\s*140/.test(await page.textContent('#closetWallet')), 'saldo caiu pra 140 (preço decidido pelo servidor)');
ok(sql(`SELECT coins FROM accounts WHERE id = ${id}`)[0].coins === 140 && sql(`SELECT item FROM inventory WHERE account_id = ${id}`).length === 1, 'D1 confirma: 140 Docoins e 1 item na mochila');
// personalizar
await page.click('#closetTabLook');
ok(await vis('[data-slot="h"][data-item="h1"]') && !(await vis('[data-slot="h"][data-item="h3"]')), 'personalizador só oferece partes que estão na mochila');
await page.click('[data-shirt="5"]'); await page.click('[data-slot="h"][data-item="h1"]'); await wait(400);
await page.screenshot({ path: `${SHOTS}/3-personalizar.png` });
ok(await page.evaluate(() => { const c = document.getElementById('closetCanvas'); const x = c.getContext('webgl2') || c.getContext('webgl'); return !!x; }), 'prévia 3D com contexto WebGL próprio');
await page.click('#closetSave');
ok(await until(() => /Visual salvo/.test(document.getElementById('closetMsg').textContent), 8000), 'SALVAR responde "Visual salvo"');
const want = 'x1.5.c.h1';
ok(sql(`SELECT skin, custom FROM accounts WHERE id = ${id}`)[0].custom === want, `D1 guardou o visual (${want})`);
await page.click('#closetClose'); await wait(300);
ok(await page.evaluate(() => document.getElementById('skinName').textContent) === 'Visual personalizado', 'o menu passa a usar o visual personalizado');
// recarregar: visual volta com a conta
await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => !!window.__docao, null, { timeout: 120000 }); await wait(2500);
ok(await page.evaluate(() => document.getElementById('skinName').textContent) === 'Visual personalizado', 'depois de recarregar, o visual salvo continua');
// escolher skin da lista e voltar
await page.evaluate(() => document.getElementById('skinNext').click()); await wait(300);
ok(await page.evaluate(() => document.getElementById('skinName').textContent) !== 'Visual personalizado', 'trocar de skin na lista continua funcionando');
// sair da conta: visual personalizado é só de conta
await page.click('#acctBtn'); await page.click('#acctLogout'); await wait(500); await page.click('#acctClose');
ok(await page.evaluate(() => document.getElementById('skinName').textContent) !== 'Visual personalizado', 'sem conta, nenhum visual personalizado');
await page.click('#closetBtn'); ok(await vis('#closetGuest'), 'depois de sair, o Brechó volta a ser só convite');
// todas as partes da loja montam no modelo sem erro e deixam marca (mais peças que o Docão pelado)
const parts = await page.evaluate(async () => {
  const c = await import('./shared/closet.js'), d = await import('./docao.js'); await import('./costumes.js');
  const count = (g) => { let n = 0; g.traverse(() => n++); return n; };
  const base = count(d.makeDocao(c.encodeLook({ shirt: 0, pants: 12, items: {} }), { withGun: false, pose: 'idle' }).group); const bad = [];
  for (const it of c.ITEMS.filter((i) => c.isLookSlot(i.slot))) { try { const m = d.makeDocao(c.encodeLook({ shirt: 1, pants: 3, items: { [it.slot]: it.id } }), { withGun: false, pose: 'idle' }); if (count(m.group) <= base) bad.push(it.id + ':sem-marca'); } catch (e) { bad.push(it.id + ':' + e.message); } }
  try { d.makeDocao(c.encodeLook({ shirt: 2, pants: 4, items: Object.fromEntries(c.SLOTS.map(([k]) => [k, c.ITEMS.find((i) => i.slot === k).id])) }), { withGun: false, pose: 'idle' }); } catch (e) { bad.push('tudo-junto:' + e.message); }
  return { n: c.ITEMS.filter((i) => c.isLookSlot(i.slot)).length, bad };
});
ok(parts.bad.length === 0, `as ${parts.n} partes da loja montam no modelo (e todas juntas) ${parts.bad.join(', ')}`);
const bad = errors.filter((e) => !/favicon|WebGL|GPU|swiftshader|status of 401/i.test(e)); ok(bad.length === 0, 'sem erros no console ' + (bad[0] || ''));
await browser.close(); console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
