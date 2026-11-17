// Curvas da personalidade das armas (sem navegador): node test-flair.mjs
// Garante que o tempero visual começa e termina em zero, não levanta a arma no saque
// e não mexe no ry/rz da inspeção (o teste de browser olha o sinal desses eixos).
import { WEAPONS } from './shared/rules.js';
import {
  FLAIR_KEYS, drawFlair, recoilFlair, idleFlair, rareFlair, locoFlair, killFlair,
  inspectFlair, reloadFlourish, knifeExtra, saberCutDir, cupHandShake, tpReloadExtra,
} from './weapon-anims.js';

const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const near = (n, e = 1e-6) => Math.abs(n) <= e;
const pose0 = (p, e = 1e-6) => p && ['x', 'y', 'z', 'rx', 'ry', 'rz'].every((c) => near(p[c], e));

const keys = WEAPONS.map((w) => w.key);
ok(keys.every((k) => FLAIR_KEYS.includes(k)) && FLAIR_KEYS.length === keys.length, `uma curva por arma (${keys.length})`);

let badDraw = [], badY = [], badIns = [], badReload = [];
for (const key of keys) {
  for (const v of [0, 1, 2]) {
    const a = drawFlair(key, 0, v), b = drawFlair(key, 1, v), mid = drawFlair(key, 0.25, v);
    if (!pose0(a) || !pose0(b)) badDraw.push(key);
    if (mid.y > 1e-6) badY.push(`${key}@${v}`);
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const p = drawFlair(key, t, v);
      if (p.y > 1e-6 || !Number.isFinite(p.rz)) badY.push(key + ' nan');
    }
  }
  for (const egg of [false, true]) {
    const a = inspectFlair(key, 0, egg), b = inspectFlair(key, 1, egg), m = inspectFlair(key, 0.45, egg);
    if (!pose0(a) || !pose0(b) || m.ry !== 0 || m.rz !== 0) badIns.push(key);
  }
  for (const v of [0, 0.7, 0.95]) {
    const a = reloadFlourish(key, 0, v), b = reloadFlourish(key, 1, v);
    if (![a.dip, a.tilt, a.pitch, a.yaw, b.dip, b.tilt, b.pitch, b.yaw, a.magSpin, b.magSpin].every((n) => near(n))) badReload.push(key);
  }
  const idle = idleFlair(key, 1.23);
  if (Math.hypot(idle.x, idle.y) > 0.004 || Math.abs(idle.rx) > 0.006 || Math.abs(idle.rz) > 0.006) badDraw.push('idle ' + key);
  const rare = rareFlair(key, 0, false);
  if (!pose0(rare)) badDraw.push('rare0 ' + key);
  const kill = killFlair(key, 0);
  if (!pose0(kill) || !pose0(killFlair(key, 1))) badDraw.push('kill ' + key);
  const hip = recoilFlair(key, 0.1, 0.02, 0), ads = recoilFlair(key, 0.1, 0.02, 1), zero = recoilFlair(key, 0, 0, 0);
  if (!pose0(zero) || ads.ry !== 0 || ads.rz !== 0) badDraw.push('ads ' + key);
  if (!Number.isFinite(hip.rx) || !Number.isFinite(hip.z)) badDraw.push('rec ' + key);
  const loco = locoFlair(key, 1, 0, 0, 1);
  if (!pose0(loco, 1e-6)) badDraw.push('loco ' + key);
}
ok(badDraw.length === 0, `saque, idle, coice e gesto de abate fecham em zero${badDraw.length ? ' — ' + [...new Set(badDraw)].join(' ') : ''}`);
ok(badY.length === 0, `saque nunca levanta a arma (y <= 0)${badY.length ? ' — ' + badY.join(' ') : ''}`);
ok(badIns.length === 0, `inspeção extra começa/termina em 0 e não mexe em ry/rz${badIns.length ? ' — ' + badIns.join(' ') : ''}`);
ok(badReload.length === 0, `tempero da recarga some no começo e no fim${badReload.length ? ' — ' + [...new Set(badReload)].join(' ') : ''}`);
ok(pose0(knifeExtra(0, 0.4)) && pose0(knifeExtra(1, 0)) && pose0(knifeExtra(2, 1)), 'faca: variante 0 é o golpe de hoje; as outras somem nas pontas');
ok(saberCutDir(0) === null && saberCutDir(1) && saberCutDir(3), 'sabre: variante 0 mantém o corte original');
const shake = cupHandShake(0, 1.2);
ok(near(shake.x) && near(shake.z) && !shake.rattle, 'copo parado não chacoalha');
ok(Math.abs(cupHandShake(1, 0.4).z) > 0.05, 'copo carregado chacoalha a mão');
const tp = tpReloadExtra('rifle');
ok(Number.isFinite(tp.rx) && Number.isFinite(tp.rz) && Math.abs(tp.rx) + Math.abs(tp.rz) < 0.4, '3ª pessoa: extra de recarga pequeno');

if (fails.length) { console.log('FALHOU', fails.length); process.exit(1); }
console.log('tudo certo');
