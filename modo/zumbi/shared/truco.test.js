import assert from 'node:assert/strict';
import { RANKS, cardPower, manilhaRank, handOutcome, createMatch, act, release, view, pileWithVira, freshDeck, teamOf, nextStake } from './truco.js';

const vira3 = freshDeck().find((c) => c.r === '3' && c.s === 'paus');
const m3 = createMatch({ seats: 4, pile: pileWithVira(vira3), seed: 1 });
assert.equal(m3.vira.r, '3');
assert.equal(m3.manilha, '4');
assert.equal(manilhaRank('3'), '4');
assert.equal(manilhaRank('A'), '2');

assert.ok(cardPower({ r: '4', s: 'paus' }, '4') > cardPower({ r: '4', s: 'copas' }, '4'));
assert.ok(cardPower({ r: '4', s: 'copas' }, '4') > cardPower({ r: '4', s: 'espadas' }, '4'));
assert.ok(cardPower({ r: '4', s: 'espadas' }, '4') > cardPower({ r: '4', s: 'ouros' }, '4'));
assert.ok(cardPower({ r: '4', s: 'ouros' }, '4') > cardPower({ r: '3', s: 'paus' }, '4'));
assert.equal(cardPower({ r: '3', s: 'paus' }, '7'), cardPower({ r: '3', s: 'ouros' }, '7'));
assert.ok(cardPower({ r: '3', s: 'ouros' }, '7') > cardPower({ r: '2', s: 'paus' }, '7'));
assert.deepEqual(RANKS.slice().sort((a, b) => cardPower({ r: a, s: 'ouros' }, 'Q') - cardPower({ r: b, s: 'ouros' }, 'Q')).filter((r) => r !== 'Q'), ['4', '5', '6', '7', 'J', 'K', 'A', '2', '3']);

assert.deepEqual(handOutcome(['T', 0]), { done: true, winner: 0 });
assert.deepEqual(handOutcome([1, 'T']), { done: true, winner: 1 });
assert.deepEqual(handOutcome(['T', 'T', 0]), { done: true, winner: 0 });
assert.deepEqual(handOutcome([0, 1, 'T']), { done: true, winner: 0 });
assert.deepEqual(handOutcome(['T', 'T', 'T']), { done: true, winner: null });
assert.deepEqual(handOutcome([0, 1, 1]), { done: true, winner: 1 });
assert.equal(handOutcome([0, 1]).done, false);
assert.equal(handOutcome(['T']).done, false);

const game = createMatch({ seats: 4, seed: 2 });
const caller = game.turn;
assert.equal(act(game, caller, { t: 'call' }).ok, true);
assert.equal(game.pending.value, 3);
const mate = (caller + 2) % 4;
assert.equal(act(game, mate, { t: 'answer', a: 'run' }).ok, false);
const foe = [0, 1, 2, 3].find((s) => teamOf(game, s) !== game.pending.team);
const before = game.scores[teamOf(game, caller)];
assert.equal(act(game, foe, { t: 'answer', a: 'run' }).ok, true);
assert.equal(game.scores[teamOf(game, caller)], before + 1);

const up = createMatch({ seats: 4, seed: 3 });
assert.equal(act(up, up.turn, { t: 'call' }).ok, true);
const foe2 = [0, 1, 2, 3].find((s) => teamOf(up, s) !== up.pending.team);
assert.equal(act(up, foe2, { t: 'answer', a: 'accept' }).ok, true);
assert.equal(up.stake, 3);
assert.equal(act(up, up.turn, { t: 'call' }).ok, false);
const otherTurn = [0, 1, 2, 3].find((s) => teamOf(up, s) !== up.lastRaiseTeam);
up.turn = otherTurn;
assert.equal(act(up, otherTurn, { t: 'call' }).ok, true);
assert.equal(up.pending.value, 6);
const back = [0, 1, 2, 3].find((s) => teamOf(up, s) !== up.pending.team);
const stakeBefore = up.scores[up.pending.team];
assert.equal(act(up, back, { t: 'answer', a: 'run' }).ok, true);
assert.equal(up.scores[teamOf(up, otherTurn)], stakeBefore + 3);

const cover = createMatch({ seats: 4, seed: 4 });
const id0 = cover.hands[cover.turn][0].id;
assert.match(act(cover, cover.turn, { t: 'play', id: id0, cover: true }).error, /primeira/);

const eleven = createMatch({ seats: 4, scores: [11, 2], seed: 5 });
assert.equal(eleven.phase, 'eleven');
assert.equal(eleven.eleven, 0);
const seat11 = [0, 1, 2, 3].find((s) => teamOf(eleven, s) === 0);
const look = view(eleven, seat11);
assert.ok(look.partnerHand && look.partnerHand.length === 3);
assert.equal(view(eleven, 1).partnerHand, null);
assert.equal(act(eleven, seat11, { t: 'eleven', play: false }).ok, true);
assert.equal(eleven.scores[1], 3);

