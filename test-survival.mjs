// Survival da Invasão: tiers da Papada, débito, caixa, parede e loadout. Só Node.
// Uso: node test-survival.mjs
import { Game } from './server/src/game.js';
import { getMap, INV_MAPS } from './maps.js';
import { mapSolids, createPhysics } from './shared/physics.js';
import { RAY as RAY_MOVE, stepRay, raySplash } from './shared/ray.js';
import { buildNav } from './nav.js';
import { WEAPONS, PISTOL, KNIFE, UZI, RAY, PRIMARIES, SECONDARIES, CATEGORIES, BOT_PRIMARIES } from './shared/rules.js';
import { waveSpec, ZOMBIES } from './shared/invasion.js';
import {
  PAPADA_NAME, BOX_NAME, SURV, PAP_COST, SURV_ID, PADRAO_ID,
  isSurvival, normSurv, papOk, papRefuse, withPap, tryPap, tryBoxPay, rollBox, takeBox, tryWall,
  applySurvivalLoadout, grantHit, grantKill, killPoints, stationsFor, registerSurvivalMap,
  exclusiveSurvivalMap, SURVIVAL_LAYOUTS, settleLayout, statLine, shownDmg, WALL_CATALOG, BOX_POOL,
  survRefill, fmtPts, papName, RAY_ODDS,
} from './shared/survival.js';

const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };

ok(PAPADA_NAME === 'Papada' && BOX_NAME === 'Barraca da Sorte', `nomes: ${PAPADA_NAME} e ${BOX_NAME}`);
ok(PAP_COST.join(',') === '10000,25000,50000', `tiers custam ${PAP_COST.join(' / ')}`);
ok(SURV.boxPrice >= 950 && SURV.boxPrice <= 1500, `barraca custa ${SURV.boxPrice}`);
ok(normSurv('survival') === SURV_ID && normSurv('qualquer') === PADRAO_ID && !isSurvival('padrao'), 'variante desconhecida vira Padrão');

// faca, sabre, tampa e minigun não entram
ok(papRefuse(WEAPONS[KNIFE]) === 'lamina' && papRefuse(WEAPONS[8]) === 'lamina', 'faca e sabre: a Papada recusa lâmina');
ok(papRefuse(WEAPONS.find((w) => w.shield)) === 'escudo', 'tampa não entra');
ok(papRefuse(WEAPONS.find((w) => w.key === 'minigun')) === 'especial', 'minigun não entra');
ok(papOk(WEAPONS[PISTOL]) && papOk(WEAPONS[0]) && papOk(WEAPONS[3]), 'pistola, fuzil e bazuca podem');

