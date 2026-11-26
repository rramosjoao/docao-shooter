// Tênis de quadra, pontuação de clube: 0, 15, 30, 40, vantagem, set a 6, tie-break.
import { HALF } from './physics.js';

const NAME = ['0', '15', '30', '40'];

export function newMatch({ seats, setsToWin = 2 }) {
  const server = Math.max(0, seats.findIndex((s) => s.team === 0));
  return {
    seats,
    doubles: seats.length > 2,
    setsToWin,
    sets: [0, 0],
    games: [0, 0],
    pts: [0, 0],
    tb: [0, 0],
    history: [],
    tiebreak: false,
    server,
    serveIx: [0, 0],
    serveBall: 0,
    endsFlipped: false,
    over: false,
    winner: null,
    tbOpener: null,
    tbOpenerTeam: 0,
  };
}

export function teamOf(match, seat) {
  return match.seats[seat].team;
}

export function sideOf(match, team) {
  const base = team === 0 ? -1 : 1;
  return match.endsFlipped ? -base : base;
}

function seatsOf(match, team) {
  return match.seats.map((s, i) => ({ ...s, i })).filter((s) => s.team === team);
}

export function deuceCourt(match) {
  const n = match.tiebreak ? match.tb[0] + match.tb[1] : match.pts[0] + match.pts[1];
  return n % 2 === 0;
}

export function pointLabel(match, team) {
  if (match.tiebreak) return String(match.tb[team]);
  const me = match.pts[team];
  const them = match.pts[1 - team];
  if (me >= 3 && them >= 3) {
    if (me === them) return '40';
    return me > them ? 'Vant.' : '40';
  }
  return NAME[Math.min(me, 3)] || '0';
}

export function serveSpot(match) {
  const team = teamOf(match, match.server);
  const side = sideOf(match, team);
  const deuce = deuceCourt(match);
  return {
    x: (deuce ? side : -side) * 3.05,
    z: side * (HALF + 0.9),
    side,
    deuce,
  };
}

export function returner(match) {
  const team = 1 - teamOf(match, match.server);
  const list = seatsOf(match, team);
  if (list.length < 2) return list[0].i;
  return deuceCourt(match) ? list[0].i : list[1].i;
}

function finishService(match) {
  const team = teamOf(match, match.server);
  const list = seatsOf(match, team);
  match.serveIx[team] = (match.serveIx[team] + 1) % list.length;
  const nextTeam = 1 - team;
  const next = seatsOf(match, nextTeam);
  match.server = next[match.serveIx[nextTeam] % next.length].i;
}

function blank(extra) {
  return { event: 'point', ends: false, over: false, ...extra };
}

export function awardPoint(match, winner) {
  if (match.over) return blank({ event: 'over', over: true });
  if (match.tiebreak) return awardTiebreak(match, winner);
  match.pts[winner] += 1;
  const me = match.pts[winner];
  const them = match.pts[1 - winner];
  if (me >= 4 && me - them >= 2) return winGame(match, winner, false);
  return blank();
}

function winGame(match, winner, fromTiebreak) {
  const serverTeam = teamOf(match, match.server);
  match.pts = [0, 0];
  if (!fromTiebreak) match.games[winner] += 1;
  const total = match.games[0] + match.games[1];
  const mine = match.games[winner];
  const opp = match.games[1 - winner];
  if (!fromTiebreak && match.games[0] === 6 && match.games[1] === 6) {
    const ends = total % 2 === 1;
    if (ends) match.endsFlipped = !match.endsFlipped;
    startTiebreak(match, serverTeam);
    match.serveBall = 0;
    return blank({ event: 'tiebreak', ends });
  }
  if (fromTiebreak || (mine >= 6 && mine - opp >= 2)) return closeSet(match, winner, serverTeam, fromTiebreak);
  const ends = total % 2 === 1;
  if (ends) match.endsFlipped = !match.endsFlipped;
  finishService(match);
  match.serveBall = 0;
  return blank({ event: 'game', ends });
}

function startTiebreak(match, serverTeamJustFinished) {
  match.tiebreak = true;
  match.tb = [0, 0];
  const openerTeam = 1 - serverTeamJustFinished;
  const list = seatsOf(match, openerTeam);
  match.tbOpener = list[match.serveIx[openerTeam] % list.length].i;
  match.tbOpenerTeam = openerTeam;
  match.server = match.tbOpener;
}

function tbSeat(match) {
  const n = match.tb[0] + match.tb[1];
  const opener = seatsOf(match, match.tbOpenerTeam);
  const other = seatsOf(match, 1 - match.tbOpenerTeam);
  if (n === 0) return match.tbOpener;
  const block = Math.floor((n - 1) / 2);
  if (block % 2 === 0) return other[Math.floor(block / 2) % other.length].i;
  const openerIx = opener.findIndex((s) => s.i === match.tbOpener);
  const ix = (openerIx + 1 + Math.floor((block - 1) / 2)) % opener.length;
  return opener[ix].i;
}

function awardTiebreak(match, winner) {
  match.tb[winner] += 1;
  const me = match.tb[winner];
  const them = match.tb[1 - winner];
  const sum = match.tb[0] + match.tb[1];
  const ends = sum === 6 || sum === 12 || sum === 18;
  if (ends) match.endsFlipped = !match.endsFlipped;
  match.server = tbSeat(match);
  match.serveBall = 0;
  if (me >= 7 && me - them >= 2) {
    match.games[winner] = 7;
    return closeSet(match, winner, match.tbOpenerTeam, true, ends);
  }
  return blank({ event: 'point', ends });
}

function closeSet(match, winner, serverTeam, fromTiebreak, endsAlready) {
  match.history.push([match.games[0], match.games[1]]);
  match.sets[winner] += 1;
  const total = match.games[0] + match.games[1];
  const ends = endsAlready || total % 2 === 1;
  if (!endsAlready && ends) match.endsFlipped = !match.endsFlipped;
  match.games = [0, 0];
  match.pts = [0, 0];
  match.tb = [0, 0];
  match.tiebreak = false;
  match.serveIx = [0, 0];
  const nextTeam = fromTiebreak ? 1 - match.tbOpenerTeam : 1 - serverTeam;
  match.server = seatsOf(match, nextTeam)[0].i;
  match.serveBall = 0;
  if (match.sets[winner] >= match.setsToWin) {
    match.over = true;
    match.winner = winner;
    return blank({ event: 'match', ends, over: true });
  }
  return blank({ event: 'set', ends });
}

export function faultServe(match) {
  if (match.serveBall === 0) {
    match.serveBall = 1;
    return blank({ event: 'fault' });
  }
  const recv = 1 - teamOf(match, match.server);
  const out = awardPoint(match, recv);
  match.serveBall = 0;
  return { ...out, event: out.event === 'point' ? 'double' : out.event, double: true };
}

export function sideLabel(match, team) {
  return match.seats.filter((s) => s.team === team).map((s) => s.name).join(' e ');
}
