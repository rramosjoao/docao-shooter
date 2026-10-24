// Decisão do bot. A mesma função joga na mesa local e na sala.
import { teamOf, partnerOf, cardPower, nextStake, STAKE_WORD } from './truco.js';
import { BOT_DEFS } from './rules.js';
import { uniqueName } from './names.js';
import { SKINS } from '../skins.js';

export const GUEST_NAME = 'Barriguinha';
export const GLASSES_NAME = 'Oclinhos';

export function botName(taken, guest = false) {
  const used = (n) => taken.some((t) => String(t).toLowerCase() === String(n).toLowerCase());
  if (guest) {
    const first = guest === 'oclinhos' || (guest === true && Math.random() < 0.5) ? GLASSES_NAME : GUEST_NAME;
    const names = first === GLASSES_NAME ? [GLASSES_NAME, GUEST_NAME] : [GUEST_NAME, GLASSES_NAME];
    for (const name of names) if (!used(name)) return name;
  }
  const pool = BOT_DEFS.map((b) => b.name);
  const free = pool.find((n) => !used(n));
  return uniqueName(free || pool[taken.length % pool.length], taken);
}

export function botSkin(taken) {
  const used = new Set((taken || []).map((s) => String(s || '')));
  const free = SKINS.map((s) => s.id).filter((id) => !used.has(id));
  const pool = free.length ? free : SKINS.map((s) => s.id);
  return pool[Math.floor(Math.random() * pool.length)];
}

function power(card, manilha) { return cardPower(card, manilha); }

function weight(cards, manilha) {
  let n = 0;
  for (const c of cards) {
    if (!c) continue;
    const p = power(c, manilha);
    n += p;
    if (p >= 10) n += 6;
  }
  return n;
}

function bark(action, rand, state) {
  if (!action) return '';
  if (action.t === 'call' || (action.t === 'answer' && action.a === 'raise')) {
    const floor = action.t === 'call' ? state.stake : state.pending.value;
    return (STAKE_WORD[nextStake(floor)] || 'Truco') + '!';
  }
  if (action.t === 'answer' && action.a === 'run') return 'Corre!';
  if (action.t === 'answer' && action.a === 'accept') return rand() < 0.5 ? 'Fecha essa!' : 'Aceito!';
  if (action.t === 'eleven' && !action.play) return 'Corre!';
  if (action.t === 'eleven' && action.play) return 'Vamos!';
  if (action.t === 'play' && rand() < 0.18) {
    const lines = ['Fecha essa!', 'Boa!', 'Essa é minha!', 'Vai!'];
    return lines[Math.floor(rand() * lines.length)];
  }
  return '';
}

export function botEmote(rand) {
  if (rand() > 0.22) return '';
  const ids = ['laugh', 'drink', 'wave', 'brow'];
  return ids[Math.floor(rand() * ids.length)];
}

export function botAct(state, seat, rand = Math.random) {
  const action = choose(state, seat, rand);
  return action ? { action, bark: bark(action, rand, state), emote: action.t === 'play' ? botEmote(rand) : '' } : null;
}

function powersOf(cards, manilha) {
  return (cards || []).filter(Boolean).map((c) => power(c, manilha)).sort((a, b) => b - a);
}

function trickTally(state, seat) {
  let us = 0, them = 0;
  const mine = teamOf(state, seat);
  for (const t of state.tricks) {
    if (t === 'T') continue;
    if (t === mine) us++; else them++;
  }
  return { us, them };
}

function strength(state, seat) {
  const powers = powersOf(state.hands[seat], state.manilha);
  const top = powers[0] ?? -1;
  const manilhas = powers.filter((p) => p >= 10).length;
  const highs = powers.filter((p) => p >= 8 && p < 10).length;
  let s = 0;
  if (manilhas >= 2 || (manilhas === 1 && (highs >= 1 || top >= 12))) s = 3;
  else if (manilhas === 1 || highs >= 2) s = 2;
  else if (highs === 1 || top >= 7) s = 1;
  const { us, them } = trickTally(state, seat);
  if (us > them) s += 1;
  else if (them > us && state.pending && state.pending.value >= 6) s -= 1;
  return s;
}

function choose(state, seat, rand) {
  if (state.phase === 'over') return null;
  if (state.phase === 'eleven') {
    if (teamOf(state, seat) !== state.eleven) return null;
    const cards = (state.hands[seat] || []).slice();
    const mate = partnerOf(state, seat);
    if (mate >= 0) cards.push(...(state.hands[mate] || []));
    const best = Math.max(-1, ...powersOf(cards, state.manilha));
    const play = best >= 7 || weight(cards, state.manilha) >= (state.seats === 2 ? 10 : 16);
    return { t: 'eleven', play };
  }
  if (state.phase === 'respond') {
    if (!state.pending || teamOf(state, seat) === state.pending.team) return null;
    return { t: 'answer', a: answer(state, seat, rand) };
  }
  if (state.phase !== 'play' || state.turn !== seat) return null;
  if (!state.ferro && !state.blind && state.stake < 12 && state.lastRaiseTeam !== teamOf(state, seat) && wantCall(state, seat, rand)) {
    return { t: 'call' };
  }
  if (state.blind) return { t: 'play' };
  return playCard(state, seat);
}