// tiers sequenciais, dano perceptível e não absurdo, munição cheia
{
  const e = { weapon: PISTOL, pts: 0, slots: [PISTOL, PISTOL, KNIFE], slotOn: [1, 0, 1], mag: WEAPONS.map((w) => w.mag), reserve: WEAPONS.map((w) => w.reserve) };
  const poor = tryPap(e);
  ok(!poor.ok && poor.reason === 'pontos' && e.pts === 0 && !(e.pap && e.pap[PISTOL]), `sem dinheiro não debita (${poor.have}/${poor.cost})`);
  e.pts = 10000;
  const a = tryPap(e);
  ok(a.ok && a.tier === 1 && a.cost === 10000 && e.pts === 0, `tier 1 debita 10.000 e sobra ${e.pts}`);
  ok(e.pap[PISTOL] === 1 && e.mag[PISTOL] === withPap(WEAPONS[PISTOL], 1).mag && e.reserve[PISTOL] === withPap(WEAPONS[PISTOL], 1).reserve, 'tier 1 enche pente e reserva no tamanho novo');
  const again = tryPap({ ...e, pts: 25000, weapon: PISTOL, pap: { ...e.pap }, mag: e.mag.slice(), reserve: e.reserve.slice(), slotOn: e.slotOn });
  ok(again.ok && again.tier === 2 && again.cost === 25000 && e.pap[PISTOL] === 1, 'o mesmo índice sobe pro tier 2 pagando 25.000, sem repetir o preço do 1');
  e.pts = 25000; const b = tryPap(e);
  e.pts = 50000; const c = tryPap(e);
  ok(b.tier === 2 && c.tier === 3 && e.pap[PISTOL] === 3, 'sequência 1 → 2 → 3 na mesma arma');
  const max = tryPap(e);
  ok(!max.ok && max.reason === 'max' && e.pap[PISTOL] === 3, 'tier 3 não sobe de novo');
  const d0 = shownDmg(WEAPONS[PISTOL], 0), d1 = shownDmg(WEAPONS[PISTOL], 1), d2 = shownDmg(WEAPONS[PISTOL], 2), d3 = shownDmg(WEAPONS[PISTOL], 3);
  ok(d1 > d0 * 1.4 && d2 > d1 * 1.25 && d3 > d2 * 1.2 && d3 < d0 * 3.3, `pistola ${d0} → ${d1} → ${d2} → ${d3} (perceptível, não absurdo)`);
  const line = statLine(WEAPONS[PISTOL], 0, 1);
  ok(line.text.includes('dano') && line.text.includes('→') && line.after.tier === 1, `prompt: ${line.text}`);
  const sn = shownDmg(WEAPONS[2], 3) / shownDmg(WEAPONS[2], 0);
  ok(sn > 1.8 && sn < 2.3, `Torresmo no tier 3 fica em ${sn.toFixed(2)}× (teto de sniper)`);
  const sh = shownDmg(WEAPONS[1], 3) / shownDmg(WEAPONS[1], 0);
  ok(sh > 2 && sh < 2.6, `Calibre 12 no tier 3 fica em ${sh.toFixed(2)}×`);
  e.weapon = KNIFE;
  const knife = tryPap(e);
  ok(!knife.ok && knife.reason === 'lamina' && e.pap[KNIFE] == null, 'faca na mão não debita');
}

// Padrão não é Survival: a função de variante barra, e o servidor recusa
ok(!isSurvival(PADRAO_ID) && isSurvival(SURV_ID), 'Padrão e Survival são variantes diferentes');

// mystery box
{
  const e = applySurvivalLoadout({ pts: SURV.boxPrice });
  const pay = tryBoxPay(e);
  ok(pay.ok && e.pts === 0 && pay.cost === SURV.boxPrice, `barraca debita ${SURV.boxPrice}`);
  const broke = tryBoxPay(e);
  ok(!broke.ok && broke.reason === 'pontos', 'sem ponto a barraca não gira');
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(rollBox(() => RAY_ODDS + (i / 500) * (1 - RAY_ODDS - 1e-6)));
  ok(BOX_POOL.every((w) => seen.has(w)) && ![...seen].some((w) => w !== RAY && !papOk(WEAPONS[w])), `sorteio cobre o pool (${BOX_POOL.length}) e não sai faca nem tampa`);
  const rolled = UZI;
  const got = takeBox(e, rolled);
  ok(got.how === 'add' && e.slotOn[1] === 1 && e.slots[1] === UZI && e.weapon === UZI && e.slots[0] === PISTOL, 'primeira arma da barraca ocupa o segundo slot e a pistola fica');
  e.weapon = UZI;
  const swap = takeBox(e, 0);
  ok(swap.how === 'swap' && e.slots[1] === 0 && e.slots[0] === PISTOL, 'com duas armas, troca a que está na mão');
  e.weapon = KNIFE;
  takeBox(e, FAMAS_SAFE());
  ok(e.slots[0] !== PISTOL && e.slots[2] === KNIFE, 'de faca na mão, a troca cai na primária e a faca fica');
}
function FAMAS_SAFE() { return 15; }

// parede: compra e recompra mais barata
{
  const wall = WALL_CATALOG.find((w) => w.w === UZI);
  const e = applySurvivalLoadout({ pts: wall.price - 1 });
  const no = tryWall(e, wall);
  ok(!no.ok && no.reason === 'pontos' && e.pts === wall.price - 1 && e.slotOn[1] === 0, 'parede não fiada');
  e.pts = wall.price;
  const buy = tryWall(e, wall);
  ok(buy.ok && buy.kind === 'add' && buy.cost === wall.price && e.slots[1] === UZI && e.mag[UZI] === withPap(WEAPONS[UZI], 0).mag, `MP5K na parede por ${wall.price}, munição cheia`);
  e.mag[UZI] = 0; e.reserve[UZI] = 0; e.pts = wall.ammo;
  const ammo = tryWall(e, wall);
  ok(ammo.ok && ammo.kind === 'ammo' && ammo.cost === wall.ammo && ammo.cost < wall.price && e.mag[UZI] > 0, `recompra de munição sai ${wall.ammo}, mais barata que a arma`);
  const full = tryWall(e, wall);
  ok(!full.ok && full.reason === 'cheia', 'cheio não gasta a recompra');
  ok(WALL_CATALOG.every((w) => w.price > w.ammo && w.ammo > 0), 'toda arma de parede tem recompra mais barata');
}

