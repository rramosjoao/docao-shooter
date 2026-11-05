// Truco Paulista, regras puras. Cliente e servidor importam daqui.
// Dupla: no 2v2 os lugares 0 e 2 contra 1 e 3. No 1v1 cada cadeira é o próprio time.
// A jogada segue para a direita: o próximo lugar é (lugar + 1) % cadeiras.

export const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
export const SUITS = ['ouros', 'espadas', 'copas', 'paus']; // manilha: ouros < espadas < copas < paus
export const SUIT_NAME = { ouros: 'Ouros', espadas: 'Espadas', copas: 'Copas', paus: 'Paus' };
export const RANK_NAME = { Q: 'Q', J: 'J', K: 'K', A: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7' };
export const STAKE_WORD = { 3: 'Truco', 6: 'Seis', 9: 'Nove', 12: 'Doze' };
export const EMOTES = ['brow', 'wink', 'ear', 'chin', 'point', 'laugh', 'wave', 'drink'];
export const WIN = 12;

export const cardId = (r, s) => r + '-' + s;
export function freshDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ id: cardId(r, s), r, s });
  return d;
}
export function manilhaRank(rank) {
  const i = RANKS.indexOf(rank);
  return RANKS[(i + 1) % RANKS.length];
}
export function cardPower(card, manilha) {
  if (!card) return -1;
  if (card.r === manilha) return 10 + SUITS.indexOf(card.s);
  return RANKS.indexOf(card.r);
}
export function nextStake(v) {
  return v === 1 ? 3 : v === 3 ? 6 : v === 6 ? 9 : v === 9 ? 12 : 0;
}
export function nextSeat(state, seat) { return (seat + 1) % state.seats; }
export function teamOf(state, seat) { return state.seats === 2 ? seat : seat % 2; }
export function partnerOf(state, seat) { return state.seats === 4 ? (seat + 2) % 4 : -1; }

// Quem age agora. isBot(lugar) decide entre humano e bot quando os dois podem responder.
export function dueSeat(state, isBot = () => false) {
  const pick = (seats) => {
    if (!seats.length) return -1;
    const human = seats.find((s) => !isBot(s));
    return human == null ? seats[0] : human;
  };
  if (state.phase === 'eleven') {
    const seats = [];
    for (let s = 0; s < state.seats; s++) if (teamOf(state, s) === state.eleven) seats.push(s);
    return pick(seats);
  }
  if (state.phase === 'respond' && state.pending) {
    const seats = [];
    for (let s = 0; s < state.seats; s++) if (teamOf(state, s) !== state.pending.team) seats.push(s);
    return pick(seats);
  }
  if (state.phase === 'play') return state.turn;
  return -1;
}

export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function shuffle(list, rand) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = list[i]; list[i] = list[j]; list[j] = t;
  }
  return list;
}

export function handOutcome(tricks) {
  const a = tricks[0], b = tricks[1], c = tricks[2];
  if (tricks.length < 2) return { done: false, winner: null };
  if (tricks.length === 2) {
    if (a === 'T' && b !== 'T') return { done: true, winner: b };
    if (a !== 'T' && b === 'T') return { done: true, winner: a };
    if (a !== 'T' && a === b) return { done: true, winner: a };
    if (a === 'T' && b === 'T') return { done: false, winner: null };
    return { done: false, winner: null };
  }
  if (a === 'T' && b === 'T') return { done: true, winner: c === 'T' ? null : c };
  if (c === 'T') return { done: true, winner: a === 'T' ? null : a };
  let n0 = 0, n1 = 0;
  for (const t of tricks) { if (t === 0) n0++; else if (t === 1) n1++; }
  if (n0 > n1) return { done: true, winner: 0 };
  if (n1 > n0) return { done: true, winner: 1 };
  return { done: true, winner: null };
}

