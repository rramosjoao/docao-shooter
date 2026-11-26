// Ranking da Granja separado da Pocilga, com o cliente antigo contando como pocilga.
// Uso: node test-granja-rank.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { scriptRun as pitScript, PIT } from './shared/pocilga.js';
import { scriptRun as granjaScript, rankFloor, GRANJA } from './shared/granja.js';
import { pitRank, pitSave } from './server/src/pocilga.js';
import { handleAccountRoute, sha256hex } from './server/src/auth.js';
import { GUEST_RANK_NOTE } from './pocilga-rank.js';

const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const migs = readdirSync(new URL('./server/migrations/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort();
ok(migs.includes('0015_pocilga_map.sql'), 'a separação por mapa está na migração 0015');
ok(!migs.includes('0014_pocilga_map.sql'), '0014 continua sendo a promo, não o mapa');

{
  const db = new DatabaseSync(':memory:');
  for (const f of migs) if (f < '0015') db.exec(read('./server/migrations/' + f));
  db.prepare('INSERT INTO accounts (nick, nick_key, pass_hash, created_at) VALUES (?, ?, ?, ?)').run('Velha', 'velha', 'x', 1);
  const id = db.prepare('SELECT id FROM accounts WHERE nick = ?').get('Velha').id;
  db.prepare('INSERT INTO pocilga_times (account_id, best_ms, raw_ms, penalty_ms, civs, stars, runs, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, 45000, 45000, 0, 0, 3, 2, 10);
  db.exec(read('./server/migrations/0015_pocilga_map.sql'));
  const row = db.prepare('SELECT map, best_ms, runs FROM pocilga_times WHERE account_id = ?').get(id);
  ok(row && row.map === 'pocilga' && row.best_ms === 45000 && row.runs === 2, `a linha antiga vira pocilga (${row && row.map} ${row && row.best_ms})`);
}

function memory() {
  const db = new DatabaseSync(':memory:');
  for (const f of migs) db.exec(read('./server/migrations/' + f));
  const bound = (sql, args) => {
    if (!args.length) return [];
    if (/\?\d/.test(sql)) { const o = {}; args.forEach((v, i) => { o[i + 1] = v; }); return [o]; }
    return args;
  };
  const wrap = (sql, args = []) => ({ sql, args, bind(...a) { return wrap(sql, a); },
    async all() { return { results: db.prepare(sql).all(...bound(sql, args)) }; },
    async first() { return db.prepare(sql).get(...bound(sql, args)) || null; },
    async run() { const r = db.prepare(sql).run(...bound(sql, args)); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } });
  return { db, env: { DB: { prepare: (sql) => wrap(sql) } } };
}
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
const post = (path, body, token) => new Request('http://local' + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body),
});
const get = (path, token) => new Request('http://local' + path, { headers: token ? { Authorization: 'Bearer ' + token } : {} });

const { db, env } = memory();
const add = (nick) => db.prepare('INSERT INTO accounts (nick, nick_key, pass_hash, created_at) VALUES (?, ?, ?, ?)').run(nick, nick.toLowerCase(), 'x', 1);
add('Ana'); add('Beto');
const idOf = (nick) => db.prepare('SELECT id FROM accounts WHERE nick = ?').get(nick).id;
const rowOf = (nick, map) => db.prepare('SELECT t.map, t.best_ms, t.runs FROM pocilga_times t JOIN accounts a ON a.id = t.account_id WHERE a.nick = ? AND t.map = ?').get(nick, map);

const guest = await handleAccountRoute(post('/api/pocilga/run', { events: granjaScript({ finish: 40 }), map: 'granja' }), env, new URL('http://local/api/pocilga/run'), json);
const guestBody = await guest.json();
ok(guest.status === 401 && guestBody.error === GUEST_RANK_NOTE, `deslogado não grava a Granja (${guest.status})`);

const legacy = await pitSave(env, idOf('Ana'), pitScript({ finish: 40 }));
ok(legacy.status === 200 && legacy.body.saved && rowOf('Ana', 'pocilga') && rowOf('Ana', 'pocilga').best_ms === 40000 && !rowOf('Ana', 'granja'), 'sem mapa no pitSave continua pocilga');

const token = 'granjatoken0000000000000000001';
const exp = Math.floor(Date.now() / 1000) + 3600;
db.prepare('INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(await sha256hex(token), idOf('Beto'), exp - 10, exp);

const oldClient = await handleAccountRoute(post('/api/pocilga/run', { events: pitScript({ finish: 48 }) }, token), env, new URL('http://local/api/pocilga/run'), json);
const oldBody = await oldClient.json();
ok(oldClient.status === 200 && oldBody.saved && oldBody.run.map === 'pocilga' && rowOf('Beto', 'pocilga').best_ms === 48000, 'cliente antigo, sem mapa, grava pocilga');

const granja = await handleAccountRoute(post('/api/pocilga/run', { events: granjaScript({ finish: 42 }), map: 'granja' }, token), env, new URL('http://local/api/pocilga/run'), json);
const granjaBody = await granja.json();
ok(granja.status === 200 && granjaBody.saved && granjaBody.run.map === 'granja' && granjaBody.run.stars === 3 && rowOf('Beto', 'granja').best_ms === 42000 && rowOf('Beto', 'pocilga').best_ms === 48000, `Granja não mexe no tempo da Pocilga (${granjaBody.run && granjaBody.run.final})`);

const worse = await pitSave(env, idOf('Beto'), granjaScript({ finish: 55 }), 'granja');
ok(worse.status === 200 && rowOf('Beto', 'granja').runs === 2 && rowOf('Beto', 'granja').best_ms === 42000, 'corrida pior da Granja não troca o recorde');

const fast = await handleAccountRoute(post('/api/pocilga/run', { events: granjaScript({ finish: rankFloor() - 0.05 }), map: 'granja' }, token), env, new URL('http://local/api/pocilga/run'), json);
const fastBody = await fast.json();
ok(fast.status === 422 && fastBody.run && fastBody.run.reason === 'rápido' && rowOf('Beto', 'granja').best_ms === 42000, 'piso da Granja recusa');

const badMap = await handleAccountRoute(post('/api/pocilga/run', { events: granjaScript({ finish: 40 }), map: 'lua' }, token), env, new URL('http://local/api/pocilga/run'), json);
ok(badMap.status === 400, 'mapa desconhecido é 400');

await pitSave(env, idOf('Ana'), granjaScript({ finish: 46 }), 'granja');
const board = await pitRank(env, idOf('Ana'), 10, 'granja');
ok(board.rows.map((r) => r.nick).join(',') === 'Beto,Ana' && board.me.nick === 'Ana' && board.me.place === 2, `ranking da Granja é o dela (${board.rows.map((r) => r.nick).join(',')})`);
const pocilgaBoard = await pitRank(env, idOf('Beto'), 10, 'pocilga');
ok(pocilgaBoard.rows.map((r) => r.nick).join(',') === 'Ana,Beto' && pocilgaBoard.rows.every((r) => r.best !== 42), `ranking da Pocilga não mistura (${pocilgaBoard.rows.map((r) => r.nick + ' ' + r.best).join(' · ')})`);

const listed = await handleAccountRoute(get('/api/pocilga/rank?limit=10&map=granja', token), env, new URL('http://local/api/pocilga/rank?limit=10&map=granja'), json);
const listedBody = await listed.json();
ok(listed.status === 200 && listedBody.map === 'granja' && listedBody.me.nick === 'Beto' && listedBody.rows[0].nick === 'Beto', 'GET com mapa devolve a Granja e a própria linha');
const omitted = await handleAccountRoute(get('/api/pocilga/rank?limit=10'), env, new URL('http://local/api/pocilga/rank?limit=10'), json);
const omittedBody = await omitted.json();
ok(omitted.status === 200 && omittedBody.map === 'pocilga' && omittedBody.rows.some((r) => r.nick === 'Ana') && !omittedBody.rows.some((r) => r.best === 42), 'GET sem mapa continua a Pocilga');

ok(PIT.map === 'pocilga' && GRANJA.map === 'granja' && GRANJA.pistol !== PIT.pistol, 'os dois mapas não dividem a arma');

console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
