// ============================================================
//  Simulação autoritativa de uma sala online (roda dentro do Durable Object).
//  Não depende de APIs da Cloudflare: recebe callbacks send/broadcast/loop.
//  Autoridade do servidor: acertos (hitscan com rewind ~100 ms + ping/2), dano, abates, placar, renascimento,
//  pickups, Copo Bomba e foguetes (física + explosão), tempo de partida, fim de partida e bots.
//  O cliente é dono só do próprio movimento (com checagem de velocidade/paredes) e manda eventos de tiro com origem+direção.
// ============================================================
import { MAPS, getMap } from '../../maps.js';
import { buildNav } from '../../nav.js';
import { SKINS } from '../../skins.js';
import { cleanName, uniqueName } from '../../shared/names.js';
import { KILL_LIMIT, TIME_LIMIT, RESPAWN_TIME, INVULN, JUMP, SPEED, BOT_SPEED, EYE, WEAPONS, PRIMARIES, PISTOL, W_NADE, W_FALL, NADE, BOT_DEFS, BOT_RANGE, TAG_COLORS } from '../../shared/rules.js';
import { mapSolids, createPhysics, raySphere, HITBOXES, fellOff, FALL_FLOOR } from '../../shared/physics.js';
import { explosionHits, rayCapsule, ROCKET_PAD } from '../../shared/combat.js';
import { DOM, pickZone, newZoneState, zoneCounts, stepZone, canJoinTeam, smallerTeam, inZone } from '../../shared/domination.js';

export const MAX_PLAYERS = 8;
const PENDING_WAIT = 60; // s de relógio de parede pra escolher o time ao entrar no meio; depois vai no Automático
const TICK = 0.05, HIST = 1.0, DC_GRACE = 30;
const TICK_DT = (g) => clamp(g.T - (g.lastZoneT ?? g.T), 0, 0.25) + (g.lastZoneT = g.T, 0);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = (v) => Math.round(v * 100) / 100;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const vlen = (v) => Math.hypot(v.x, v.y, v.z);
const norm = (v) => { const l = vlen(v) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; };
const arr3 = (v) => [r2(v.x), r2(v.y), r2(v.z)];
const obj3 = (a) => (Array.isArray(a) && a.length === 3 && a.every(Number.isFinite) ? { x: a[0], y: a[1], z: a[2] } : null);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const center = (e, y = 1.0, p = e.pos) => ({ x: p.x, y: p.y + y, z: p.z });

