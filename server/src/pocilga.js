// Ranking do Pistoleiro no D1, separado por mapa. A conta do tempo mora em shared/.
// Sem mapa no pedido, vale a Pocilga — o cliente antigo não manda o campo.
import { rankedRun as pitRanked, formatPit } from '../../shared/pocilga.js';
import { rankedRun as granjaRanked } from '../../shared/granja.js';
import { bonusLine as pitBonusLine } from '../../shared/pocilga-bonus.js';
import { bonusLine as granjaBonusLine } from '../../shared/granja-bonus.js';

export const PIT_MAPS = {
  pocilga: { rankedRun: pitRanked, bonusLine: pitBonusLine },
  granja: { rankedRun: granjaRanked, bonusLine: granjaBonusLine },
};

export function normalizeMap(map) {
  if (map == null || map === '') return 'pocilga';
  return Object.prototype.hasOwnProperty.call(PIT_MAPS, map) ? map : null;
}

const now = () => Math.floor(Date.now() / 1000);
const ms = (sec) => Math.round(sec * 1000);
const sec = (n) => Math.round(n) / 1000;

export function publicRun(run, map = 'pocilga') {
  const line = (PIT_MAPS[map] || PIT_MAPS.pocilga).bonusLine;
  return {
    ok: !!run.finished, ranked: !!run.ranked, reason: run.reason, map,
    raw: run.raw, penalty: run.penalty, final: run.final, civs: run.civs, stars: run.stars,
    missed: run.missed, suggestion: run.suggestion, clock: run.final != null ? formatPit(run.final) : null,
    bonus: run.bonus || 0, alvo: line(run.bonusZone), qs: run.qs || 0,
  };
}

async function rowsOf(env, map, limit) {
  const { results } = await env.DB.prepare(
    `SELECT a.nick AS nick, t.best_ms AS best_ms, t.stars AS stars, t.civs AS civs, t.runs AS runs
     FROM pocilga_times t JOIN accounts a ON a.id = t.account_id
     WHERE t.map = ?1
     ORDER BY t.best_ms ASC, a.nick ASC LIMIT ?2`,
  ).bind(map, limit).all();
  return (results || []).map((r, i) => ({
    place: i + 1, nick: r.nick, best: sec(r.best_ms), stars: r.stars | 0, civs: r.civs | 0, runs: r.runs | 0,
    clock: formatPit(sec(r.best_ms)),
  }));
}

export async function pitRank(env, accountId, limit, map = 'pocilga') {
  const rows = await rowsOf(env, map, limit);
  let me = null;
  if (accountId) {
    const row = await env.DB.prepare(
      `SELECT a.nick AS nick, t.best_ms AS best_ms, t.stars AS stars, t.civs AS civs, t.runs AS runs,
              (SELECT COUNT(*) FROM pocilga_times o WHERE o.map = t.map AND o.best_ms < t.best_ms) AS ahead
       FROM pocilga_times t JOIN accounts a ON a.id = t.account_id WHERE t.account_id = ?1 AND t.map = ?2`,
    ).bind(accountId, map).first();
    if (row) me = { nick: row.nick, best: sec(row.best_ms), stars: row.stars | 0, civs: row.civs | 0, runs: row.runs | 0, place: (row.ahead | 0) + 1, clock: formatPit(sec(row.best_ms)) };
  }
  return { map, rows, me };
}

// Devolve { status, body }. best_ms só troca quando o novo final é menor, no mapa certo.
export async function pitSave(env, accountId, events, map = 'pocilga') {
  const pack = PIT_MAPS[map] || PIT_MAPS.pocilga;
  const run = pack.rankedRun(events);
  if (!run.ranked) {
    console.log('pocilga reject', map, run.reason, 'raw', run.raw, 'final', run.final);
    return { status: 422, body: { ok: false, saved: false, run: publicRun(run, map) } };
  }
  const t = now();
  const best = ms(run.final), raw = ms(run.raw), pen = ms(run.penalty);
  await env.DB.prepare(
    `INSERT INTO pocilga_times (account_id, map, best_ms, raw_ms, penalty_ms, civs, stars, runs, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8)
     ON CONFLICT(account_id, map) DO UPDATE SET
       runs = runs + 1,
       updated_at = ?8,
       best_ms = CASE WHEN excluded.best_ms < pocilga_times.best_ms THEN excluded.best_ms ELSE pocilga_times.best_ms END,
       raw_ms = CASE WHEN excluded.best_ms < pocilga_times.best_ms THEN excluded.raw_ms ELSE pocilga_times.raw_ms END,
       penalty_ms = CASE WHEN excluded.best_ms < pocilga_times.best_ms THEN excluded.penalty_ms ELSE pocilga_times.penalty_ms END,
       civs = CASE WHEN excluded.best_ms < pocilga_times.best_ms THEN excluded.civs ELSE pocilga_times.civs END,
       stars = CASE WHEN excluded.best_ms < pocilga_times.best_ms THEN excluded.stars ELSE pocilga_times.stars END`,
  ).bind(accountId, map, best, raw, pen, run.civs, run.stars, t).run();
  const board = await pitRank(env, accountId, 10, map);
  const saved = !!(board.me && board.me.best <= run.final + 1e-6);
  return { status: 200, body: { ok: true, saved, run: publicRun(run, map), ...board } };
}