// loadout do Survival ignora a classe
{
  const e = { nextPrimary: 0, nextSecondary: 23, nextMelee: 8, slots: [0, 23, 8], weapon: 0, pts: 400, pap: { 4: 2 } };
  applySurvivalLoadout(e);
  ok(e.slots[0] === PISTOL && e.slotOn[1] === 0 && e.slots[2] === KNIFE && e.weapon === PISTOL, 'nasce pistola + faca, secundária fechada');
  ok(e.pap[PISTOL] === 2 && e.pts === 400, 'respawn não apaga tier nem pontos');
  ok(e.mag[PISTOL] === withPap(WEAPONS[PISTOL], 2).mag, 'a pistola que já passou na Papada renasce no tier');
  const base = WEAPONS[0].reserve;
  const holder = applySurvivalLoadout({ pts: 0, pap: {} });
  holder.slots = [0, PISTOL, KNIFE]; holder.slotOn = [1, 1, 1]; holder.pap[0] = 3;
  holder.mag[0] = 0; holder.reserve[0] = 0;
  ok(survRefill(holder) && holder.reserve[0] > base, `caixa de munição não encolhe a reserva do tier 3 (${holder.reserve[0]} > ${base})`);
}

// pontos: acerto, teto e abate
{
  const e = { pts: 0 };
  let h = 0; for (let i = 0; i < SURV.hitCap + 5; i++) h += grantHit(e, 7);
  ok(h === SURV.hit * SURV.hitCap && e.pts === h, `teto de ${SURV.hitCap} acertos no mesmo zumbi`);
  const k = grantKill(e, 'walker', true);
  ok(k === killPoints('walker', true) && k > killPoints('walker', false), `abate no focinho paga ${k}`);
  ok(killPoints('boss', false) > killPoints('tank', false) && killPoints('tank', false) > killPoints('walker', false), 'chefão paga mais que barrigão, que paga mais que podre');
}

// curva: desafiador no começo, Papada 3 alcançável antes do fim
{
  const dmgAt = (tier) => shownDmg(WEAPONS[PISTOL], tier);
  let pts = 0, tier = 0, spent = 0, when = [0, 0, 0];
  const perWave = [];
  for (let w = 1; w <= 20; w++) {
    const spec = waveSpec(w, 1);
    const mix = spec.mix; const sum = Object.values(mix).reduce((a, b) => a + b, 0);
    let wavePts = 0;
    for (const [zt, weight] of Object.entries(mix)) {
      const n = Math.round(spec.total * weight / sum);
      const hp = ZOMBIES[zt].hp * spec.hpMul;
      const dmg = dmgAt(tier);
      const shots = Math.max(1, Math.ceil(hp / dmg));
      const paid = Math.min(SURV.hitCap, shots - 1);
      wavePts += n * (paid * SURV.hit + killPoints(zt, false));
    }
    if (spec.boss) {
      const hp = spec.bossHp;
      const dmg = dmgAt(tier);
      const shots = Math.max(1, Math.ceil(hp / dmg));
      wavePts += Math.min(SURV.hitCap, shots - 1) * SURV.hit + killPoints('boss', false);
    }
    pts += wavePts; perWave.push(pts);
    while (tier < 3 && pts - spent >= PAP_COST[tier]) { spent += PAP_COST[tier]; tier++; when[tier - 1] = w; }
  }
  const bill = PAP_COST[0] + PAP_COST[1] + PAP_COST[2] + SURV.boxPrice + WALL_CATALOG.find((w) => w.w === UZI).price;
  ok(perWave[1] < PAP_COST[0], `duas waves não pagam a Papada (${fmtPts(perWave[1])} < 10.000)`);
  ok(when[0] >= 3 && when[0] <= 6, `tier 1 por volta da wave ${when[0]}`);
  ok(when[1] > when[0] && when[1] <= 10, `tier 2 na wave ${when[1]}`);
  ok(when[2] > when[1] && when[2] <= 16, `tier 3 na wave ${when[2]}, antes do fim`);
  ok(perWave[13] >= bill, `wave 14 já cobriu Papada completa + barraca + uma parede (${fmtPts(perWave[13])} >= ${fmtPts(bill)})`);
  ok(perWave[6] < bill, `no meio (wave 7) ainda não fecha a conta toda (${fmtPts(perWave[6])})`);
  console.log('     curva solo (pistola, sem headshot): ' + when.map((w, i) => `T${i + 1}@wave ${w}`).join(' · ') + ` · wave20 ${fmtPts(perWave[19])}`);
}

