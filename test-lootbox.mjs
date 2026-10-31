// Caixote da Primeira Safra (sem navegador): faixas, catálogo e pagamento de repetida.
// Uso: node test-lootbox.mjs
import { ITEMS, itemById, isFreeItem } from './shared/closet.js';
import { BOX_ID, BOX_NAME, ODDS, DUPE_RATE, dupeCoins, lootItems, lootPool, tierOf, rollBox } from './shared/lootbox.js';
const fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };

ok(BOX_ID === 'safra1' && BOX_NAME === 'Caixote da Primeira Safra', 'nome da primeira temporada da granja');
ok(ODDS.reduce((s, o) => s + o.bp, 0) === 10000, 'as chances somam 100%');
ok(tierOf(0) === 500 && tierOf(7249) === 500 && tierOf(7250) === 750 && tierOf(8849) === 750, '72,5% peso 500 e 16% peso 750');
ok(tierOf(8850) === 1000 && tierOf(9849) === 1000 && tierOf(9850) === 1250 && tierOf(9949) === 1250, '10% peso 1000 e 1% peso 1250');
ok(tierOf(9950) === 2000 && tierOf(9999) === 2000, '0,5% peso 2000');
ok(ODDS.every((o) => lootPool(o.weight).length > 0), 'cada faixa tem skin pra sair');
ok([500, 750, 1000, 1250, 2000].every((w) => dupeCoins(w) === Math.round(w * DUPE_RATE)), 'repetida paga 10% do peso em Docoins');

const guns = ['pistol', 'sniper', 'p90', 'carabina', 'rifle'];
const knives = ['skeleton', 'karambit', 'bayonet', 'butterfly'];
const has = (gun, paint, weight) => lootItems().some((i) => i.gun === gun && i.paint === paint && i.weight === weight);
ok(guns.every((g) => has(g, 'camo', 500)) && knives.every((k) => lootItems().some((i) => i.knife === k && i.finish === 'camo' && i.weight === 500)), 'camuflagem peso 500 em todas as armas e facas');
ok(guns.every((g) => has(g, 'rust', 750)), 'ferrugem peso 750 nas cinco armas');
ok(guns.every((g) => has(g, 'waves', 1000)), 'ferrugem waves peso 1000 nas cinco armas');
ok(has('pistol', 'rainbow', 1250) && lootItems().filter((i) => i.paint === 'rainbow' && i.gun).length === 1, 'pistola rainbow peso 1250');
ok(has('rifle', 'gold', 2000) && itemById('t1') && itemById('t1').weight === 2000 && itemById('t1').loot, 'fuzil gold e a lore no peso 2000');
ok(lootPool(500).length === 13 && lootPool(750).length === 9 && lootPool(1000).length === 17 && lootPool(1250).length === 5 && lootPool(2000).length === 2, 'tamanho de cada faixa (facas que já existiam + pinturas novas)');
ok(lootItems().every((i) => [500, 750, 1000, 1250, 2000].includes(i.weight) && !isFreeItem(i.id) && !(i.price > 0)), 'só entra skin de arma ou faca, com peso e sem preço');
ok(ITEMS.filter((i) => i.loot).length === lootItems().length, 'o caixote usa o catálogo inteiro de skins de arma e faca');

function mulberry32(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const n = 40000, hit = {};
const rng = mulberry32(20261030);
for (let i = 0; i < n; i++) { const it = rollBox(rng); if (!it) { hit.vazio = (hit.vazio || 0) + 1; continue; } hit[it.weight] = (hit[it.weight] || 0) + 1; }
const near = (w, bp) => Math.abs((hit[w] || 0) / n - bp / 10000) < 0.015;
ok(!hit.vazio && near(500, 7250) && near(750, 1600) && near(1000, 1000) && near(1250, 100) && near(2000, 50), `sorteio de ${n}: ${JSON.stringify(hit)}`);

console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);
