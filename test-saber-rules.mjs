// Regras dos sabres, sem navegador: node test-saber-rules.mjs
import { WEAPONS, SABER, SABER2, KNIFE, MELEE, SPEED } from './shared/rules.js';
import {
  SABER_KIT, profileOf, moveScale, freshSaber, stepStamina, guardOpen, inFront, payGuard,
  peekSwing, commitSwing, tryDash, trySpecial, spinDue, botSkill, botPlan, bladeTouch, aimForward, catchBlade,
} from './shared/saber.js';

const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };

const saber = WEAPONS[SABER], dual = WEAPONS[SABER2];
ok(!('move' in saber) && !('move' in dual), `sabres não carregam move (${saber.move}, ${dual.move})`);
ok(moveScale(saber, SABER, KNIFE, MELEE.speedMul) === 1 && moveScale(dual, SABER2, KNIFE, MELEE.speedMul) === 1, 'multiplicador de andar dos dois sabres é 1');
ok(moveScale({ ...saber, move: 0.7 }, SABER, KNIFE, MELEE.speedMul) === 1, 'mesmo com move antigo 0,7 o sabre continua em 1');
ok(Math.abs(moveScale(WEAPONS[KNIFE], KNIFE, KNIFE, MELEE.speedMul) - MELEE.speedMul) < 1e-9, 'faca continua mais rápida');
ok(moveScale(WEAPONS[21], 21, KNIFE, MELEE.speedMul) === 0.95, 'metralhadora continua em 95%');
ok(moveScale(WEAPONS[0], 0, KNIFE, MELEE.speedMul) === 1, 'fuzil continua em 100%');
ok(Math.abs(SPEED * moveScale(saber, SABER, KNIFE, MELEE.speedMul) - SPEED) < 1e-9, `sabre anda a ${SPEED} m/s, igual à base`);

const single = profileOf(saber), both = profileOf(dual);
ok(single.throw && !single.spin && both.spin && !both.throw, 'simples arremessa, duplo gira');
ok(single.arc < both.arc && single.combo[2].dmg > both.combo[2].dmg, 'simples é mais estreito e o último golpe é mais forte');

const st = freshSaber();
const a = commitSwing(st, 0, single);
const b = commitSwing(st, 0.30, single);
const c = commitSwing(st, 0.60, single);
ok(a && b && c && a.dmg === 36 && b.dmg === 36 && c.dmg === 52 && a.idx === 0 && c.idx === 2, `combo 36/36/52 (${a && a.dmg}/${b && b.dmg}/${c && c.dmg})`);
ok(commitSwing(st, 0.70, single) === null, 'o último golpe segura a cadência');
const d = commitSwing(st, 1.20, single);
ok(d && d.idx === 0 && d.dmg === 36, 'passou a janela do combo: volta pro primeiro golpe');
ok(a.dmg + b.dmg + c.dmg >= 100 && a.dmg < 100, 'três golpes matam, um golpe sozinho não');

const blk = freshSaber();
stepStamina(blk, 0, 0.016, true);
ok(guardOpen(blk, 0.05) && guardOpen(blk, 0.05).perfect, 'nos primeiros 0,18 s o bloqueio é parry perfeito');
ok(guardOpen(blk, 0.30) && !guardOpen(blk, 0.30).perfect, 'depois da janela ainda bloqueia, sem parry');
const face = aimForward(0, 'model');
ok(inFront(0, 'model', { x: 0, z: 0 }, { x: face.x * 4, z: face.z * 4 }, SABER_KIT.block.half, 30), 'tiro da frente entra no cone');
ok(!inFront(0, 'model', { x: 0, z: 0 }, { x: -face.x * 4, z: -face.z * 4 }, SABER_KIT.block.half, 30), 'tiro pelas costas fica de fora');

const volley = freshSaber();
stepStamina(volley, 0, 0.016, true);
const shot = payGuard(volley, 0.02, { perfect: true, dmgEach: Array.from({ length: 9 }, () => 17) });
const stopped = shot.blocked.filter(Boolean).length;
ok(stopped < 9 && stopped >= 3 && shot.reflect > 0 && shot.reflect <= SABER_KIT.block.reflectCap + 1e-6, `escopeta no parry: ${stopped} chumbos parados, reflexo ${shot.reflect.toFixed(1)} (teto ${SABER_KIT.block.reflectCap})`);
ok(shot.broke && volley.lockUntil > 0.02, 'a escopeta estoura a barra');

