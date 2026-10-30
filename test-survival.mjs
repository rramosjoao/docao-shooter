// Survival da Invasão: tiers da Papada, débito, caixa, parede e loadout. Só Node.
// Uso: node test-survival.mjs
import { Game } from './server/src/game.js';
import { getMap, INV_MAPS } from './maps.js';
import { mapSolids, createPhysics } from './shared/physics.js';
import { buildNav } from './nav.js';
import { WEAPONS, PISTOL, KNIFE, UZI } from './shared/rules.js';
import { waveSpec, ZOMBIES } from './shared/invasion.js';
import {
  PAPADA_NAME, BOX_NAME, SURV, PAP_COST, SURV_ID, PADRAO_ID,
  isSurvival, normSurv, papOk, papRefuse, withPap, tryPap, tryBoxPay, rollBox, takeBox, tryWall,
  applySurvivalLoadout, grantHit, grantKill, killPoints, stationsFor, registerSurvivalMap,
  exclusiveSurvivalMap, SURVIVAL_LAYOUTS, bindStations, statLine, shownDmg, WALL_CATALOG, BOX_POOL,
  survRefill, fmtPts,
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
  for (let i = 0; i < BOX_POOL.length; i++) seen.add(rollBox(() => i / BOX_POOL.length));
  ok(seen.size === BOX_POOL.length && ![...seen].some((w) => !papOk(WEAPONS[w])), `sorteio cobre o pool (${seen.size}) e não sai faca nem tampa`);
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
    const solids = mapSolids(map), P = createPhysics(solids, map.size);
    const s = bindStations(map, P);
    ok(s.mounted && s.papada && s.box && s.walls.length >= 4, `${map.id}: ${s.walls.length} armas na parede + Papada e barraca`);
    const free = (x, y, z) => !P.collides(x, y + 0.45, z) && Math.abs(x) < map.size[0] - 0.6 && Math.abs(z) < map.size[1] - 0.6;
    ok(free(s.papada.x, s.papada.y, s.papada.z) && free(s.box.x, s.box.y, s.box.z), `${map.id}: Papada e barraca no chão livre`);
    const spawnNear = (p, max) => map.spawns.some((sp) => Math.hypot(sp[0] - p.x, sp[1] - p.z) < max);
    ok(spawnNear(s.papada, 16), `${map.id}: Papada a menos de 16 m de um spawn`);
    const loose = [];
    for (const w of s.walls) {
      if (w.nx == null || Math.hypot(w.nx, w.nz) < 0.9) { loose.push('normal'); continue; }
      const hit = P.rayWorldN({ x: w.x + w.nx * 0.8, y: w.y, z: w.z + w.nz * 0.8 }, { x: -w.nx, y: 0, z: -w.nz }, 1.4);
      if (!hit || hit.t > 1.15 || Math.abs(hit.n.y) > 0.5) loose.push([+w.x.toFixed(1), +w.z.toFixed(1)]);
      const stand = w.stand;
      if (stand && P.collides(stand.x, stand.y + 0.45, stand.z)) loose.push('stand');
    }
    ok(loose.length === 0, `${map.id}: armas encostadas na parede ${loose.length ? JSON.stringify(loose) : ''}`);
    ok(s.walls.some((w) => spawnNear(w.stand || w, 20)), `${map.id}: pelo menos uma arma perto de um spawn`);
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
  ok(g.boxState.phase === 'offer' && BOX_POOL.includes(g.boxState.weapon), `oferta da barraca é arma do pool (${g.boxState.weapon})`);
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

console.log(fails.length ? '\nFALHOU ' + fails.length : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