// layouts: dados por mapa, exclusive plugável, posições de teste nos mapas atuais
{
  delete SURVIVAL_LAYOUTS['hotmilk-noite'];
  ok(exclusiveSurvivalMap(['hotmilk-noite', 'rodizio']) === null, 'sem registro, nenhum mapa é exclusivo do Survival');
  registerSurvivalMap('hotmilk-noite', {
    exclusive: true,
    papada: { x: 1, z: 2, yaw: 0.5 },
    box: { x: 4, z: -3, yaw: 1 },
    walls: [{ w: UZI, x: -2, z: 1, yaw: 0 }],
    doors: [{ id: 'porteira', x: 0, z: 0, yaw: 0, price: 750 }],
  });
  ok(exclusiveSurvivalMap(['rodizio']) === null, 'exclusive só vale se o id existe na lista conhecida');
  ok(exclusiveSurvivalMap(['hotmilk-noite', 'rodizio']) === 'hotmilk-noite', 'Hotmilk à noite registrado vira o único mapa do Survival');
  const lay = stationsFor({ id: 'hotmilk-noite', size: [40, 40], spawns: [[0, 0]] });
  ok(!lay.test && lay.papada.x === 1 && lay.box.z === -3 && lay.walls[0].price === WALL_CATALOG.find((w) => w.w === UZI).price && lay.doors[0].id === 'porteira' && lay.doors[0].price === 750, 'layout do mapa usa os dados, preço de parede padrão e a porta');
  delete SURVIVAL_LAYOUTS['hotmilk-noite'];
  for (const map of INV_MAPS) {
    const s = stationsFor(map);
    ok(s.papada && s.box && s.walls.length >= 5 && s.test, `${map.id}: posições de teste (papada, barraca, ${s.walls.length} paredes)`);
    const solids = mapSolids(map), P = createPhysics(solids, map.size);
    const placed = settleLayout(s, map, P);
    const spots = [placed.papada, placed.box, ...placed.walls];
    const bad = spots.filter((p) => P.collides(p.x, p.y + 0.4, p.z) || Math.abs(p.x) > map.size[0] - 1 || Math.abs(p.z) > map.size[1] - 1);
    ok(bad.length === 0, `${map.id}: estações fora de parede ${bad.length ? JSON.stringify(bad.map((p) => [p.x, p.z])) : ''}`);
    const nav = buildNav({ hx: map.size[0], hz: map.size[1], spacing: map.navSpacing || 2, collides: P.collides, groundAt: P.groundAt, solids, topAt: P.topAt, seeds: map.spawns.map((s) => [s[0], s[2] || 0, s[1]]), extra: map.waypoints || [] });
    const far = spots.filter((p) => {
      let d = 1e9; for (const n of nav.nodes) d = Math.min(d, Math.hypot(n.x - p.x, n.z - p.z));
      return d > 3.2;
    });
    ok(far.length === 0, `${map.id}: estações alcançáveis a pé ${far.length ? JSON.stringify(far.map((p) => [+p.x.toFixed(1), +p.z.toFixed(1)])) : ''}`);
  }
}

