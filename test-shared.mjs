// Testes de unidade das regras compartilhadas (sem navegador): node test-shared.mjs
import { bodyClosest, explosionHits, rayCapsule, sniperSpread, BODY } from './shared/combat.js';
import { DOM, newZoneState, stepZone, canJoinTeam, inZone } from './shared/domination.js';
const fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const P = { x: 0, y: 0, z: 0 }; const ent = (x, z, team = -1) => ({ pos: { x, y: 0, z }, alive: true, team });
const R = { radius: 5, maxDmg: 120, selfMul: 0.4, knock: 11, lift: 13 };
// distância até o ponto mais próximo do corpo (não do centro)
ok(Math.abs(bodyClosest({ x: 3, y: 1, z: 0 }, P).d - (3 - BODY.r)) < 1e-9, 'distância = até a superfície da cápsula');
const far = explosionHits({ x: 4.8, y: 0.2, z: 0 }, R, [ent(0, 0)], () => true)[0];
ok(far && far.d < 4.8 - 0.5, `explosão a 4,8 m do centro ainda pega (d até o corpo = ${far && far.d.toFixed(2)} m)`);
ok(explosionHits({ x: 5.7, y: 1, z: 0 }, R, [ent(0, 0)], () => true).length === 0, 'fora do raio + corpo: nada');
const direct = explosionHits({ x: 0.55, y: 1.0, z: 0 }, R, [ent(0, 0)], () => false)[0];
ok(direct && Math.abs(direct.dmg - 120) < 1e-6, 'acerto direto (encostado no corpo) = dano máximo, mesmo com "parede" no teste de visão');
// parcialmente exposto: visão bloqueada pros pés/peito, livre pra cabeça
const lowWall = (a, b) => { const t = (1.5 - a.x) / (b.x - a.x); if (t < 0 || t > 1) return true; return a.y + (b.y - a.y) * t > 1.2; }; // mureta de 1,2 m em x = 1,5
ok(!lowWall({ x: 3, y: 0.35, z: 0 }, { x: 0, y: 1.0, z: 0 }), '(mureta bloqueia a linha até o centro do corpo)');
const partial = explosionHits({ x: 3, y: 0.2, z: 0 }, R, [ent(0, 0)], lowWall);
ok(partial.length === 1, 'atrás de mureta com a cabeça de fora: leva dano (testa vários pontos do corpo)');
ok(explosionHits({ x: 3, y: 0.2, z: 0 }, R, [ent(0, 0)], () => false).length === 0, 'totalmente atrás da parede: sem dano');
// time
const owner = ent(10, 10, 0), mate = ent(1, 0, 0), foe = ent(-1, 0, 1);
const th = explosionHits({ x: 0, y: 0.2, z: 0 }, R, [owner, mate, foe], () => true, owner, true);
ok(!th.some((h) => h.e === mate) && th.some((h) => h.e === foe), 'Dominação: explosão não fere companheiro, fere inimigo');
const selfH = explosionHits({ x: 0.3, y: 0.2, z: 0 }, R, [owner], () => true, owner, true);
owner.pos = { x: 0, y: 0, z: 0 }; const selfH2 = explosionHits({ x: 0.3, y: 0.2, z: 0 }, R, [owner], () => true, owner, true)[0];
ok(selfH2 && Math.abs(selfH2.dmg - 120 * 0.4) < 1e-6, 'dano em si mesmo continua (40%)');
// foguete × casco
ok(rayCapsule({ x: -10, y: 1, z: 0.5 }, { x: 1, y: 0, z: 0 }, 20, P, 0.15) !== null, 'foguete que passaria entre as esferas antigas acerta o casco');
ok(rayCapsule({ x: -10, y: 0.3, z: 0 }, { x: 1, y: 0, z: 0 }, 20, P, 0.15) !== null, 'foguete na altura do pé acerta');
ok(rayCapsule({ x: -10, y: 3, z: 0 }, { x: 1, y: 0, z: 0 }, 20, P, 0.15) === null, 'foguete por cima da cabeça passa');
const tgt = ent(0, 0), dh = explosionHits({ x: 1.2, y: 1, z: 0 }, R, [tgt], () => true, null, false, null)[0], dh2 = explosionHits({ x: 1.2, y: 1, z: 0 }, R, [tgt], () => true, null, false, tgt)[0];
ok(dh.dmg < 120 && Math.abs(dh2.dmg - 120) < 1e-6, 'foguete que bateu no casco (direct) = dano máximo pra quem foi atingido');
// sniper
ok(sniperSpread(true, 0, false) === 0 && sniperSpread(true, 1.2, false) === 0, 'Sniper com luneta parado/quase parado: dispersão 0');
ok(sniperSpread(true, 6, false) > 0 && sniperSpread(true, 6, false) < 0.02 && sniperSpread(false, 0, false) <= 0.03, 'Sniper andando / sem luneta: dispersão pequena');
ok(sniperSpread(false, 0, false, true) >= 0.1 && sniperSpread(true, 0, false, true) === 0, 'Torresmo sem luneta abre; com luneta parado continua reto');
// zona
const z1 = newZoneState({ x: 0, y: 0, z: 0 }); stepZone(z1, [1, 0], 1); const z2 = newZoneState({ x: 0, y: 0, z: 0 }); stepZone(z2, [2, 0], 1);
ok(Math.abs(z1.progress - 1 / 25) < 1e-9 && Math.abs(z2.progress - 1 / 24) < 1e-9, `progresso com 1 = 1/25 e com 2 = 1/24 por s (${z1.progress.toFixed(4)} → ${z2.progress.toFixed(4)}/s)`);
const z5 = newZoneState({ x: 0, y: 0, z: 0 }); stepZone(z5, [5, 0], 1); ok(Math.abs(z5.progress - 1 / 21) < 1e-9, '5 jogadores: 1/21 por s');
const pz = z2.progress; stepZone(z2, [1, 1], 2); ok(z2.progress === pz && z2.contested, 'contestada: congela');
stepZone(z2, [0, 1], 1); ok(z2.progress < pz && z2.team === 0, 'inimigo sozinho neutraliza primeiro');
stepZone(z2, [0, 0], 1); ok(z2.progress < pz, 'vazia: decai');
const zc = newZoneState({ x: 0, y: 0, z: 0 }); let got = -1, t = 0; while (got < 0 && t < 30) { got = stepZone(zc, [1, 0], 0.05); t += 0.05; }
ok(got === 0 && Math.abs(t - 25) < 0.11, `1 jogador captura em ${t.toFixed(2)} s`);
ok(inZone(zc, { x: DOM.RADIUS - 0.1, y: 0, z: 0 }) && !inZone(zc, { x: DOM.RADIUS + 0.1, y: 0, z: 0 }) && !inZone(zc, { x: 0, y: 4, z: 0 }), 'dentro/fora da zona (raio e altura)');
ok(canJoinTeam(0, [1, 1]) && !canJoinTeam(0, [2, 1]) && canJoinTeam(1, [2, 1]), 'escolha de time bloqueada só se ficar 2+ a mais');
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