function trickWinner(plays, manilha) {
  const open = plays.filter((p) => !p.covered && p.card);
  if (!open.length) return { tie: true, seat: -1 };
  let best = -1, tops = [];
  for (const p of open) {
    const v = cardPower(p.card, manilha);
    if (v > best) { best = v; tops = [p]; }
    else if (v === best) tops.push(p);
  }
  if (tops.length !== 1) return { tie: true, seat: -1 };
  return { tie: false, seat: tops[0].seat };
}

export function createMatch(opts = {}) {
  const seats = opts.seats === 2 ? 2 : 4;
  const state = {
    seats,
    scores: [clampScore(opts.scores && opts.scores[0]), clampScore(opts.scores && opts.scores[1])],
    dealer: ((opts.dealer | 0) % seats + seats) % seats,
    rand: opts.rand || rng(opts.seed || 1),
    pile: Array.isArray(opts.pile) ? opts.pile.map(copyCard) : null,
    phase: 'play',
    hands: [],
    vira: null,
    manilha: null,
    trick: [],
    tricks: [],
    leader: 0,
    turn: 0,
    stake: 1,
    pending: null,
    lastRaiseTeam: null,
    blind: false,
    ferro: false,
    eleven: null,
    revealPartner: false,
    winner: null,
    seq: 0,
  };
  const events = [];
  openHand(state, events);
  state.events = events;
  return state;
}

function clampScore(n) { n = n | 0; return n < 0 ? 0 : n > WIN ? WIN : n; }
function copyCard(c) { return c ? { id: c.id, r: c.r, s: c.s } : null; }

function takePile(state) {
  if (state.pile && state.pile.length >= state.seats * 3 + 1) {
    const n = state.seats * 3 + 1;
    const cards = state.pile.slice(0, n);
    state.pile = state.pile.slice(n);
    return cards;
  }
  return shuffle(freshDeck(), state.rand);
}

function openHand(state, events) {
  if (state.scores[0] >= WIN || state.scores[1] >= WIN) {
    state.phase = 'over';
    state.winner = state.scores[0] >= WIN ? 0 : 1;
    state.hands = [];
    return;
  }
  const cards = takePile(state);
  state.hands = Array.from({ length: state.seats }, () => []);
  state.trick = [];
  state.tricks = [];
  state.pending = null;
  state.lastRaiseTeam = null;
  state.stake = 1;
  state.blind = false;
  state.ferro = false;
  state.eleven = null;
  state.revealPartner = false;
  state.gap = null;
  const first = nextSeat(state, state.dealer);
  let i = 0;
  for (let round = 0; round < 3; round++) {
    for (let k = 0; k < state.seats; k++) state.hands[(first + k) % state.seats].push(cards[i++]);
  }
  state.vira = cards[i];
  state.manilha = manilhaRank(state.vira.r);
  state.leader = first;
  state.turn = first;
  const at11 = [state.scores[0] >= 11, state.scores[1] >= 11];
  if (at11[0] && at11[1]) {
    state.ferro = true;
    state.blind = true;
    state.stake = 3;
    state.phase = 'play';
    events.push({ t: 'ferro' });
  } else if (at11[0] || at11[1]) {
    state.eleven = at11[0] ? 0 : 1;
    state.revealPartner = true;
    state.phase = 'eleven';
    events.push({ t: 'eleven', team: state.eleven });
  } else {
    state.phase = 'play';
  }
  events.push({ t: 'deal', vira: copyCard(state.vira), manilha: state.manilha });
}

function givePoints(state, team, pts, events) {
  if (team == null) {
    events.push({ t: 'hand', winner: null, points: 0 });
    return false;
  }
  const add = state.ferro ? WIN : pts;
  state.scores[team] = Math.min(WIN, state.scores[team] + add);
  events.push({ t: 'hand', winner: team, points: state.ferro ? WIN : pts, ferro: state.ferro });
  if (state.scores[team] >= WIN) {
    state.phase = 'over';
    state.winner = team;
    state.pending = null;
    events.push({ t: 'match', winner: team });
    return true;
  }
  return false;
}

