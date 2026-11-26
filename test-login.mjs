// Teste do login (conta opcional, apelido fixo, skin da conta, ranking, convidado).
// Precisa: cd server && npx wrangler d1 migrations apply docao-contas --local && npx wrangler dev --var ALLOW_TEST:1 --var RATE_REG_MAX:500
// Uso: node test-login.mjs [http://127.0.0.1:8787]
import { execSync } from 'node:child_process';
import { SKINS } from './skins.js';
const H = process.argv[2] || 'http://127.0.0.1:8787', WS = H.replace(/^http/, 'ws');
const fails = []; const ok = (c, m) => { console.log((c ? 'OK    ' : 'FALHA ') + m); if (!c) fails.push(m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = Math.random().toString(36).slice(2, 6);
const nick = (n) => `${n}${tag}`; // apelidos únicos por rodada (o banco local persiste)
async function call(method, path, body, token, headers = {}) {
  const r = await fetch(H + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
const reg = (n, p = 'senha-forte-123') => call('POST', '/api/auth/register', { nick: n, password: p });
const log = (n, p) => call('POST', '/api/auth/login', { nick: n, password: p });

// ---- cadastro ----
const A = nick('Ana'), B = nick('Beto');
let r = await reg(A); ok(r.status === 201 && r.data.token && r.data.account.nick === A, 'cadastro cria conta e já devolve token');
const tokA = r.data.token;
r = await reg(A); ok(r.status === 409, 'apelido duplicado é recusado');
r = await reg(A.toLowerCase()); ok(r.status === 409, 'apelido duplicado com outra caixa também');
r = await reg(A.replace('a', 'á').replace('A', 'Á')); ok(r.status === 409 || r.status === 400, 'apelido igual mudando só o acento não passa');
r = await reg('ab'); ok(r.status === 400, 'apelido curto demais');
r = await reg('<b>x</b>'); ok(r.status === 400, 'apelido com HTML recusado');
r = await reg('Docão'); ok(r.status === 400, 'apelido reservado (Docão) recusado');
r = await reg(nick('Curta'), '1234567'); ok(r.status === 400, 'senha curta recusada');
r = await call('POST', '/api/auth/register', { nick: nick('Obj'), password: { a: 1 } }); ok(r.status === 400, 'senha que não é texto recusada');
r = await call('POST', '/api/auth/register', 'x'.repeat(10)); ok([400, 500].includes(r.status) === true || r.status === 400, 'corpo inválido não derruba');
// ---- login ----
r = await log(A, 'senha-forte-123'); ok(r.status === 200 && r.data.token && r.data.token !== tokA, 'login com a senha certa');
const tokA2 = r.data.token;
const wrong = await log(A, 'senha-errada-999'), ghost = await log(nick('Fantasma'), 'qualquer-coisa-1');
ok(wrong.status === 401 && ghost.status === 401 && wrong.data.error === ghost.data.error, 'senha errada e apelido inexistente dão a MESMA mensagem genérica (401)');
ok(!/senha|apelido/i.test(JSON.stringify(wrong.data)) || /incorretos/.test(wrong.data.error), 'mensagem não entrega qual campo errou');
r = await call('GET', '/api/me', null, 'x'.repeat(43)); ok(r.status === 401, 'token inválido não entra em /api/me');
r = await call('GET', '/api/me'); ok(r.status === 401, 'sem token não entra em /api/me');
r = await call('GET', '/api/me', null, tokA2); ok(r.status === 200 && r.data.account.nick === A, 'token válido entra em /api/me');
// senha nunca em texto puro
try {
  const out = execSync(`cd server && npx wrangler d1 execute docao-contas --local --json --command "SELECT nick, pass_hash FROM accounts WHERE nick = '${A}'"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const row = JSON.parse(out)[0].results[0];
  ok(row && /^pbkdf2-sha256\$\d+\$/.test(row.pass_hash) && !row.pass_hash.includes('senha-forte-123'), 'senha guardada como hash PBKDF2 com sal (nada de texto puro)');
} catch (e) { ok(false, 'não consegui ler o banco local pra conferir o hash: ' + e.message.slice(0, 80)); }
// ---- limite de tentativas ----
const L = nick('Lenta'); await reg(L);
const codes = []; for (let i = 0; i < 7; i++) codes.push((await log(L, 'errada-' + i + '-xyz')).status);
ok(codes.slice(0, 5).every((c) => c === 401) && codes[5] === 429, 'depois de 5 erros seguidos o login responde 429 (limite)');
ok((await log(L, 'senha-forte-123')).status === 429, 'mesmo com a senha certa, bloqueado até o tempo passar');
ok((await log(A, 'senha-forte-123')).status === 200, 'o limite é por apelido+IP: outra conta continua entrando');
// ---- logout ----
r = await call('POST', '/api/auth/logout', {}, tokA2); ok(r.status === 200, 'logout');
r = await call('GET', '/api/me', null, tokA2); ok(r.status === 401, 'token depois do logout não vale mais');
// ---- skin da conta ----
const tokA3 = (await log(A, 'senha-forte-123')).data.token;
const skin = SKINS[3].id;
r = await call('PUT', '/api/me/skin', { skin: 'skin-inventada' }, tokA3); ok(r.status === 400, 'skin que não existe no jogo é recusada');
r = await call('PUT', '/api/me/skin', { skin }, tokA3); ok(r.status === 200, 'skin existente é salva na conta');
r = await call('GET', '/api/me', null, tokA3); ok(r.data.account.skin === skin, 'a skin volta no /api/me');
r = await call('PUT', '/api/me/skin', { skin }); ok(r.status === 401, 'trocar skin sem login não funciona');

// ---- sala: convidado, conta, apelido fixo ----
const room = (await call('POST', '/api/rooms', { map: 'arena', max: 6, fillBots: true, mode: 'dm' })).data.code;
ok(/^[A-Z]{4}$/.test(room), 'sala criada: ' + room);
function join({ name, token, skin: sk, code = room }) {
  return new Promise((res) => {
    const q = new URLSearchParams({ name, skin: sk || SKINS[0].id, primary: '0', secondary: '', melee: '', token: '' });
    const ws = token ? new WebSocket(`${WS}/ws/${code}?${q}`, ['docao', 'tk.' + token]) : new WebSocket(`${WS}/ws/${code}?${q}`);
    const c = { ws, msgs: [], welcome: null, error: null, last: {} };
    ws.onmessage = (ev) => { if (ev.data === 'pong') return; let m; try { m = JSON.parse(ev.data); } catch (e) { return; } c.msgs.push(m); c.last[m.t] = m; if (m.t === 'welcome') c.welcome = m; if (m.t === 'error') c.error = m.msg; };
    ws.onopen = () => setTimeout(() => res(c), 700); ws.onerror = () => res(c); ws.onclose = () => { c.closed = true; };
    c.send = (o) => ws.send(JSON.stringify(o));
  });
}
const me = (c) => (c.last.lobby && c.last.lobby.players || []).find((p) => p.id === (c.welcome && c.welcome.id));
const G = await join({ name: 'Visitante' });
ok(!!G.welcome && !G.error, 'CONVIDADO (sem token) entra na sala como sempre');
ok(me(G) && me(G).name === 'Visitante', 'convidado usa o nome que digitou');
const C1 = await join({ name: 'Qualquer', token: tokA3 });
ok(!!C1.welcome && !C1.error, 'conta entra na sala com o token (subprotocolo)');
ok(C1.ws.protocol === 'docao', 'servidor aceitou o subprotocolo (token fora da URL)');
ok(me(C1) && me(C1).name === A, 'com conta o nome na sala é o apelido FIXO da conta, não o digitado');
ok(me(C1) && me(C1).skin === skin, 'a skin da sala é a skin salva na conta');
C1.send({ t: 'prof', name: 'Outro Nome', skin: SKINS[1].id, primary: 0 }); await wait(500);
ok(me(C1) && me(C1).name === A, 'conta não consegue trocar o apelido no lobby');
C1.send({ t: 'prof', skin: SKINS[5].id, primary: 0 }); await wait(700);
r = await call('GET', '/api/me', null, tokA3); ok(r.data.account.skin === SKINS[5].id, 'trocar skin dentro da sala guarda na conta');
const T = await join({ name: 'x', token: 'Z'.repeat(43) });
ok(/Sessão expirada/.test(T.error || ''), 'token inválido na sala é recusado com mensagem clara');
const T2 = await join({ name: 'y', token: 'curto' });
ok(!!T2.error, 'token mal formado também é recusado');
const imp = await join({ name: A });
ok(imp.welcome && me(imp) && me(imp).name !== A && /\(conv\)/.test(me(imp).name), 'CONVIDADO tentando usar o apelido de uma conta vira "(conv)"');
imp.send({ t: 'prof', name: A, skin: SKINS[0].id, primary: 0 }); await wait(700);
ok(me(imp) && me(imp).name !== A, 'convidado trocando o nome pra um apelido de conta no lobby também é barrado');
const C2 = await join({ name: 'z', token: tokA3 }); await wait(300);
const mineNow = (C2.last.lobby.players || []).filter((p) => p.name === A);
ok(mineNow.length === 1, 'a mesma conta não ocupa dois lugares (a nova aba assume o lugar)');
ok(C1.closed === true, 'a aba antiga é desconectada');
for (const c of [G, C1, C2, T, T2, imp]) try { c.ws.close(); } catch (e) { /* */ }

// ---- ranking (precisa ALLOW_TEST=1 no wrangler dev: testKill/testEnd) ----
const R = nick('Rank'); const tokR = (await reg(R)).data.token;
const rr = (await call('POST', '/api/rooms', { map: 'arena', max: 4, fillBots: true, mode: 'dm' })).data.code;
const H1 = await join({ name: 'x', token: tokR, code: rr });
H1.send({ t: 'start' }); await wait(1500);
if (!H1.last.start) { ok(false, 'partida não começou (precisa ALLOW_TEST?)'); }
else {
  await wait(5500); // espera nascer
  for (let i = 0; i < 3; i++) { H1.send({ t: 'testKill' }); await wait(150); }
  H1.send({ t: 'testEnd' }); await wait(2500);
  r = await call('GET', '/api/rank?mode=dm&sort=kills');
  const row = (r.data.rows || []).find((x) => x.nick === R);
  ok(!!row && row.kills === 3, `ranking mostra os 3 abates da partida (${row ? row.kills : 'sem linha'})`);
  ok(!!row && row.wins === 1, 'vitória registrada (liderou a partida)');
  r = await call('GET', '/api/rank?mode=all&sort=wins'); ok(r.status === 200 && Array.isArray(r.data.rows) && r.data.rows.some((x) => x.nick === R), 'ranking geral por vitórias lista o jogador');
  r = await call('GET', '/api/rank?mode=bomb'); ok(r.status === 200 && !(r.data.rows || []).some((x) => x.nick === R), 'ranking de outro modo não mistura');
  r = await call('GET', '/api/me', null, tokR); ok(r.data.stats && r.data.stats.all.kills === 3 && r.data.stats.all.matches === 1, '/api/me mostra minhas estatísticas');
  r = await call('GET', '/api/rank?mode=dm&sort=kills'); ok(r.data.rows.every((x) => Object.keys(x).sort().join() === 'deaths,kills,matches,nick,wins'), 'ranking só expõe apelido e números (nada de ids/hash)');
}
H1.ws.close();
r = await call('GET', '/api/rank?mode=%27%3BDROP%20TABLE%20accounts--&sort=x'); ok(r.status === 200 && r.data.mode === 'all', 'parâmetros estranhos no ranking caem no padrão (sem injeção)');
// ---- CORS e erros ----
const pre = await fetch(H + '/api/auth/login', { method: 'OPTIONS' });
ok(/Authorization/.test(pre.headers.get('Access-Control-Allow-Headers') || ''), 'CORS aceita o cabeçalho Authorization');
r = await call('GET', '/api/auth/inexistente'); ok(r.status === 404, 'rota de conta desconhecida: 404');
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