// servidor: Survival debita e sincroniza; Padrão recusa; respawn volta pra pistola e faca
function room(surv) {
  const g = new Game({ code: 'TEST', map: 'fazenda-assombrada', max: 4, fillBots: false, mode: 'inv', surv }, { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} });
  let fake = 1000; g.now = () => fake;
  const a = g.join({ name: 'A' }).ent; g.welcome(a);
  g.onMessage(a.id, { t: 'start' }); a.connected = true;
  const step = (n = 1, d = 0.05) => { for (let i = 0; i < n; i++) { fake += d; g.tick(); } };
  step(3);
  return { g, a, step };
}
{
  const { g, a } = room(SURV_ID);
  ok(g.survival && a.slots[0] === PISTOL && a.slotOn[1] === 0 && a.slots[2] === KNIFE && a.weapon === PISTOL, 'servidor Survival: nasce pistola e faca');
  ok(g.stations && g.stations.papada && g.stations.box && g.stations.walls.length >= 5, 'servidor monta as estações do mapa');
  a.pts = 10000; a.pos = { ...g.stations.papada, y: g.stations.papada.y }; a.weapon = PISTOL;
  g.onEvent(a, ['sv', 'pap']);
  ok(a.pap[PISTOL] === 1 && a.pts === 0, 'servidor debita a Papada e grava o tier');
  a.pts = 100000; a.pos = { x: a.pos.x + 30, y: a.pos.y, z: a.pos.z };
  const before = a.pts; g.onEvent(a, ['sv', 'pap']);
  ok(a.pap[PISTOL] === 1 && a.pts === before, 'longe da máquina o servidor não debita');
  a.pos = { ...g.stations.papada, y: g.stations.papada.y }; a.weapon = KNIFE;
  g.onEvent(a, ['sv', 'pap']);
  ok(a.pap[KNIFE] == null && a.pts === before, 'servidor recusa faca');
  a.weapon = PISTOL; a.papUntil = g.T; g.onEvent(a, ['sv', 'pap']); a.papUntil = g.T; g.onEvent(a, ['sv', 'pap']);
  ok(a.pap[PISTOL] === 3, `servidor sobe até o tier 3 (ficou ${a.pap[PISTOL]}, pontos ${a.pts})`);
  const pts3 = a.pts; a.papUntil = g.T; g.onEvent(a, ['sv', 'pap']);
  ok(a.pap[PISTOL] === 3 && a.pts === pts3, 'servidor não cobra um quarto tier');
  a.pos = { ...g.stations.box, y: g.stations.box.y };
  const boxBefore = a.pts; g.onEvent(a, ['sv', 'box']);
  ok(a.pts === boxBefore - SURV.boxPrice && g.boxState.phase === 'spin', 'servidor debita a barraca e trava o sorteio');
  g.boxState.until = g.T; g.tick();
  ok(g.boxState.phase === 'offer' && (BOX_POOL.includes(g.boxState.weapon) || g.boxState.weapon === RAY), `oferta da barraca é do pool ou a Ray Gun (${g.boxState.weapon})`);
  const offered = g.boxState.weapon;
  g.onEvent(a, ['sv', 'take']);
  ok(a.slots.includes(offered) && g.boxState.phase === 'idle', 'pegar a oferta entrega a arma e fecha a barraca');
  const wi = g.stations.walls.findIndex((w) => !a.slots.includes(w.w) || (a.slotOn[1] === 0 && w.w !== a.slots[0]));
  const wall = g.stations.walls[wi];
  a.pos = { x: wall.x, y: wall.y, z: wall.z };
  const had = a.pts; g.onEvent(a, ['sv', 'wall', wi]);
  ok(a.pts < had && a.slots.includes(wall.w), `parede debita no servidor (${WEAPONS[wall.w].short})`);
  // respawn: pistola e faca de novo, tier da pistola continua
  a.alive = false; a.respawnAt = g.T; a.rsReq = true; g.tick();
  ok(a.alive && a.slots[0] === PISTOL && a.slotOn[1] === 0 && a.slots[2] === KNIFE && a.pap[PISTOL] === 3, 'respawn Survival volta pra pistola e faca e guarda o tier');
}
{
  const { g, a } = room(PADRAO_ID);
  ok(!g.survival && !g.stations, 'Padrão não monta loja');
  const prim = a.primary; a.pts = 999999; a.weapon = a.slots[0];
  g.onEvent(a, ['sv', 'pap']); g.onEvent(a, ['sv', 'box']); g.onEvent(a, ['sv', 'wall', 0]);
  ok(a.pts === 999999 && !(a.pap && a.pap[a.weapon]) && a.primary === prim, 'Padrão: servidor não debita e não mexe na arma');
  ok(a.slots[0] !== PISTOL || a.slotOn == null || a.slotOn[1] !== 0, 'Padrão não força pistola e faca');
}