const go = createMatch({ seats: 4, scores: [11, 4], seed: 6 });
const s0 = [0, 1, 2, 3].find((s) => teamOf(go, s) === 0);
assert.equal(act(go, s0, { t: 'eleven', play: true }).ok, true);
assert.equal(go.stake, 3);
assert.equal(go.phase, 'play');
assert.equal(act(go, go.turn, { t: 'call' }).ok, teamOf(go, go.turn) !== 0);

const ferro = createMatch({ seats: 2, scores: [11, 11], seed: 7 });
assert.equal(ferro.ferro, true);
assert.equal(ferro.blind, true);
assert.equal(view(ferro, 0).hand.every((c) => c == null), true);
assert.match(act(ferro, ferro.turn, { t: 'call' }).error, /ferro/);
assert.equal(act(ferro, ferro.turn, { t: 'play' }).ok, true);
assert.ok(ferro.trick[0].card);

const cap = createMatch({ seats: 2, scores: [10, 0], seed: 8 });
assert.equal(act(cap, cap.turn, { t: 'call' }).ok, true);
const ans = cap.turn === 0 ? 1 : 0;
assert.equal(act(cap, ans, { t: 'answer', a: 'accept' }).ok, true);
assert.equal(cap.stake, 3);
let guard = 0;
while (cap.phase !== 'over' && guard++ < 40) {
  if (cap.phase === 'gap') { release(cap); continue; }
  if (cap.phase !== 'play') break;
  const hand = cap.hands[cap.turn];
  const play = act(cap, cap.turn, { t: 'play', id: hand[0].id });
  assert.equal(play.ok, true, play.error);
}
assert.ok(cap.scores[0] <= 12 && cap.scores[1] <= 12);
assert.ok(cap.scores[0] === 12 || cap.scores[1] === 3 || cap.scores[0] === 10);

const fours = freshDeck();
const used = new Set(['4-ouros', '4-espadas', '4-copas', '4-paus', '6-ouros']);
const rest = fours.filter((c) => !used.has(c.id));
const pile = [
  { id: '4-ouros', r: '4', s: 'ouros' },
  { id: '4-espadas', r: '4', s: 'espadas' },
  { id: '4-copas', r: '4', s: 'copas' },
  { id: '4-paus', r: '4', s: 'paus' },
].concat(rest.slice(0, 8), [{ id: '6-ouros', r: '6', s: 'ouros' }], rest.slice(8));
const tied = createMatch({ seats: 4, dealer: 0, pile });
assert.equal(tied.manilha, '7');
assert.equal(tied.turn, 1);
for (let i = 0; i < 4; i++) {
  const seat = tied.turn;
  const play = act(tied, seat, { t: 'play', id: tied.hands[seat][0].id });
  assert.equal(play.ok, true, play.error);
}
assert.equal(tied.phase, 'gap');
assert.equal(tied.trick.length, 4);
release(tied);
assert.deepEqual(tied.tricks, ['T']);
assert.equal(tied.turn, 1);

assert.equal(nextStake(1), 3);
assert.equal(nextStake(12), 0);

const duo = createMatch({ seats: 2, dealer: 0, seed: 4 });
const opener = duo.turn;
assert.equal(opener, 1);
assert.equal(act(duo, duo.turn, { t: 'play', id: duo.hands[duo.turn][0].id }).ok, true);
assert.equal(act(duo, duo.turn, { t: 'play', id: duo.hands[duo.turn][0].id }).ok, true);
assert.equal(duo.phase, 'gap');
assert.equal(duo.trick.length, 2);
release(duo);
assert.equal(duo.tricks.length, 1);
assert.equal(duo.turn, 0);
assert.equal(act(duo, duo.turn, { t: 'play', id: duo.hands[duo.turn][0].id }).ok, true);
assert.equal(act(duo, duo.turn, { t: 'play', id: duo.hands[duo.turn][0].id }).ok, true);
release(duo);
if (duo.phase === 'play' && duo.tricks.length === 2) assert.equal(duo.turn, opener);

const solo = createMatch({ seats: 2, scores: [11, 0], seed: 9 });
assert.equal(solo.phase, 'eleven');
assert.equal(view(solo, solo.eleven).partner, -1);
assert.equal(act(solo, solo.eleven, { t: 'eleven', play: false }).ok, true);
assert.equal(solo.scores[solo.eleven === 0 ? 1 : 0], 1);

const fold = createMatch({ seats: 2, seed: 6 });
const folder = fold.turn;
const other = folder === 0 ? 1 : 0;
assert.equal(act(fold, other, { t: 'run' }).ok, false);
assert.equal(act(fold, folder, { t: 'run' }).ok, true);
assert.equal(fold.scores[other], 1);
assert.equal(fold.scores[folder], 0);
assert.equal(fold.phase, 'play');
assert.equal(fold.stake, 1);
assert.equal(fold.trick.length, 0);

console.log('truco: ok');