export class Game {
  constructor(cfg, io) {
    this.test = !!cfg.test; // só no `wrangler dev` com ALLOW_TEST=1: aceita teleporte (testes automatizados)
    this.cfg = { code: cfg.code, map: cfg.map || 'arena', max: clamp(cfg.max | 0 || 6, 2, MAX_PLAYERS), fillBots: cfg.fillBots !== false, mode: cfg.mode === 'dom' ? 'dom' : 'dm' };
    this.io = io; // { send(id, obj), broadcast(obj), startLoop(), stopLoop() }
    this.ents = new Map(); this.nextId = 1; this.hostId = 0;
    this.state = 'lobby'; this.mapId = null; this.T = 0; this.t0 = 0;
    this.events = []; this.personal = new Map(); this.nades = []; this.rockets = []; this.pickups = []; this.projId = 1;
  }
  now() { return Date.now() / 1000; }
  // o mundo só avança com mensagens (limite de CPU): depois de um tempo parado, T fica velho. Acerta pelo relógio de parede antes de usar.
  syncClock() { if (this.state === 'playing' && this.t0) this.T = Math.max(this.T, this.now() - this.t0); }
  get teamMode() { return this.cfg.mode === 'dom'; }
  live() { return [...this.ents.values()].filter((e) => e.bot || e.connected); }
  teamCounts(exclude, humansOnly = true) { const c = [0, 0]; for (const e of this.live()) if (e !== exclude && (!humansOnly || !e.bot) && (e.team === 0 || e.team === 1)) c[e.team]++; return c; }
  // escolha de time (lobby, pré-partida ou entrando no meio): -1 = automático. Bloqueia se deixaria 2+ humanos a mais.
  chooseTeam(e, want) {
    want = want === 0 || want === 1 ? want : -1; e.teamPref = want;
    const c = this.teamCounts(e); let team = want, blocked = false;
    if (want >= 0 && !canJoinTeam(want, c)) { blocked = true; team = -1; e.teamPref = -1; } // bloqueado: vira Automático
    if (team < 0) team = smallerTeam(c);
    e.team = team; return { team, blocked };
  }
  humans(connectedOnly = true) { return [...this.ents.values()].filter((e) => !e.bot && (!connectedOnly || e.connected)); }
  // ---------- entrada/saída ----------
  join({ name, skin, primary, token }) {
    this.syncClock(); this.purge();
    let e = token ? [...this.ents.values()].find((x) => !x.bot && x.token === token) : null;
    if (e) { e.connected = true; e.dcAt = 0; } // reconexão: mesmo id e placar
    else {
      if (this.humans().length >= this.cfg.max) return { error: 'Sala cheia' };
      if (this.state !== 'lobby' && !this.teamMode) this.removeOneBot(); // abre vaga (Dominação: ao escolher o time)
      e = this.makeEnt({ name: this.freeName(name), skin, primary, bot: false });
      if (this.teamMode) { this.chooseTeam(e, -1); if (this.state === 'playing') { e.pendingTeam = true; e.pendingSince = this.now(); } }
      e.token = token && /^[a-z0-9]{8,32}$/i.test(token) ? token : Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
    }
    if (!this.hostId || !this.ents.get(this.hostId)?.connected) this.hostId = e.id;
    return { ent: e };
  }
  welcome(e) {
    this.syncClock(); if (this.state === 'playing') this.io.startLoop(); // o loop para quando o último humano sai: volta ao entrar/reconectar
    this.io.send(e.id, { t: 'welcome', id: e.id, token: e.token, code: this.cfg.code, hostId: this.hostId, cfg: this.cfg, state: this.state, maps: MAPS.map((m) => [m.id, m.name]) });
    if (this.state === 'lobby') this.sendLobby();
    else {
      this.io.send(e.id, this.startMsg());
      if (this.state === 'playing') { this.events.push(['j', this.entInfo(e)]); if (!e.alive) e.respawnAt = e.pendingTeam ? this.T + PENDING_WAIT : Math.min(e.respawnAt || this.T, this.T + 0.5); } // escolhendo time: espera até 60 s (depois vai no Automático)
      if (this.state === 'over') this.io.send(e.id, this.endMsg());
    }
    this.sendLobby();
  }
  leave(id) {
    const e = this.ents.get(id); if (!e) return;
    e.connected = false; e.dcAt = this.now(); e.alive = false;
    if (this.hostId === id) { const h = this.humans()[0]; this.hostId = h ? h.id : 0; }
    if (this.state === 'lobby') this.ents.delete(id);
    else this.events.push(['l', id]);
    this.syncBots(); this.sendLobby();
    if (!this.humans().length) this.io.stopLoop();
  }
  purge() { // remove quem caiu e não voltou
    const t = this.now();
    for (const e of [...this.ents.values()]) if (!e.bot && !e.connected && t - e.dcAt > DC_GRACE) this.ents.delete(e.id);
  }
  // nome limpo e sem repetir ("Matheus (2)") entre quem está na sala (humanos conectados e bots)
  freeName(raw, self = null) { return uniqueName(cleanName(raw), [...this.ents.values()].filter((x) => x !== self).map((x) => x.name)); }
  makeEnt({ name, skin, primary, bot }) {
    const id = this.nextId++;
    const e = { id, bot, name: cleanName(name), skin: SKINS.some((s) => s.id === skin) ? skin : pick(SKINS).id, tag: TAG_COLORS[(id - 1) % TAG_COLORS.length],
      primary: PRIMARIES.includes(primary) ? primary : 0, nextPrimary: PRIMARIES.includes(primary) ? primary : 0, slots: [0, PISTOL], weapon: 0,
      pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: 0, onGround: true, hp: 100, alive: false, kills: 0, deaths: 0, invulnUntil: 0, respawnAt: 0,
      nades: 0, mag: WEAPONS.map((w) => w.mag), reserve: WEAPONS.map((w) => w.reserve), lastShot: WEAPONS.map(() => -9), lastCt: [], reload: null, hist: [], ping: 0, lastUpd: 0, sq: 0, lastKnock: -9,
      connected: !bot, dcAt: 0, lastAttacker: 0, team: -1, teamPref: -1, caps: 0 };
    if (bot) Object.assign(e, { think: 0, target: null, aim: 0, reaction: rand(0.35, 0.65), strafeDir: 1, strafeT: 0, wp: null, path: null, stuck: 0, lastSeen: null, lastSeenAt: -99, accuracy: rand(0.045, 0.07), nextNade: 0, nextFire: 0, reloadEnd: 0, repathAt: 0 });
    this.ents.set(id, e); return e;
  }
  entInfo(e) { return { id: e.id, name: e.name, skin: e.skin, bot: e.bot, tag: e.tag, kills: e.kills, deaths: e.deaths, alive: e.alive, primary: e.primary, w: e.weapon, team: e.team, caps: e.caps, pend: e.pendingTeam ? 1 : 0 }; }
  sendLobby() {
    this.io.broadcast({ t: 'lobby', cfg: this.cfg, hostId: this.hostId, state: this.state, mapId: this.mapId,
      players: [...this.ents.values()].filter((e) => e.bot || e.connected).map((e) => ({ id: e.id, name: e.name, skin: e.skin, bot: e.bot, ping: e.ping, kills: e.kills, deaths: e.deaths, team: e.team, pref: e.teamPref })) });
  }
  // ---------- bots de preenchimento ----------
  syncBots() {
    if (this.state === 'lobby') return;
    const want = this.cfg.fillBots ? Math.max(0, this.cfg.max - this.humans().length) : 0;
    let bots = [...this.ents.values()].filter((e) => e.bot);
    const tc = () => this.teamCounts(null, false);
    while (bots.length > want) { // Dominação: tira do time maior
      let b = bots[bots.length - 1]; if (this.teamMode) { const c = tc(), big = c[0] >= c[1] ? 0 : 1; b = [...bots].reverse().find((x) => x.team === big) || b; }
      bots = bots.filter((x) => x !== b); this.ents.delete(b.id); this.events.push(['l', b.id]);
    }
    if (this.teamMode) { // rebalanceia bots se um time ficou 2+ maior
      for (let i = 0; i < 8; i++) { const c = tc(), big = c[0] > c[1] ? 0 : 1; if (c[big] - c[1 - big] < 2) break; const b = bots.find((x) => x.team === big); if (!b) break; b.team = 1 - big; this.events.push(['tm', b.id, b.team]); }
    }
    const used = new Set(this.live().map((b) => b.name)); // bot não pega nome de humano
    while (bots.length < want) {
      const name = BOT_DEFS.map((d) => d.name).find((n) => !used.has(n)) || 'Bot ' + this.nextId; used.add(name);
      const b = this.makeEnt({ name, skin: pick(SKINS).id, primary: pick(PRIMARIES), bot: true }); bots.push(b);
      if (this.teamMode) b.team = smallerTeam(tc());
      if (this.state === 'playing') { this.events.push(['j', this.entInfo(b)]); this.spawn(b); }
    }
  }
  removeOneBot() { const b = [...this.ents.values()].reverse().find((e) => e.bot); if (b) { this.ents.delete(b.id); this.events.push(['l', b.id]); } }
  // ---------- partida ----------
  startMatch(mapId) {
    const id = mapId === 'random' || !MAPS.some((m) => m.id === mapId) ? pick(MAPS.filter((m) => m.id !== this.mapId)).id : mapId;
    const map = getMap(id); this.mapId = id; this.map = map;
    const solids = mapSolids(map); this.P = createPhysics(solids, map.size, map.fall || null); this.fall = map.fall || null;
    this.spawns = map.spawns.map(([x, z, y = 0]) => ({ x, y: this.P.groundAt(x, z, y + 0.3), z }));
    this.nav = buildNav({ hx: map.size[0], hz: map.size[1], spacing: map.navSpacing || 2, collides: this.P.collides, groundAt: this.P.groundAt, solids, topAt: this.P.topAt, seeds: this.spawns.map((s) => [s.x, s.y, s.z]), extra: map.waypoints || [] });
    this.pickups = map.pickups.map(([type, x, z, y]) => ({ type, pos: { x, y: this.P.groundAt(x, z, (y || 0) + 0.3), z }, active: true, respawnAt: 0 }));
    this.nades = []; this.rockets = []; this.events = []; this.personal.clear();
    this.state = 'playing'; this.t0 = this.now(); this.T = 0; this.lastTick = this.now();
    for (const e of this.ents.values()) { e.kills = 0; e.deaths = 0; e.alive = false; e.caps = 0; e.pendingTeam = false; if (!this.teamMode) e.team = -1; }
    if (this.teamMode) { // times
      const hs = this.humans(); // os times do lobby já respeitam a regra; só completa quem está sem time e reequilibra (automáticos primeiro)
      for (const e of hs) if (e.team !== 0 && e.team !== 1) e.team = e.teamPref >= 0 && canJoinTeam(e.teamPref, this.teamCounts(e)) ? e.teamPref : smallerTeam(this.teamCounts(e));
      for (let g = 0; g < 16; g++) {
        const c = this.teamCounts(null), big = c[0] - c[1] >= 2 ? 0 : c[1] - c[0] >= 2 ? 1 : -1; if (big < 0) break;
        const mv = hs.find((x) => x.team === big && x.teamPref < 0) || hs.find((x) => x.team === big); mv.team = 1 - big;
      }
      for (const b of [...this.ents.values()].filter((x) => x.bot)) b.team = -1;
    }
    this.syncBots();
    if (this.teamMode) { for (const b of [...this.ents.values()].filter((x) => x.bot)) b.team = -1; for (const b of [...this.ents.values()].filter((x) => x.bot)) b.team = smallerTeam(this.teamCounts(null, false)); }
    this.teamScore = [0, 0]; this.zone = this.teamMode ? newZoneState(pickZone(this.nav)) : null;
    for (const e of this.ents.values()) if (e.bot || e.connected) this.spawn(e, true);
    this.io.broadcast(this.startMsg()); this.sendLobby();
    this.io.startLoop();
  }
  get timeLimit() { return this.teamMode ? DOM.TIME_LIMIT_DOM : TIME_LIMIT; }
  zoneArr() { const z = this.zone; return z ? [r2(z.x), r2(z.y), r2(z.z), +z.progress.toFixed(3), z.team, z.contested ? 1 : 0, z.counts[0], z.counts[1], this.teamScore[0], this.teamScore[1]] : null; }
  startMsg() { return { t: 'start', mode: this.cfg.mode, zone: this.zoneArr(), win: DOM.WIN_CAPS, map: this.mapId, T: r2(this.T), limit: this.timeLimit, kills: KILL_LIMIT, hostId: this.hostId, ents: [...this.ents.values()].filter((e) => e.bot || e.connected).map((e) => this.entInfo(e)), pk: this.pickups.map((p) => (p.active ? 1 : 0)) }; }
  endMatch() {
    this.state = 'over'; this.io.stopLoop(); this.nades = []; this.rockets = [];
    this.io.broadcast(this.endMsg()); this.sendLobby();
  }
  endMsg() {
    const rows = [...this.ents.values()].filter((e) => e.bot || e.connected).sort((a, b) => this.score(b) - this.score(a) || a.deaths - b.deaths);
    const i = MAPS.findIndex((m) => m.id === this.mapId), ts = this.teamScore || [0, 0];
    return { t: 'end', mode: this.cfg.mode, ts, winTeam: this.teamMode ? (ts[0] > ts[1] ? 0 : ts[1] > ts[0] ? 1 : -1) : null, board: rows.map((e) => [e.id, e.name, e.kills, e.deaths, e.bot, e.team, e.caps]), winner: rows[0] ? rows[0].id : 0, map: this.mapId, next: MAPS[(i + 1) % MAPS.length].id, hostId: this.hostId };
  }
  score(e) { return this.teamMode ? e.kills + 2 * e.caps : e.kills; }
  // ---------- mensagens dos clientes ----------
  onMessage(id, m) {
    this.syncClock();
    const e = this.ents.get(id); if (!e || !m || typeof m !== 'object') return;
    const isHost = id === this.hostId;
    switch (m.t) {
      case 'u': this.onUpdate(e, m); break;
      case 'prof': if (typeof m.name === 'string' && this.state !== 'playing') e.name = this.freeName(m.name, e); // nome só muda fora da partida (as plaquinhas são criadas no início)
         if (SKINS.some((s) => s.id === m.skin)) e.skin = m.skin; if (PRIMARIES.includes(m.primary)) e.nextPrimary = m.primary; if (this.state === 'lobby') e.primary = e.nextPrimary; this.sendLobby(); break;
      case 'cfg': if (!isHost) return;
        if (m.map === 'random' || MAPS.some((x) => x.id === m.map)) this.cfg.map = m.map;
        if (m.max) this.cfg.max = clamp(m.max | 0, Math.max(2, this.humans().length), MAX_PLAYERS);
        if (typeof m.fillBots === 'boolean') this.cfg.fillBots = m.fillBots;
        if ((m.mode === 'dm' || m.mode === 'dom') && this.state !== 'playing') { this.cfg.mode = m.mode; for (const h of this.humans()) { if (m.mode === 'dom') this.chooseTeam(h, h.teamPref); else h.team = -1; } }
        this.io.saveCfg && this.io.saveCfg(this.cfg); if (this.state === 'playing') this.syncBots(); this.sendLobby(); break;
      case 'start': if (!isHost || this.state === 'playing') return; this.startMatch(m.map || (m.next && this.mapId ? MAPS[(MAPS.findIndex((x) => x.id === this.mapId) + 1) % MAPS.length].id : this.cfg.map)); break;
      case 'team': {
        if (!this.teamMode) return; const r = this.chooseTeam(e, m.team);
        if (this.state === 'playing') {
          if (e.pendingTeam) { e.pendingTeam = false; e.respawnAt = this.T + 0.3; this.syncBots(); }
          else if (e.alive) { e.alive = false; e.deaths++; e.respawnAt = this.T + RESPAWN_TIME; this.events.push(['k', 0, e.id, -2, 0, 0, e.deaths]); } // troca no meio: renasce no time novo
          this.events.push(['tm', e.id, e.team]);
        }
        this.io.send(e.id, { t: 'teamOk', team: r.team, blocked: r.blocked, pref: e.teamPref }); this.sendLobby(); break;
      }
      case 'lobby': if (!isHost || this.state !== 'over') return; this.state = 'lobby'; for (const b of [...this.ents.values()]) if (b.bot) this.ents.delete(b.id); this.sendLobby(); break;
      default: break;
    }
  }
  onUpdate(e, m) {
    if (this.state !== 'playing') return;
    const t = this.now(); if (Number.isFinite(m.pg)) e.ping = clamp(m.pg | 0, 0, 2000);
    if (m.sq === e.sq && e.alive) {
      const p = obj3(m.p), v = obj3(m.v);
      if (p) {
        const dt = clamp(t - (e.lastUpd || t), 0.016, 1);
        const horiz = Math.hypot(p.x - e.pos.x, p.z - e.pos.z);
        const knocked = this.T - e.lastKnock < 2.5;
        const maxH = (SPEED * 1.35 + (knocked ? 22 : 0)) * dt + 0.6;
        const [hx, hz] = this.map.size;
        const inside = Math.abs(p.x) <= hx && Math.abs(p.z) <= hz && p.y >= (this.fall ? FALL_FLOOR : -0.5) && p.y < 45;
        if (this.test && m.tp) { e.pos = p; e.lastKnock = this.T; }
        else if (horiz > maxH || !inside || this.P.collides(p.x, p.y + 0.05, p.z) || (p.y - e.pos.y > (knocked ? 12 : 3.2) * Math.max(dt, 0.25) + 1)) {
          e.badMoves = (e.badMoves || 0) + 1; this.toMe(e, ['pos', arr3(e.pos)]); // anti-cheat: devolve pra última posição válida
        } else { e.pos = p; if (v) e.vel = { x: clamp(v.x, -40, 40), y: clamp(v.y, -60, 40), z: clamp(v.z, -40, 40) }; if (e.alive && fellOff(this.fall, e.pos.y)) this.kill(e, null, W_FALL, false); }
        e.lastUpd = t;
      }
      if (Number.isFinite(m.y)) e.yaw = m.y + Math.PI; // câmera → modelo
      if (Number.isFinite(m.pi)) e.pitch = clamp(m.pi, -1.6, 1.6);
      e.onGround = !!m.g;
      if (e.slots.includes(m.w) && m.w !== e.weapon) { e.weapon = m.w; e.reload = null; }
      this.pushHist(e);
    }
    if (Array.isArray(m.ev)) for (const ev of m.ev.slice(0, 24)) this.onEvent(e, ev);
  }
  onEvent(e, ev) {
    if (!Array.isArray(ev)) return;
    const [k] = ev;
    if (k === 'pr') { if (PRIMARIES.includes(ev[1])) e.nextPrimary = ev[1]; return; }
    if (!e.alive) return;
    if (k === 'rl') { const w = ev[1]; if (e.slots.includes(w) && e.mag[w] < WEAPONS[w].mag && e.reserve[w] > 0) e.reload = { w, start: this.T, done: 0 }; return; }
    if (k === 'f') return this.clockOk(e, ev[4], ev[3]) && this.humanFire(e, ev[1], ev[2], ev[3], ev[5]);
    if (k === 'r') return this.clockOk(e, ev[3], 3) && this.humanRocket(e, ev[1], ev[2]);
    if (k === 'n') return this.humanNade(e, ev[1], ev[2]);
  }
  // cadência: usa o relógio do cliente (tiros chegam agrupados pela rede), mas o relógio do cliente não pode
  // andar mais rápido que o do servidor (speed hack): (tServidor - tCliente) não pode cair mais que 0,75 s abaixo do máximo visto
  clockOk(e, ct, w) {
    if (!Number.isFinite(ct) || !WEAPONS[w]) return false;
    const off = this.now() - ct; e.maxOff = Math.max(e.maxOff ?? -Infinity, off);
    if (off < e.maxOff - 0.75) { e.rejectedShots = (e.rejectedShots || 0) + 1; return false; }
    const last = e.lastCt[w] ?? -Infinity; if (ct - last < WEAPONS[w].rate * 0.9) { e.rejectedShots = (e.rejectedShots || 0) + 1; return false; }
    e.lastCt[w] = ct; return true;
  }
  eyeOk(e, o) { return o && dist(o, center(e, EYE)) < 2.6; }
  // recarga do lado do servidor (mesma temporização do cliente, com 20% de folga pra rede)
  progressReload(e) {
    const R = e.reload; if (!R) return; const w = WEAPONS[R.w], el = this.T - R.start, i = R.w;
    if (w.shellReload) {
      const shells = el >= (w.reloadStart + w.reload) * 0.8 ? Math.floor((el - w.reloadStart * 0.8) / (w.reload * 0.8)) : 0;
      while (R.done < shells && e.mag[i] < w.mag && e.reserve[i] > 0) { e.mag[i]++; e.reserve[i]--; R.done++; }
      if (e.mag[i] >= w.mag || e.reserve[i] <= 0) e.reload = null;
    } else if (el >= w.reload * 0.8) { const n = Math.min(w.mag - e.mag[i], e.reserve[i]); e.mag[i] += n; e.reserve[i] -= n; e.reload = null; }
  }
  canShoot(e, w) {
    const W = WEAPONS[w]; if (!e.slots.includes(w)) return false;
    if (this.T - e.lastShot[w] < W.rate * 0.35) return false; // folga pra rede; a cadência real é checada em clockOk
    this.progressReload(e);
    if (e.mag[w] <= 0) return false;
    if (e.reload && W.shellReload) e.reload = null; // atirar interrompe a recarga do Calibre 12
    else if (e.reload) return false;
    e.mag[w]--; e.lastShot[w] = this.T; e.invulnUntil = Math.min(e.invulnUntil, this.T); e.weapon = w; return true;
  }
  humanFire(e, oA, dirs, w, rt) {
    const o = obj3(oA); if (!this.eyeOk(e, o) || !Number.isInteger(w) || !WEAPONS[w] || WEAPONS[w].rocket || !Array.isArray(dirs)) return;
    if (!this.canShoot(e, w)) { e.rejectedShots = (e.rejectedShots || 0) + 1; return; }
    const ds = dirs.slice(0, Math.max(1, WEAPONS[w].pellets)).map(obj3).filter(Boolean).map(norm);
    // compensação de lag: o cliente manda o tempo de servidor do que estava desenhando (rt); senão estima RTT + 100 ms de interpolação
    const rewind = Number.isFinite(rt) ? clamp(rt, this.T - 0.4, this.T) : this.T - clamp(e.ping / 1000 + 0.1, 0, 0.4);
    this.hitscan(e, o, ds, w, rewind);
  }
  humanRocket(e, oA, dA) {
    const o = obj3(oA), d = obj3(dA); if (!this.eyeOk(e, o) || !d || !this.canShoot(e, 3)) return;
    this.launchRocket(e, o, norm(d));
  }
  humanNade(e, oA, vA) {
    const o = obj3(oA), v = obj3(vA); if (!this.eyeOk(e, o) || !v || e.nades <= 0 || vlen(v) > 34) return;
    e.nades--; this.throwNade(e, o, v);
  }
  // ---------- histórico de posições (rewind) ----------
  pushHist(e) { e.hist.push([this.T, e.pos.x, e.pos.y, e.pos.z]); while (e.hist.length > 2 && e.hist[0][0] < this.T - HIST) e.hist.shift(); }
  posAt(e, t) {
    const h = e.hist; if (!h.length || t >= h[h.length - 1][0]) return e.pos;
    for (let i = h.length - 1; i > 0; i--) if (h[i - 1][0] <= t) { const a = h[i - 1], b = h[i], k = (t - a[0]) / Math.max(1e-6, b[0] - a[0]); return { x: a[1] + (b[1] - a[1]) * k, y: a[2] + (b[2] - a[2]) * k, z: a[3] + (b[3] - a[3]) * k }; }
    return { x: h[0][1], y: h[0][2], z: h[0][3] };
  }
  // ---------- combate ----------
  hitscan(shooter, o, dirs, w, rewindT = this.T) {
    const W = WEAPONS[w], hits = new Map(), ends = [];
    const targets = [...this.ents.values()].filter((t) => t !== shooter && t.alive && (t.bot || t.connected) && !this.friends(t, shooter)).map((t) => ({ t, p: rewindT < this.T ? this.posAt(t, rewindT) : t.pos }));
    for (const d of dirs) {
      const wall = this.P.rayWorld(o, d, W.range); const wallD = wall ?? W.range; let best = null;
      for (const { t, p } of targets) for (const [y, r, head] of HITBOXES) { const tt = raySphere(o, d, center(t, y, p), r); if (tt > 0 && tt < wallD && (!best || tt < best.tt)) best = { t, tt, head }; }
      const L = best ? best.tt : wallD; ends.push([r2(o.x + d.x * L), r2(o.y + d.y * L), r2(o.z + d.z * L), best ? 1 : 0]);
      if (best) {
        const h = hits.get(best.t) || { dmg: 0, head: false };
        let fo = 1; if (W.falloff) { const [n0, n1, mn] = W.falloff; fo = clamp(1 - (best.tt - n0) / (n1 - n0) * (1 - mn), mn, 1); }
        h.dmg += W.dmg * (best.head ? W.headMul : 1) * fo; h.head = h.head || best.head; hits.set(best.t, h);
      }
    }
    this.events.push(['sh', shooter.id, w, arr3(o), ends]);
    for (const [t, h] of hits) this.damage(t, h.dmg, shooter, w, h.head);
    return hits;
  }
  friends(a, b) { return this.teamMode && a && b && a !== b && a.team === b.team && a.team >= 0; }
  damage(t, amount, a, w, head) {
    if (!t.alive || this.T < t.invulnUntil || this.friends(t, a)) return false; // sem fogo amigo
    t.hp -= amount; t.lastAttacker = a ? a.id : 0;
    if (t.bot && a && a !== t && !t.target) { t.target = a; t.aim = t.reaction * 0.5; }
    this.events.push(['h', t.id, a ? a.id : 0, Math.max(0, Math.round(t.hp)), head ? 1 : 0]);
    if (t.hp <= 0) { this.kill(t, a, w, head); return true; }
    return false;
  }
  kill(t, a, w, head) {
    t.alive = false; t.hp = 0; t.deaths++; t.respawnAt = this.T + RESPAWN_TIME;
    if (a && a !== t) a.kills++;
    this.events.push(['k', a ? a.id : 0, t.id, w, head ? 1 : 0, a ? a.kills : 0, t.deaths]);
    if (a && a.kills >= KILL_LIMIT && !this.teamMode) this.pendingEnd = true;
  }
  blast(c, owner, o, direct = null) {
    this.events.push(['bm', o.pid || 0, o.kind, arr3(c)]);
    const hits = explosionHits(c, o, this.live(), (a, b) => this.P.losClear(a, b), owner, this.teamMode, direct);
    for (const h of hits) {
      const e = h.e; e.lastKnock = this.T;
      if (e.bot) { e.vel.x += h.knock.x; e.vel.z += h.knock.z; e.vel.y = Math.max(e.vel.y, h.knock.y); e.onGround = false; }
      else this.toMe(e, ['kn', arr3(h.knock)]); // empurrão aplicado pelo próprio cliente (rocket jump)
      this.damage(e, h.dmg, owner, o.wIdx, false);
    }
    return hits;
  }
  throwNade(e, o, v) {
    const n = { id: this.projId++, owner: e, pos: { ...o }, vel: { ...v }, explodeAt: this.T + NADE.fuse };
    this.nades.push(n); this.events.push(['nd', n.id, e.id, arr3(o), arr3(v)]);
  }
  launchRocket(e, o, d) {
    const R = WEAPONS[3].rocket, near = this.P.rayWorld(o, d, 0.7);
    this.events.push(['sh', e.id, 3, arr3(o), []]);
    if (near !== null) { const t = Math.max(0, near - 0.12); this.blast({ x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t }, e, { ...R, wIdx: 3, kind: 'r' }); return; }
    const r = { id: this.projId++, owner: e, pos: { x: o.x + d.x * 0.6, y: o.y + d.y * 0.6, z: o.z + d.z * 0.6 }, dir: d, born: this.T };
    this.rockets.push(r); this.events.push(['rk', r.id, e.id, arr3(r.pos), arr3(d)]);
  }
  stepProjectiles(dt) {
    for (let i = this.nades.length - 1; i >= 0; i--) {
      const n = this.nades[i]; for (let s = 0; s < 2; s++) this.P.stepNade(n.pos, n.vel, dt / 2);
      if (this.T >= n.explodeAt) { this.nades.splice(i, 1); this.blast({ ...n.pos }, n.owner, { radius: NADE.radius, maxDmg: NADE.maxDmg, selfMul: NADE.selfMul, knock: NADE.knock, lift: NADE.lift, wIdx: W_NADE, kind: 'n', pid: n.id }); }
    }
    const R = WEAPONS[3].rocket;
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i], step = R.speed * dt; let hitT = this.P.rayWorld(r.pos, r.dir, step + 0.1), hitE = null;
      for (const e of this.ents.values()) {
        if (!e.alive || (!e.bot && !e.connected) || (e === r.owner && this.T - r.born < 0.3)) continue;
        if (this.friends(e, r.owner)) continue;
        const t = rayCapsule(r.pos, r.dir, step + 0.1, e.pos, ROCKET_PAD); if (t !== null && (hitT === null || t < hitT)) { hitT = t; hitE = e; } // casco do Docão
      }
      if (hitT !== null || this.T - r.born > 6) {
        const t = Math.max(0, (hitT ?? 0) - 0.05); this.rockets.splice(i, 1);
        this.blast({ x: r.pos.x + r.dir.x * t, y: r.pos.y + r.dir.y * t, z: r.pos.z + r.dir.z * t }, r.owner, { ...R, wIdx: 3, kind: 'r', pid: r.id }, hitE); continue;
      }
      r.pos.x += r.dir.x * step; r.pos.y += r.dir.y * step; r.pos.z += r.dir.z * step;
    }
  }
  // ---------- renascimento e pickups ----------
  pickSpawn(e) {
    let best = this.spawns[0], bd = -Infinity;
    for (const s of this.spawns) {
      let md = 1e9, seen = false; const eye = { x: s.x, y: s.y + 1.5, z: s.z };
      for (const o of this.ents.values()) { if (o === e || !o.alive || this.friends(o, e)) continue; const d = dist(o.pos, s); md = Math.min(md, d); if (!seen && d < 60 && this.P.losClear(eye, center(o, 1.5))) seen = true; }
      const score = Math.min(md, 40) + Math.random() * 6 - (seen ? 30 : 0); if (score > bd) { bd = score; best = s; }
    }
    return best;
  }
  spawn(e, silent = false) {
    const s = this.pickSpawn(e); e.pos = { ...s }; e.vel = { x: 0, y: 0, z: 0 }; e.hp = 100; e.alive = true; e.invulnUntil = this.T + INVULN; e.sq++;
    if (e.bot && Math.random() < 0.3) e.nextPrimary = pick(PRIMARIES);
    e.primary = e.nextPrimary; e.slots = [e.primary, PISTOL]; e.weapon = e.primary; e.mag = WEAPONS.map((w) => w.mag); e.reserve = WEAPONS.map((w) => w.reserve); e.reload = null; e.nades = NADE.spawnWith;
    e.yaw = Math.atan2(-s.x, -s.z); e.pitch = 0; // modelo olhando pro centro
    e.hist = []; this.pushHist(e); e.lastUpd = this.now();
    if (e.bot) Object.assign(e, { target: null, wp: null, path: null, stuck: 0, reloadEnd: 0 });
    this.events.push(['sp', e.id, arr3(e.pos), r2(e.yaw), e.primary, e.sq]);
  }
  refillAmmo(e) {
    let got = false;
    for (const i of e.slots) { const w = WEAPONS[i]; if (e.reserve[i] >= w.reserve) continue; e.reserve[i] = w.rocket ? Math.min(w.reserve, e.reserve[i] + 1) : w.reserve; got = true; }
    return got;
  }
  updatePickups() {
    this.pickups.forEach((p, i) => {
      if (!p.active) { if (this.T >= p.respawnAt) { p.active = true; this.events.push(['pk', i, 1]); } return; }
      for (const e of this.ents.values()) {
        if (!e.alive || (!e.bot && !e.connected)) continue;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z; if (dx * dx + dz * dz > 1.5 || Math.abs(e.pos.y - p.pos.y) > 1.5) continue;
        if (p.type === 'health') { if (e.hp >= 100) continue; e.hp = Math.min(100, e.hp + 50); }
        else if (p.type === 'grenade') { if (e.nades >= NADE.max) continue; e.nades++; }
        else if (!this.refillAmmo(e)) continue;
        p.active = false; p.respawnAt = this.T + (p.type === 'grenade' ? NADE.pickupRespawn : 15);
        this.events.push(['pk', i, 0]); if (!e.bot) this.toMe(e, ['got', p.type, Math.round(e.hp), e.nades]);
        break;
      }
    });
  }
  toMe(e, ev) { if (e.bot) return; if (!this.personal.has(e.id)) this.personal.set(e.id, []); this.personal.get(e.id).push(ev); }
  // ---------- laço do servidor (20 Hz) ----------
  tick() {
    if (this.state !== 'playing') return;
    const t = this.now(); let dt = clamp(t - this.lastTick, 0, 0.25); this.lastTick = t;
    this.T = t - this.t0; this.purge();
    while (dt > 1e-4) { const h = Math.min(TICK, dt); dt -= h; for (const e of this.ents.values()) if (e.bot) this.updateBot(e, h); this.stepProjectiles(h); }
    for (const e of this.ents.values()) {
      if (!e.alive && (e.bot || e.connected) && this.T >= e.respawnAt && !(e.pendingTeam && this.now() - (e.pendingSince || 0) < PENDING_WAIT)) { if (e.pendingTeam) { e.pendingTeam = false; this.syncBots(); } this.spawn(e); }
      if (e.bot) this.pushHist(e);
      if (!e.bot && e.alive) this.progressReload(e);
    }
    this.updatePickups();
    if (this.zone) this.updateZone(TICK_DT(this));
    const snap = { t: 's', T: r2(this.T), d: this.zoneArr() || undefined, e: [...this.ents.values()].filter((e) => e.bot || e.connected).map((e) => [e.id, r2(e.pos.x), r2(e.pos.y), r2(e.pos.z), r2(e.yaw), r2(e.pitch), e.weapon,
      (e.alive ? 1 : 0) | (this.T < e.invulnUntil ? 2 : 0) | (e.onGround ? 4 : 0) | ((e.bot ? e.reloadEnd > this.T : !!e.reload) ? 8 : 0), Math.round(e.hp), e.ping]), ev: this.events };
    this.events = [];
    this.io.broadcast(snap);
    for (const [id, evs] of this.personal) this.io.send(id, { t: 'p', ev: evs }); this.personal.clear();
    if (this.pendingEnd || this.T >= this.timeLimit) { this.pendingEnd = false; this.endMatch(); }
  }
  updateZone(dt) {
    const z = this.zone, got = stepZone(z, zoneCounts(z, this.live()), dt);
    if (got >= 0) {
      this.teamScore[got]++; for (const e of this.live()) if (e.alive && e.team === got && inZone(z, e.pos)) e.caps++;
      const nz = newZoneState(pickZone(this.nav, z)); this.zone = nz;
      this.events.push(['zc', got, this.teamScore[0], this.teamScore[1], [r2(nz.x), r2(nz.y), r2(nz.z)], [...this.live()].filter((e) => e.caps).map((e) => [e.id, e.caps])]);
      if (this.teamScore[got] >= DOM.WIN_CAPS) this.pendingEnd = true;
    }
  }
  // ---------- bots (mesma lógica dos bots offline, sem Three.js) ----------
  randomWaypoint() { const n = this.nav.randomNode(); return n ? { x: n.x, y: n.y, z: n.z } : { x: rand(-10, 10), y: 0, z: rand(-10, 10) }; }
  steer(b, goal) {
    if (!b.path || !b.pathGoal || dist(b.pathGoal, goal) > 2 || this.T > b.repathAt) { b.path = this.nav.path(b.pos, goal) || []; b.pathGoal = { ...goal }; b.repathAt = this.T + rand(2.5, 3.5); }
    const P = b.path;
    while (P.length) { const n = P[0], dx = n.x - b.pos.x, dz = n.z - b.pos.z; if (dx * dx + dz * dz < 0.8 && Math.abs(n.y - b.pos.y) < 1.4) P.shift(); else break; }
    let tgt = P.length ? P[0] : goal;
    if (P.length > 1 && this.T > (b.nextShortcut || 0)) { b.nextShortcut = this.T + 0.25; const n2 = P[1]; if (Math.abs(n2.y - b.pos.y) < 0.3 && Math.abs(P[0].y - b.pos.y) < 0.3 && Math.hypot(n2.x - b.pos.x, n2.z - b.pos.z) < 3.2 && this.nav.walk(b.pos, n2) >= 0) { P.shift(); tgt = n2; } }
    const vx = tgt.x - b.pos.x, vz = tgt.z - b.pos.z, L = Math.hypot(vx, vz); return L > 0.1 ? { x: vx / L, z: vz / L } : null;
  }
  // Dominação: ponto dentro da zona pra onde o bot vai (null = já está dentro, ou modo sem zona)
  zoneGoal(b) {
    const z = this.zone; if (!z) return null;
    if (inZone(z, b.pos) && Math.hypot(b.pos.x - z.x, b.pos.z - z.z) < DOM.RADIUS * 0.7) return null;
    if (!b.zoneOff || b.zoneOff.z !== z) { const a = rand(0, Math.PI * 2), r = rand(0, DOM.RADIUS * 0.5); b.zoneOff = { z, x: Math.cos(a) * r, zz: Math.sin(a) * r }; }
    return { x: z.x + b.zoneOff.x, y: z.y, z: z.z + b.zoneOff.zz };
  }
  botWeaponFor(b, d) { const pr = b.primary; if (pr === 1) return d < 14 ? pr : PISTOL; if (pr === 2) return d >= 9 ? pr : PISTOL; if (pr === 3) return d >= 6 && d <= 28 ? pr : PISTOL; return pr; }
  updateBot(b, dt) {
    if (!b.alive) return;
    if (b.reloadEnd && this.T >= b.reloadEnd) { b.mag[b.weapon] = WEAPONS[b.weapon].mag; b.reloadEnd = 0; }
    b.think -= dt;
    if (b.think <= 0) {
      b.think = rand(0.18, 0.32); let best = null, bs = 1e9; const eye = center(b, 1.5);
      for (const o of this.ents.values()) {
        if (o === b || !o.alive || (!o.bot && !o.connected) || this.friends(o, b)) continue; const d = dist(o.pos, b.pos); if (d > 55) continue;
        const score = d * (o.id === b.lastAttacker ? 0.5 : 1) * (!o.bot ? 0.85 : 1);
        if (score < bs && this.P.losClear(eye, center(o, 1.2))) { best = o; bs = score; }
      }
      if (best !== b.target) { b.target = best; b.aim = 0; }
      if (best) { b.lastSeen = { ...best.pos }; b.lastSeenAt = this.T; }
    }
    if (b.target && !b.target.alive) b.target = null;
    const t = b.target; let mx = 0, mz = 0, desiredYaw = b.yaw;
    const face = (x, z) => Math.atan2(x, z); // yaw do modelo (o boneco olha pra +z)
    if (t) {
      let tx = t.pos.x - b.pos.x, tz = t.pos.z - b.pos.z; const d = Math.hypot(tx, tz) || 1; tx /= d; tz /= d; desiredYaw = face(tx, tz);
      const want = this.botWeaponFor(b, d); if (want !== b.weapon && !b.reloadEnd) { b.weapon = want; b.nextFire = Math.max(b.nextFire, this.T + 0.35); }
      const range = BOT_RANGE[b.weapon];
      const zg = this.zoneGoal(b);
      if (zg) { const st = this.steer(b, zg); if (st) { mx += st.x * 1.5; mz += st.z * 1.5; } } // Dominação: vai pra zona atirando
      else if (this.zone) { /* dentro da zona: segura a posição, só strafe */ }
      else if (Math.abs(t.pos.y - b.pos.y) > 1.2 && d > 3) { const st = this.steer(b, t.pos); if (st) { mx += st.x; mz += st.z; } }
      else if (d > range + 3) { mx += tx; mz += tz; } else if (d < range - 3) { mx -= tx; mz -= tz; }
      b.strafeT -= dt; if (b.strafeT <= 0) { b.strafeDir = pick([-1, 1, 1, -1, 0]); b.strafeT = rand(0.6, 1.8); if (Math.random() < 0.15 && b.onGround) b.vel.y = JUMP; }
      mx += tz * b.strafeDir * 0.8; mz += -tx * b.strafeDir * 0.8;
      if (b.nades > 0 && d > 8 && d < 24 && this.T > b.nextNade && b.aim > b.reaction && Math.abs(t.pos.y - b.pos.y) < 3) { if (Math.random() < 0.35) this.botThrow(b, t); else b.nextNade = this.T + rand(1.5, 3); }
      b.aim += dt;
      let diff = desiredYaw - b.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (b.aim > b.reaction + (b.weapon === 2 ? 0.8 : 0) && Math.abs(diff) < 0.35) this.botShoot(b, t, d);
    } else {
      let goal = null;
      const near = (type, maxD) => this.pickups.filter((p) => p.active && p.type === type && dist(p.pos, b.pos) < maxD).sort((a, c) => dist(a.pos, b.pos) - dist(c.pos, b.pos))[0];
      const hp = b.hp < 45 ? near('health', 1e9) : null, np = !hp && b.nades < 2 ? near('grenade', 22) : null;
      const zg = this.zoneGoal(b);
      if (hp && b.hp < 30) goal = hp.pos; else if (zg) goal = zg; else if (this.zone) goal = b.pos; else if (hp) goal = hp.pos; else if (np) goal = np.pos; else if (b.lastSeen && this.T - b.lastSeenAt < 4) goal = b.lastSeen; else { if (!b.wp) b.wp = this.randomWaypoint(); goal = b.wp; }
      const gx = goal.x - b.pos.x, gz = goal.z - b.pos.z;
      if (Math.hypot(gx, gz) < 1.5 && Math.abs(goal.y - b.pos.y) < 1.5) { if (goal === b.wp) b.wp = null; else b.lastSeenAt = -99; }
      else { const st = this.steer(b, goal) || { x: gx / Math.hypot(gx, gz), z: gz / Math.hypot(gx, gz) }; mx = st.x; mz = st.z; desiredYaw = face(st.x, st.z); }
      if (b.mag[b.weapon] < WEAPONS[b.weapon].mag * 0.5 && !b.reloadEnd) b.reloadEnd = this.T + WEAPONS[b.weapon].reload;
    }
    const ml = Math.hypot(mx, mz); if (ml > 0) { mx = mx / ml * BOT_SPEED; mz = mz / ml * BOT_SPEED; }
    const acc = b.onGround ? 10 : 3; b.vel.x += (mx - b.vel.x) * Math.min(1, acc * dt); b.vel.z += (mz - b.vel.z) * Math.min(1, acc * dt);
    const blocked = this.P.moveEntity(b, dt);
    if (b.alive && fellOff(this.fall, b.pos.y)) { this.kill(b, null, W_FALL, false); return; }
    if (blocked) { b.stuck += dt; if (b.onGround) b.vel.y = JUMP; if (b.stuck > 1.2) { b.wp = this.randomWaypoint(); b.path = null; b.lastSeenAt = -99; b.strafeDir *= -1; b.stuck = 0; b.stuckCount = (b.stuckCount || 0) + 1; } }
    else b.stuck = Math.max(0, b.stuck - dt);
    let d = desiredYaw - b.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); b.yaw += d * Math.min(1, dt * 9);
    for (const i of b.slots) if (b.reserve[i] < WEAPONS[i].mag && !(WEAPONS[i].rocket && b.reserve[i] > 0)) b.reserve[i] = WEAPONS[i].reserve;
  }
  botShoot(b, t, d) {
    const w = WEAPONS[b.weapon];
    if (this.T < b.nextFire || b.reloadEnd > this.T) return;
    if (b.mag[b.weapon] <= 0) { b.reloadEnd = this.T + w.reload; return; }
    if (w.rocket && d < 6) return;
    b.mag[b.weapon]--; b.nextFire = this.T + w.rate * [rand(2.2, 3.4), 1.4, 1.6, 1, rand(1.8, 2.6)][b.weapon]; b.invulnUntil = Math.min(b.invulnUntil, this.T);
    const o = center(b, 1.3), tMoving = Math.hypot(t.vel.x, t.vel.z) > 2 ? 1.5 : 1;
    if (w.rocket) { const lead = d / w.rocket.speed, at = { x: t.pos.x + t.vel.x * lead + rand(-0.8, 0.8), y: t.pos.y + 0.25, z: t.pos.z + t.vel.z * lead + rand(-0.8, 0.8) }; const oo = center(b, 1.4); this.launchRocket(b, oo, norm({ x: at.x - oo.x, y: at.y - oo.y, z: at.z - oo.z })); return; }
    const aim = w.scope ? center(t, rand(0.75, 1.15)) : center(t, rand(0.7, 1.6)); aim.x += rand(-0.3, 0.3); aim.z += rand(-0.3, 0.3);
    const base = norm({ x: aim.x - o.x, y: aim.y - o.y, z: aim.z - o.z });
    const spread = w.pellets > 1 ? w.spread * 1.2 : w.scope ? 0.02 * tMoving : b.accuracy * tMoving * (b.weapon === PISTOL ? 0.9 : 1);
    const dirs = []; for (let p = 0; p < Math.max(1, w.pellets); p++) dirs.push(norm({ x: base.x + (Math.random() - 0.5) * 2 * spread, y: base.y + (Math.random() - 0.5) * 2 * spread, z: base.z + (Math.random() - 0.5) * 2 * spread }));
    this.hitscan(b, o, dirs, b.weapon);
    if (w.scope) b.aim = b.reaction * 0.4;
  }
  botThrow(b, t) {
    const from = center(b, 1.6), to = { x: t.pos.x + t.vel.x * 0.6 + rand(-1.2, 1.2), y: t.pos.y + 0.2, z: t.pos.z + t.vel.z * 0.6 + rand(-1.2, 1.2) };
    const dx = to.x - from.x, dz = to.z - from.z, T = 0.55 + Math.hypot(dx, dz) / 16, g = -NADE.grav;
    b.nades--; this.throwNade(b, from, { x: dx / T, y: (to.y - from.y + 0.5 * g * T * T) / T, z: dz / T }); b.nextNade = this.T + rand(7, 13);
  }
}