// Ray Gun: só a barraca, no Survival, com ricochete e estouro. Não entra em parede, classe, loadout nem Padrão.
{
  const W = WEAPONS[RAY];
  ok(RAY === 27 && W && W.key === 'ray' && W.ray && W.mag === 20 && W.reserve === 160 && W.dmg === 260 && Math.abs(W.rate - 0.22) < 1e-9, `Ray Gun no índice 27 · ${W.mag}/${W.reserve} · dano ${W.dmg} · tiro ${W.rate}s`);
  ok(!PRIMARIES.includes(RAY) && !SECONDARIES.includes(RAY) && !BOT_PRIMARIES.includes(RAY) && !CATEGORIES.some((c) => (c.weapons || []).includes(RAY)) && !BOX_POOL.includes(RAY) && !WALL_CATALOG.some((w) => w.w === RAY), 'fora da parede, das classes, do loadout, dos bots e do pool uniforme');
  ok(Math.abs(RAY_ODDS - 0.065) < 1e-9, `chance na barraca ${RAY_ODDS * 100}%`);
  let k = 0; const seq = () => (k++) / 10000; let rays = 0;
  for (let i = 0; i < 10000; i++) if (rollBox(seq) === RAY) rays++;
  ok(rays === 650, `em 10.000 giros saem ${rays} Ray Guns (6,5% cravado)`);
  const held = applySurvivalLoadout({ pts: 999999 });
  held.weapon = RAY; held.slots[1] = RAY; held.slotOn[1] = 1;
  ok(rollBox(() => 0, RAY) !== RAY, 'quem já está com a Ray Gun não tira outra no primeiro número');
  const wallNo = tryWall(applySurvivalLoadout({ pts: 999999 }), { w: RAY, price: 1, ammo: 1, x: 0, z: 0 });
  ok(!wallNo.ok && wallNo.reason === 'parede', 'parede recusa a Ray Gun mesmo com preço 1');
  ok(papOk(W) && papName(W, 1) === 'Ray Gun na Brasa' && papName(W, 2) === 'Ray Gun Defumado' && papName(W, 3) === 'Ray Gun Pururuca', 'Papada: Ray Gun na Brasa, Defumado, Pururuca');
  const line = statLine(W, 0, 1);
  ok(line.text.includes('dano') && line.text.includes('→') && line.after.name === 'Ray Gun na Brasa', `prompt do tier 1: ${line.text}`);
  const d0 = shownDmg(W, 0), d1 = shownDmg(W, 1), d2 = shownDmg(W, 2), d3 = shownDmg(W, 3);
  ok(d1 > d0 && d2 > d1 && d3 > d2 && d3 < 520, `dano ${d0} → ${d1} → ${d2} → ${d3} (tier 3 não mata o barrigão de um tiro)`);
  const ttk = (hp, dmg, rate) => (Math.ceil(hp / dmg) - 1) * rate;
  const rayTank = ttk(520, d0, W.rate);
  let slower = 0, compared = 0;
  for (const o of WEAPONS) {
    if (!o || o.ray || o.melee || o.shield || o.saber || o.key === 'faca-dourada') continue;
    const dmg = o.rocket ? o.rocket.maxDmg : (o.pellets | 0) > 1 ? o.dmg * o.pellets : o.dmg;
    if (!(dmg > 0) || !(o.rate > 0)) continue;
    compared++;
    if (rayTank < ttk(520, dmg, o.rate)) slower++;
  }
  ok(compared > 10 && slower === compared, `no barrigão (520) a Ray Gun mata em ${rayTank.toFixed(2)}s, mais rápido que as outras ${compared} armas sem upgrade`);
  const splash = raySplash(W);
  const selfCenter = splash.maxDmg * splash.selfMul;
  ok(splash.radius > 1 && splash.radius < 2.2 && selfCenter > 8 && selfCenter < 30, `estouro ${splash.radius} m · auto-dano no centro ${selfCenter.toFixed(1)} (leve)`);
  // ricochete: parede, chão e teto, pela normal. A mesma função que o servidor chama.
  const P = createPhysics([
    { min: { x: 2, y: 0, z: -2 }, max: { x: 2.4, y: 3, z: 2 } },
    { min: { x: -1, y: 2.2, z: -1 }, max: { x: 1, y: 2.5, z: 1 } },
  ], [20, 20]);
  const unit = (x, y, z) => { const L = Math.hypot(x, y, z) || 1; return { x: x / L, y: y / L, z: z / L }; };
  const wall = { pos: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 }, bounces: 0, t: 0, traveled: 0 };
  let wallBack = null;
  for (let i = 0; i < 20 && !wall.dead && wallBack == null; i++) { const hs = stepRay(P, wall, 0.05); if (hs.some((h) => !h.dead)) wallBack = wall.dir.x; }
  ok(wallBack != null && wallBack < -0.5, `parede: normal +x devolve o raio (dir.x ${wallBack == null ? '?' : wallBack.toFixed(2)})`);
  const floor = { pos: { x: 0, y: 1.2, z: 0 }, dir: unit(0.1, -1, 0), bounces: 0, t: 0, traveled: 0 };
  let floorHit = null;
  for (let i = 0; i < 20 && !floor.dead; i++) { const hs = stepRay(P, floor, 0.05); if (!floorHit) floorHit = hs.find((h) => !h.dead); }
  ok(floorHit && floorHit.n.y > 0.9 && floor.dir.y > 0.2, `chão: normal pra cima, raio sobe (dir.y ${floor.dir.y.toFixed(2)})`);
  const ceil = { pos: { x: 0, y: 1, z: 0 }, dir: unit(0, 1, 0), bounces: 0, t: 0, traveled: 0 };
  let ceilHit = null;
  for (let i = 0; i < 20 && !ceil.dead; i++) { const hs = stepRay(P, ceil, 0.05); if (!ceilHit) ceilHit = hs.find((h) => !h.dead); }
  ok(ceilHit && ceilHit.n.y < -0.5 && ceil.dir.y < -0.2, `teto: normal pra baixo, raio desce (dir.y ${ceil.dir.y.toFixed(2)})`);
  const alley = createPhysics([
    { min: { x: 1.2, y: 0, z: -1 }, max: { x: 1.5, y: 3, z: 1 } },
    { min: { x: -1.5, y: 0, z: -1 }, max: { x: -1.2, y: 3, z: 1 } },
  ], [20, 20]);
  const hop = { pos: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 }, bounces: 0, t: 0, traveled: 0 };
  let bounces = 0;
  for (let i = 0; i < 40 && !hop.dead; i++) bounces += stepRay(alley, hop, 0.05).filter((h) => !h.dead).length;
  ok(hop.dead && bounces === RAY_MOVE.bounces, `para depois de ${bounces} ricochetes (limite ${RAY_MOVE.bounces})`);
  const far = { pos: { x: 0, y: 1, z: 0 }, dir: { x: 0, y: 0, z: 1 }, bounces: 0, t: 0, traveled: 0 };
  const open = createPhysics([], [80, 80]);
  for (let i = 0; i < 40 && !far.dead; i++) stepRay(open, far, 0.05);
  ok(far.dead && far.traveled <= RAY_MOVE.range + 0.2 && far.traveled > RAY_MOVE.range - RAY_MOVE.speed * 0.05, `alcance máximo ${far.traveled.toFixed(1)} m (teto ${RAY_MOVE.range})`);
}
{
  const { g, a, step } = room(PADRAO_ID);
  a.slots = [RAY, PISTOL, KNIFE]; a.slotOn = [1, 1, 1]; a.weapon = RAY; a.mag[RAY] = 20; a.alive = true;
  const mag = a.mag[RAY], hp = a.hp;
  g.onEvent(a, ['ry', [a.pos.x, a.pos.y + 1.6, a.pos.z], [1, 0, 0], g.now()]);
  step(4);
  ok((a.rejectedShots || 0) > 0 && g.rays.length === 0 && a.mag[RAY] === mag && a.hp === hp, 'Padrão: servidor recusa o disparo e não cria raio');
  g.applyLoadout(a, RAY, PISTOL, KNIFE, true);
  ok(a.slots[0] !== RAY && a.primary !== RAY, 'loadout do Padrão não aceita a Ray Gun');
}
{
  const { g, a, step } = room(SURV_ID);
  a.slots = [PISTOL, RAY, KNIFE]; a.slotOn = [1, 1, 1]; a.weapon = RAY;
  a.mag[RAY] = 20; a.reserve[RAY] = 160; a.alive = true; a.invulnUntil = 0; a.lastShot[RAY] = -9; a.lastCt[RAY] = -9;
  const y = a.pos.y;
  const z = g.makeEnt({ name: 'Barrigao', bot: true, primary: 0 });
  z.zt = 'tank'; z.alive = true; z.hp = 800; z.maxHp = 800; z.invulnUntil = 0; z.connected = true; z.size = 1;
  let aim = null;
  for (let ang = 0; ang < Math.PI * 2 && !aim; ang += 0.35) {
    const d = { x: Math.cos(ang), y: 0, z: Math.sin(ang) };
    const hit = g.P.rayWorldN({ x: a.pos.x, y: y + 1.5, z: a.pos.z }, d, 8);
    if (hit == null || hit.t > 5) aim = d;
  }
  ok(!!aim, 'achou um corredor livre pra o raio');
  z.pos = { x: a.pos.x + aim.x * 1.35, y, z: a.pos.z + aim.z * 1.35 };
  const before = a.hp;
  g.onEvent(a, ['ry', [a.pos.x, y + 1.5, a.pos.z], [aim.x, aim.y, aim.z], g.now()]);
  ok(g.rays.length === 1 && a.mag[RAY] === 19, 'Survival: o servidor cria o raio e gasta uma bala');
  let hurtZ = false, hurtSelf = false;
  for (let i = 0; i < 12; i++) { step(1); if (z.hp < 800) hurtZ = true; if (a.hp < before) hurtSelf = true; }
  const dealt = 800 - z.hp;
  ok(hurtZ && dealt >= 200 && dealt <= 270, `zumbi levou o estouro cheio (${dealt} de dano, vida ${z.hp})`);
  ok(hurtSelf && before - a.hp < 40 && before - a.hp > 0, `auto-dano leve no splash (${(before - a.hp).toFixed(1)})`);
  z.alive = false; z.pos = { x: 999, y, z: 999 };
  a.hp = 100; a.alive = true; a.mag[RAY] = 20; a.lastCt[RAY] = -9; a.lastShot[RAY] = -9;
  g.rays.length = 0;
  g.onEvent(a, ['ry', [a.pos.x, y + 1.45, a.pos.z], [0, -1, 0], g.now()]);
  let foot = 100;
  for (let i = 0; i < 12 && g.rays.length; i++) { g.stepRays(0.05); foot = a.hp; }
  ok(foot < 100 && 100 - foot < 40, `tiro no pé quica e dá auto-dano leve (${(100 - foot).toFixed(1)})`);
  z.alive = false; z.pos = { x: 999, y, z: 999 };
  a.mag[RAY] = 20; a.lastCt[RAY] = -9; a.lastShot[RAY] = -9; a.alive = true; a.hp = Math.max(a.hp, 40);
  let face = null;
  for (let ang = 0; ang < Math.PI * 2 && !face; ang += 0.15) {
    const d = { x: Math.cos(ang), y: 0, z: Math.sin(ang) };
    const hit = g.P.rayWorldN({ x: a.pos.x, y: y + 1.2, z: a.pos.z }, d, 14);
    if (hit && hit.t > 1.2 && hit.t < 10 && Math.abs(hit.n.y) < 0.2) face = d;
  }
  ok(!!face, 'achou uma parede pra ricochetear');
  g.rays.length = 0;
  g.onEvent(a, ['ry', [a.pos.x, y + 1.2, a.pos.z], [face.x, 0, face.z], g.now()]);
  let bounced = g.events.some((ev) => ev[0] === 'yb');
  for (let i = 0; i < 16 && g.rays.length && !bounced; i++) {
    g.events.length = 0; g.stepRays(0.05); g.T += 0.05;
    if (g.events.some((ev) => ev[0] === 'yb') || (g.rays[0] && g.rays[0].bounces > 0)) bounced = true;
  }
  ok(bounced, 'servidor ricocheteia o raio na parede');
}

console.log(fails.length ? '\nFALHOU ' + fails.length : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