function advance(state, events) {
  if (state.phase === 'over') return;
  state.dealer = nextSeat(state, state.dealer);
  openHand(state, events);
}

export function act(state, seat, action) {
  const events = [];
  const error = reject(state, seat, action);
  if (error) return { ok: false, error, events };
  state.seq++;
  apply(state, seat, action, events);
  state.events = events;
  return { ok: true, events };
}

function reject(state, seat, action) {
  if (!action || state.phase === 'over') return 'A partida já acabou';
  if (seat < 0 || seat >= state.seats) return 'Lugar inválido';
  if (action.t === 'eleven') {
    if (state.phase !== 'eleven') return 'Não é mão de onze';
    if (teamOf(state, seat) !== state.eleven) return 'Essa decisão é da outra dupla';
    return '';
  }
  if (action.t === 'answer') {
    if (state.phase !== 'respond' || !state.pending) return 'Ninguém pediu truco';
    if (teamOf(state, seat) === state.pending.team) return 'Quem pediu não responde';
    if (action.a !== 'run' && action.a !== 'accept' && action.a !== 'raise') return 'Resposta inválida';
    if (action.a === 'raise' && !nextStake(state.pending.value)) return 'Não dá para aumentar do doze';
    return '';
  }
  if (action.t === 'run') {
    if (state.phase !== 'play') return 'Agora não dá para correr';
    if (state.turn !== seat) return 'Espera a sua vez';
    if (state.ferro || state.blind) return 'Na mão de ferro não corre';
    return '';
  }
  if (action.t === 'call') {
    if (state.phase !== 'play') return 'Agora não dá para pedir';
    if (state.ferro) return 'Na mão de ferro não tem truco';
    if (state.turn !== seat) return 'Espera a sua vez';
    if (state.pending) return 'Já tem um pedido na mesa';
    if (!nextStake(state.stake)) return 'A mão já vale doze';
    if (state.lastRaiseTeam === teamOf(state, seat)) return 'Agora é a outra dupla que pode aumentar';
    return '';
  }
  if (action.t === 'play') {
    if (state.phase !== 'play') return 'Agora não é hora de jogar carta';
    if (state.turn !== seat) return 'Espera a sua vez';
    const hand = state.hands[seat] || [];
    if (!hand.length) return 'Sem carta na mão';
    if (!state.blind) {
      const card = hand.find((c) => c.id === action.id);
      if (!card) return 'Essa carta não está na sua mão';
      if (action.cover && state.tricks.length < 1) return 'Na primeira rodada a carta vai aberta';
    }
    return '';
  }
  return 'Jogada desconhecida';
}

