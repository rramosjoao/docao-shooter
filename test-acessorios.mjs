// Peças da bancada: conta no cliente e no servidor, sem mutar WEAPONS.
// Uso: node test-acessorios.mjs
import { WEAPONS } from './shared/rules.js';
import { sniperSpread } from './shared/combat.js';
import { clampKit, resolveWeapon, statBars, normalizeClasses, clampKitMap, familyOf } from './shared/attachments.js';
import { Game } from './server/src/game.js';

const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

const rifle0 = WEAPONS[0].adsFov;
const arame = resolveWeapon(0, { optic: 'arame', barrel: '', mag: '', stock: '' });
ok(near(arame.adsFov, 34) && near(arame.adsSpread, 0.09) && near(arame.spread, 0.0115), `Alça de arame no fuzil: ${arame.adsFov} / ${arame.adsSpread} / ${arame.spread}`);
ok(WEAPONS[0].adsFov === rifle0 && !WEAPONS[0].falloff, 'WEAPONS do fuzil não muda depois do resolve');

const bica = resolveWeapon(0, { optic: 'arame', barrel: 'bica', mag: '', stock: 'sabugo' });
ok(bica.falloff && near(bica.falloff[0], 63) && near(bica.falloff[1], 112) && near(bica.falloff[2], 0.72), `Cano de bica cria queda ${bica.falloff}`);
ok(!WEAPONS[0].falloff && WEAPONS[0].spread === 0.01, 'a queda nova mora só na cópia');
ok(near(bica.recoil, 0.018 * 0.8 * 1.15, 1e-6), `recuo do Arame ${bica.recoil}`);
const bars = statBars(bica, WEAPONS[0]);
const by = Object.fromEntries(bars.map((b) => [b.id, b]));
ok(by.dano.num === '20' && near(by.dano.fill, 20), `dano ${by.dano.num} / ${by.dano.fill}`);
ok(near(by.alcance.fill, 63 / 260 * 100, 0.2) && by.alcance.tick != null && near(by.alcance.tick, 140 / 260 * 100, 0.2), `alcance ${by.alcance.fill.toFixed(1)} tick ${by.alcance.tick && by.alcance.tick.toFixed(1)}`);
ok(by.cadencia.num.startsWith('10'), `cadência ${by.cadencia.num}`);
ok(by.mobilidade.fill > 80 && by.mobilidade.fill < 85 && by.mobilidade.tick != null, `mobilidade ${by.mobilidade.fill.toFixed(1)} tick ${by.mobilidade.tick && by.mobilidade.tick.toFixed(1)}`);
ok(by.controle.num === '0,017' && near(by.controle.fill, 83.4, 0.5), `controle ${by.controle.num} / ${by.controle.fill.toFixed(1)}`);

const vidro = resolveWeapon(5, { optic: 'vidro' });
ok(vidro.adsFov === 8 && near(vidro.move, 0.92) && near(vidro.hipMul, 1.25), `Canhão + vidro fica no talo (fov ${vidro.adsFov})`);
const sniper = resolveWeapon(2, { optic: 'curta', stock: 'bipe' });
ok(sniper.dmg === 100 && !sniper.falloff && near(sniper.move, 1.03 * 0.88), `Torresmo com curta e tripé continua um tiro (${sniper.dmg}, passo ${sniper.move})`);
ok(sniperSpread(true, 0, false, true, sniper.hipMul, sniper.swayMul) === 0, 'luneta parada no chão continua 0');
ok(sniperSpread(true, 6, false, false, 1, 0.5) === 0.006, 'balanço da luneta só quando anda');
ok(sniperSpread(false, 0, false, true, 1.25, 1) === 0.11 * 1.25, 'hipMul abre o quadril do Torresmo');

const boca = resolveWeapon(1, { barrel: 'aberta' });
ok(boca.knock && boca.knock.push === 7 && boca.knock.lift === 2.6 && WEAPONS[1].knock.push === 7, 'boca aberta não mexe no empurrão');
ok(near(boca.spread, 0.05 * 1.25) && near(boca.falloff[0], 8 * 0.75), 'boca aberta abre o leque e a queda');