function tableLead(state) {
  const open = state.trick.filter((p) => !p.covered && p.card);
  let best = -1, bestTeam = null, tied = false;
  for (const p of open) {
    const v = power(p.card, state.manilha);
    const team = teamOf(state, p.seat);
    if (v > best) { best = v; bestTeam = team; tied = false; }
    else if (v === best) tied = true;
  }
  return { open: open.length, best, bestTeam, tied };
}

function heatOf(state, seat) {
  const powers = powersOf(state.hands[seat], state.manilha);
  const top = powers[0] ?? -1;
  const manilhas = powers.filter((p) => p >= 10).length;
  const highs = powers.filter((p) => p >= 8 && p < 10).length;
  const { us, them } = trickTally(state, seat);
  const lead = tableLead(state);
  const mine = teamOf(state, seat);
  const canCut = lead.open > 0 && top > lead.best;
  const winningNow = lead.open > 0 && lead.bestTeam === mine && !lead.tied;
  const losingNow = lead.open > 0 && !winningNow && !canCut;
  let heat = 0;
  if (manilhas >= 2 || (manilhas === 1 && (highs >= 1 || top >= 12))) heat += 0.4;
  else if (manilhas === 1 || highs >= 2) heat += 0.2;
  else if (highs === 1 || top >= 7) heat += 0.07;
  else heat += 0.02;
  if (us > them) heat += 0.14;
  else if (them > us) heat -= canCut ? 0 : 0.16;
  if (winningNow) heat += top >= 8 ? 0.16 : 0.08;
  else if (canCut) heat += top >= 10 ? 0.14 : 0.06;
  else if (losingNow) heat -= 0.22;
  if (powers.length === 1 && state.tricks.length >= 1) {
    if (us === them && top >= 8) heat += 0.18;
    else if (us > them && (winningNow || top >= 6)) heat += 0.12;
    else if (us === them && top < 4) heat -= 0.08;
  }
  return heat;
}

function answer(state, seat, rand) {
  const pending = state.pending.value;
  const s = strength(state, seat);
  const heat = heatOf(state, seat);
  const top = powersOf(state.hands[seat], state.manilha)[0] ?? -1;
  const needAccept = pending <= 3 ? 1 : pending === 6 ? 2 : 3;
  const raiseBar = pending <= 3 ? 0.4 : pending === 6 ? 0.5 : 0.55;
  if (nextStake(pending) && heat >= raiseBar && rand() < (pending <= 3 ? 0.42 : pending === 6 ? 0.36 : 0.3)) return 'raise';
  if (s >= needAccept) return 'accept';
  if (state.seats === 4 && pending === 3 && top >= 5 && rand() < 0.5) return 'accept';
  if (heat >= 0.28 && rand() < 0.35) return 'accept';
  if (rand() < 0.06) return 'accept';
  return 'run';
}

function wantCall(state, seat, rand) {
  let heat = heatOf(state, seat);
  const powers = powersOf(state.hands[seat], state.manilha);
  const weak = (powers[0] ?? -1) < 7 && powers.every((p) => p < 10);
  if (weak && rand() < 0.05) heat += 0.5;
  const bar = state.stake <= 1 ? 0.46 : state.stake === 3 ? 0.4 : state.stake === 6 ? 0.48 : 0.52;
  if (heat < bar) return false;
  const chance = state.stake <= 1 ? 0.2 : state.stake === 3 ? 0.36 : state.stake === 6 ? 0.3 : 0.26;
  return rand() < chance;
}

function playCard(state, seat) {
  const hand = state.hands[seat];
  const manilha = state.manilha;
  const ranked = hand.map((c) => ({ c, p: power(c, manilha) })).sort((a, b) => a.p - b.p);
  const open = state.trick.filter((p) => !p.covered && p.card);
  if (!open.length) return { t: 'play', id: leadCard(state, seat, ranked).id, cover: false };
  let best = -1, bestTeam = null, tied = false;
  for (const p of open) {
    const v = power(p.card, manilha);
    const team = teamOf(state, p.seat);
    if (v > best) { best = v; bestTeam = team; tied = false; }
    else if (v === best) tied = true;
  }
  const myTeam = teamOf(state, seat);
  const last = state.trick.length + 1 === state.seats;
  if (bestTeam === myTeam && !tied) {
    if (last || best >= 8) return { t: 'play', id: ranked[0].c.id, cover: false };
    const secure = ranked.find((x) => x.p > best && x.p < 10);
    if (secure) return { t: 'play', id: secure.c.id, cover: false };
    return { t: 'play', id: ranked[0].c.id, cover: false };
  }
  const cut = ranked.find((x) => x.p > best);
  if (cut) return { t: 'play', id: cut.c.id, cover: false };
  const junk = ranked[0];
  const cover = state.tricks.length >= 1 && junk.p <= 2;
  return { t: 'play', id: junk.c.id, cover };
}

function leadCard(state, seat, ranked) {
  const { us, them } = trickTally(state, seat);
  if (us > them) return ranked[0].c;
  const plain = ranked.filter((x) => x.p < 10);
  if (!plain.length) return ranked[0].c;
  return plain[plain.length - 1].c;
}