function apply(state, seat, action, events) {
  if (action.t === 'eleven') {
    if (!action.play) {
      const other = state.eleven === 0 ? 1 : 0;
      events.push({ t: 'elevenRun', team: state.eleven });
      state.revealPartner = false;
      if (!givePoints(state, other, 1, events)) advance(state, events);
      return;
    }
    state.stake = 3;
    state.lastRaiseTeam = state.eleven;
    state.phase = 'play';
    events.push({ t: 'elevenGo', team: state.eleven });
    return;
  }
  if (action.t === 'run') {
    const other = teamOf(state, seat) === 0 ? 1 : 0;
    events.push({ t: 'run', seat, team: other, points: state.stake });
    if (!givePoints(state, other, state.stake, events)) advance(state, events);
    return;
  }
  if (action.t === 'call') {
    const value = nextStake(state.stake);
    state.pending = { seat, team: teamOf(state, seat), value };
    state.phase = 'respond';
    events.push({ t: 'call', seat, team: state.pending.team, value, word: STAKE_WORD[value] });
    return;
  }
  if (action.t === 'answer') {
    const pending = state.pending;
    if (action.a === 'run') {
      events.push({ t: 'run', seat, team: pending.team, points: state.stake });
      state.pending = null;
      if (!givePoints(state, pending.team, state.stake, events)) advance(state, events);
      return;
    }
    if (action.a === 'raise') {
      const floor = pending.value;
      const value = nextStake(floor);
      state.stake = floor;
      state.pending = { seat, team: teamOf(state, seat), value };
      state.phase = 'respond';
      events.push({ t: 'raise', seat, team: state.pending.team, value, word: STAKE_WORD[value] });
      return;
    }
    state.stake = pending.value;
    state.lastRaiseTeam = pending.team;
    state.pending = null;
    state.phase = 'play';
    events.push({ t: 'accept', seat, value: state.stake });
    return;
  }
  const hand = state.hands[seat];
  let card, covered = false;
  if (state.blind) {
    card = hand.shift();
    covered = false;
  } else {
    const idx = hand.findIndex((c) => c.id === action.id);
    card = hand.splice(idx, 1)[0];
    covered = !!action.cover && state.tricks.length >= 1;
  }
  state.trick.push({ seat, card, covered });
  events.push({ t: 'play', seat, card: covered ? null : copyCard(card), covered, self: copyCard(card) });
  if (state.trick.length < state.seats) {
    state.turn = nextSeat(state, seat);
    return;
  }
  const won = trickWinner(state.trick, state.manilha);
  const result = won.tie ? 'T' : teamOf(state, won.seat);
  events.push({ t: 'trick', result, seat: won.tie ? -1 : won.seat });
  state.phase = 'gap';
  state.gap = { result, seat: won.tie ? -1 : won.seat };
}

export function release(state) {
  const events = [];
  if (!state || state.phase !== 'gap' || !state.gap) return { ok: false, events };
  const gap = state.gap;
  state.gap = null;
  state.tricks.push(gap.result);
  state.trick = [];
  const outcome = handOutcome(state.tricks);
  if (!outcome.done) {
    state.phase = 'play';
    state.leader = state.seats === 2 ? nextSeat(state, state.leader) : (gap.result === 'T' ? state.leader : gap.seat);
    state.turn = state.leader;
    state.events = events;
    return { ok: true, events };
  }
  state.pending = null;
  if (!givePoints(state, outcome.winner, outcome.winner == null ? 0 : state.stake, events)) advance(state, events);
  state.events = events;
  return { ok: true, events };
}

export function view(state, seat) {
  const mine = teamOf(state, seat);
  const partner = partnerOf(state, seat);
  const seeMate = !!(state.revealPartner && partner >= 0 && mine === state.eleven);
  const hand = state.hands[seat] || [];
  const show = (cards, hidden) => hidden ? cards.map(() => null) : cards.map(copyCard);
  return {
    seats: state.seats,
    scores: state.scores.slice(),
    dealer: state.dealer,
    phase: state.phase,
    vira: copyCard(state.vira),
    manilha: state.manilha,
    stake: state.stake,
    pending: state.pending ? { seat: state.pending.seat, team: state.pending.team, value: state.pending.value, word: STAKE_WORD[state.pending.value] } : null,
    lastRaiseTeam: state.lastRaiseTeam,
    turn: state.turn,
    leader: state.leader,
    tricks: state.tricks.slice(),
    trick: state.trick.map((p) => ({
      seat: p.seat,
      covered: p.covered,
      card: p.covered && p.seat !== seat ? null : copyCard(p.card),
    })),
    blind: state.blind,
    ferro: state.ferro,
    eleven: state.eleven,
    revealPartner: seeMate,
    winner: state.winner,
    you: seat,
    team: mine,
    partner,
    hand: show(hand, state.blind),
    handCount: hand.length,
    partnerHand: seeMate ? (state.hands[partner] || []).map(copyCard) : null,
    counts: state.hands.map((h) => h.length),
    seq: state.seq,
  };
}

export function pileWithVira(vira) {
  const rest = freshDeck().filter((c) => c.id !== vira.id);
  return rest.slice(0, 12).concat([vira], rest.slice(12));
}