const ruim = clampKit(0, { optic: 'vidro', barrel: 'fogao', mag: 'linguica', stock: 'bipe' });
ok(ruim.optic === '' && ruim.barrel === 'fogao' && ruim.mag === 'linguica' && ruim.stock === '', `luneta e tripé não entram no fuzil (${JSON.stringify(ruim)})`);
ok(!familyOf(3) && !Object.keys(clampKit(3, { barrel: 'bica' })).length, 'bazuca sem bancada');
const bolso = resolveWeapon(0, { mag: 'bolso' });
ok(bolso.mag === 18 && near(bolso.reload, 1.2), `pente de bolso ${bolso.mag} / ${bolso.reload}`);
const fita = resolveWeapon(0, { mag: 'linguica' });
ok(fita.mag === 45 && near(fita.reload, 2.16), `fita de linguiça ${fita.mag} / ${fita.reload}`);
ok(resolveWeapon(0, { optic: 'arame' }).rate === WEAPONS[0].rate && resolveWeapon(0, { optic: 'arame' }).dmg === 20, 'MVP não mexe em dano nem cadência');

const classes = normalizeClasses(null, { primary: 2, secondary: 4, melee: 7, hand: 'secondary' });
ok(classes.length === 5 && classes.every((c) => c.primary === 2 && c.hand === 'secondary' && c.name.startsWith('Classe')), 'quem já tinha loadout ganha cinco classes cópia');
ok(normalizeClasses([{ name: '' }, null], {}).length === 5 && normalizeClasses('nope', {}).length === 5, 'JSON torto vira cinco classes de fábrica, em silêncio');

{
  const io = { send() {}, broadcast() {}, startLoop() {}, stopLoop() {} };
  const g = new Game({ code: 'PECA', map: 'arena', max: 2, fillBots: false, mode: 'dm' }, io);
  let fake = 1000; g.now = () => fake;
  const a = g.join({ name: 'João', primary: 0, secondary: 4, melee: 7 }).ent;
  g.welcome(a);
  g.onMessage(a.id, { t: 'prof', name: 'João', skin: a.skin, primary: 0, secondary: 4, melee: 7, kit: { rifle: { optic: 'vidro', barrel: 'bica', mag: 'bolso', stock: 'bipe' } } });
  ok(a.nextKit.rifle.optic === '' && a.nextKit.rifle.mag === 'bolso' && a.nextKit.rifle.barrel === 'bica' && a.nextKit.rifle.stock === '', `servidor recusa luneta e tripé no fuzil (${JSON.stringify(a.nextKit.rifle)})`);
  g.onMessage(a.id, { t: 'start' });
  ok(a.alive && a.mag[0] === 18 && a.reserve[0] === 120, `nasce com o pente de bolso (${a.mag[0]}/${a.reserve[0]}) e a reserva de fábrica`);
  const antes = a.mag[0];
  g.onEvent(a, ['pr', 0, 4, 7, { rifle: { optic: '', barrel: '', mag: 'linguica', stock: '' } }]);
  ok(a.mag[0] === antes && a.nextKit.rifle.mag === 'linguica', 'trocar a fita no meio da vida não enche o pente');
  a.alive = false; a.respawnAt = g.T; a.rsReq = true; a.needRs = false;
  fake += 0.05; g.tick();
  ok(a.alive && a.mag[0] === 45, `no próximo nascimento a fita vale (${a.mag[0]})`);
  a.mag[0] = 40;
  a.nextKit = clampKitMap({ rifle: { mag: 'bolso' } });
  g.equipNow(a);
  ok(a.mag[0] === 18 && a.reserve[0] === 120, 'equipar pente menor no vivo derruba o excedente e não devolve pra reserva');
  a.mag[0] = 10;
  a.nextKit = clampKitMap({ rifle: { mag: 'linguica' } });
  g.equipNow(a);
  ok(a.mag[0] === 10, 'equipar pente maior no vivo não dá bala de graça');
  const mapa = JSON.stringify(g.tick ? {} : {});
  const snap = [];
  const old = g.io.broadcast;
  g.io.broadcast = (m) => { snap.push(m); old(m); };
  fake += 0.05; g.tick();
  const s = snap.find((m) => m && m.t === 's');
  ok(!!s && !JSON.stringify(s).includes('linguica') && !JSON.stringify(s).includes('"kit"'), 'o pacote de 20 Hz não leva o kit');
  void mapa;
}

console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK');
process.exit(fails.length ? 1 : 0);