const hold = freshSaber();
stepStamina(hold, 0, 0.016, true);
hold.blockAt = -1; // já passou a janela
const rifle = payGuard(hold, 1, { perfect: false, dmgEach: [20, 20, 20, 20, 20] });
ok(rifle.reflect === 0 && rifle.blocked.filter(Boolean).length < 5, `segurar o bloqueio come parte da rajada do fuzil e não devolve dano (${rifle.blocked.filter(Boolean).length}/5)`);

const dash = freshSaber();
const dashed = tryDash(dash, 0, single, { x: 0, z: 1 });
ok(dashed && Math.abs(dashed.speed * dashed.dur - single.dash.dist) < 1e-9, `investida do simples cobre ${single.dash.dist} m`);
ok(tryDash(dash, 0.2, single, { x: 0, z: 1 }) === null, 'segunda investida no cooldown não sai');
ok(tryDash(freshSaber(), 0, single, { x: 0, z: 0 }) === null, 'investida sem direção não sai');

const sp = freshSaber();
ok(trySpecial(sp, 0, single).kind === 'throw' && sp.bladeOut, 'simples: arremesso, um por vez');
ok(trySpecial(sp, 10, single) === null, 'não arremessa outro enquanto o primeiro não voltou');
catchBlade(sp);
ok(trySpecial(sp, 1, single) === null && trySpecial(sp, 4.8, single).kind === 'throw', 'voltar não zera o cooldown; no fim dele arremessa de novo');
const spinSt = freshSaber();
const spin = trySpecial(spinSt, 0, both);
ok(spin && spin.kind === 'spin' && trySpecial(freshSaber(), 0, single).kind !== 'spin', 'giro só no duplo');
ok(spinDue(spinSt, 0.0, both) === null && spinDue(spinSt, 0.06, both).tick === 0 && spinDue(spinSt, 0.30, both).tick === 1, 'giro dá dois tiques de dano');
ok(spinDue(spinSt, 0.40, both) === null, 'não há terceiro tique');

const feet = { x: 0, y: 0, z: 0 }, blocker = freshSaber();
stepStamina(blocker, 0, 0.016, true);
const touch = bladeTouch(feet, 0, 'model', { x: 0, y: 1, z: 3 }, { x: 0, y: 1, z: 0.4 }, { x: 0, y: 0, z: -1 }, 0.05, blocker, true);
ok(touch && touch.perfect && touch.dir.z > 0.5, 'projétil de frente no parry volta na direção de quem atirou');
const side = bladeTouch(feet, 0, 'model', { x: 3, y: 1, z: 0 }, { x: 0.4, y: 1, z: 0 }, { x: -1, y: 0, z: 0 }, 0.05, blocker, true);
ok(!side, 'projétil pelo lado não pega a lâmina');

const easy = botSkill(0.65, 0.07), hard = botSkill(0.35, 0.045);
ok(easy < 0.15 && hard > 0.85, `dificuldade easy ${easy.toFixed(2)} / hard ${hard.toFixed(2)}`);
const ctx = { dist: 4, dual: false, foesNear: 1, gun: true, hp: 80, dashReady: true, specialReady: true, canBlock: true, inReach: false, roll: 0.1 };
const pe = botPlan(easy, ctx), ph = botPlan(hard, ctx);
ok(!pe.dash && !pe.block && !pe.special && ph.dash && ph.block, 'bot fácil não investe nem bloqueia; o difícil fecha e põe a guarda');
const crowd = botPlan(hard, { ...ctx, dual: true, dist: 2.2, inReach: true, foesNear: 3, roll: 0.1 });
ok(crowd.special && !crowd.swing, 'duplo difícil no meio do grupo gira em vez de só cortar');
const lone = botPlan(0.1, { ...ctx, dual: false, dist: 8, specialReady: true, roll: 0.99 });
ok(!lone.special && !lone.dash, 'bot fácil longe não arremessa nem investe');

console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\ntudo certo');
process.exit(fails.length ? 1 : 0);
