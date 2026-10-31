// Docão Minado, sem navegador: node test-minado.mjs
import fs from 'node:fs';
import { BOMBS, LOSS_LINE, SHAPES, SIZES, chordCell, createGame, mineCount, neighbors, openCell, toggleFlag } from './minado/rules.js';

const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };

ok(LOSS_LINE === 'o Barriguinha te pegou', 'a derrota diz exatamente: o Barriguinha te pegou');
const html = fs.readFileSync(new URL('./minado.html', import.meta.url), 'utf8');
ok(html.includes(LOSS_LINE), 'a página traz a frase da derrota');

ok(BOMBS.length >= 4 && BOMBS.every((b) => b.id && b.name), 'há várias bombas com nome');
ok(SIZES.length >= 3 && new Set(SIZES.map((s) => s.cols * s.rows)).size === SIZES.length, 'há vários tamanhos');
ok(SHAPES.some((s) => s.from === 'Fazenda'), 'tem formato da fazenda');
ok(SHAPES.some((s) => s.from === 'Tênis'), 'tem formato do Tênis');
ok(SHAPES.some((s) => s.from === 'Snooker'), 'tem formato do Snooker');
ok(SHAPES.some((s) => s.from === 'Truco'), 'tem formato do Truco');

function ascii(game) {
  let s = '\n';
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) s += game.playable[r * game.cols + c] ? '#' : '.';
    s += '\n';
  }
  return s;
}

function components(game) {
  const seen = new Uint8Array(game.playable.length);
  let n = 0;
  for (let i = 0; i < game.playable.length; i++) {
    if (!game.playable[i] || seen[i]) continue;
    n++;
    const q = [i];
    seen[i] = 1;
    while (q.length) {
      const cur = q.pop();
      for (const j of neighbors(game, cur)) {
        if (!seen[j]) { seen[j] = 1; q.push(j); }
      }
    }
  }
  return n;
}

function nearCenter(game) {
  const cx = (game.cols / 2) | 0;
  const cy = (game.rows / 2) | 0;
  let best = -1;
  let bestD = 1e9;
  for (let i = 0; i < game.playable.length; i++) {
    if (!game.playable[i]) continue;
    const d = Math.abs((i % game.cols) - cx) + Math.abs(((i / game.cols) | 0) - cy);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

const sigs = new Set();
for (const size of SIZES) {
  for (const shape of SHAPES) {
    const game = createGame({ sizeId: size.id, shapeId: shape.id, bombId: 'botijao', seed: 3 });
    ok(game.playableCount >= 16, `${size.name} × ${shape.name} tem chão bastante (${game.playableCount})`);
    ok(components(game) === 1, `${size.name} × ${shape.name} é um campo só${components(game) === 1 ? '' : ascii(game)}`);
    ok(game.mines >= 1 && game.mines < game.playableCount, `${size.name} × ${shape.name} tem bomba e casa segura`);
    const origin = nearCenter(game);
    const zone = new Set([origin, ...neighbors(game, origin)]);
    let outside = 0;
    for (let i = 0; i < game.playable.length; i++) if (game.playable[i] && !zone.has(i)) outside++;
    openCell(game, origin);
    ok(game.mine[origin] === 0, `${shape.name}: o primeiro clique não estoura`);
    if (outside >= game.mines) ok(game.adj[origin] === 0 && game.opened > 1, `${shape.name} no ${size.name}: o primeiro clique abre um claro`);
    if (size.id === 'granja') {
      let sig = '';
      for (let i = 0; i < game.playable.length; i++) sig += game.playable[i] ? '1' : '0';
      sigs.add(sig);
    }
  }
}
ok(sigs.size === SHAPES.length, 'no mesmo tamanho, cada formato é um chão diferente');

ok(mineCount(81, 10 / 81) === 10, 'chiqueirinho cheio: 10 bombas');
ok(mineCount(256, 40 / 256) === 40, 'granja cheia: 40 bombas');
ok(mineCount(480, 99 / 480) === 99, 'fazendona cheia: 99 bombas');

const a = createGame({ sizeId: 'granja', shapeId: 'leque', bombId: 'ovo', seed: 7 });
const b = createGame({ sizeId: 'granja', shapeId: 'leque', bombId: 'ovo', seed: 7 });
openCell(a, nearCenter(a));
openCell(b, nearCenter(b));
ok([...a.mine].join('') === [...b.mine].join(''), 'a mesma semente planta as bombas no mesmo lugar');
ok(a.bombId === 'ovo' && b.shapeId === 'leque', 'a partida guarda a bomba e o formato escolhidos');

const flagged = createGame({ sizeId: 'chiqueirinho', shapeId: 'cercado', bombId: 'copo', seed: 1 });
const spot = nearCenter(flagged);
ok(toggleFlag(flagged, spot) && flagged.flags === 1, 'bandeirinha marca');
ok(openCell(flagged, spot) === 'ready', 'casa marcada não abre');
ok(toggleFlag(flagged, spot) && flagged.state[spot] === 0, 'bandeirinha sai');

const won = createGame({ sizeId: 'chiqueirinho', shapeId: 'raquete', bombId: 'granada', seed: 4 });
openCell(won, nearCenter(won));
for (let i = 0; i < won.playable.length; i++) {
  if (won.playable[i] && !won.mine[i] && won.state[i] === 0) openCell(won, i);
}
ok(won.status === 'won', 'abrir todo o seguro ganha, na raquete');

const lost = createGame({ sizeId: 'chiqueirinho', shapeId: 'snooker', bombId: 'choque', seed: 5 });
openCell(lost, nearCenter(lost));
let mine = -1;
for (let i = 0; i < lost.mine.length; i++) if (lost.mine[i]) { mine = i; break; }
ok(openCell(lost, mine) === 'lost' && lost.hit === mine, 'pisar na bomba da mesa perde');
ok(openCell(lost, nearCenter(lost)) === 'lost', 'depois da derrota o campo trava');

let chordOk = false;
let chordBad = false;
for (let seed = 1; seed < 30 && (!chordOk || !chordBad); seed++) {
  const g = createGame({ sizeId: 'granja', shapeId: 'cercado', bombId: 'botijao', seed });
  openCell(g, nearCenter(g));
  if (!chordOk) {
    for (let i = 0; i < g.playable.length && !chordOk; i++) {
      if (g.state[i] !== 1 || g.adj[i] < 1) continue;
      const near = neighbors(g, i);
      const hiddenSafe = near.filter((j) => !g.mine[j] && g.state[j] === 0);
      if (!hiddenSafe.length) continue;
      for (const j of near) if (g.mine[j]) toggleFlag(g, j);
      const before = g.opened;
      chordCell(g, i);
      if (g.status !== 'lost' && g.opened > before) chordOk = true;
    }
  }
  if (!chordBad) {
    const h = createGame({ sizeId: 'granja', shapeId: 'cercado', bombId: 'botijao', seed });
    openCell(h, nearCenter(h));
    for (let i = 0; i < h.playable.length && !chordBad; i++) {
      if (h.state[i] !== 1 || h.adj[i] < 1) continue;
      const near = neighbors(h, i);
      const mines = near.filter((j) => h.mine[j]);
      const hiddenSafe = near.filter((j) => !h.mine[j] && h.state[j] === 0);
      if (mines.length !== h.adj[i] || mines.length < 1 || !hiddenSafe.length) continue;
      for (let k = 0; k < mines.length - 1; k++) toggleFlag(h, mines[k]);
      toggleFlag(h, hiddenSafe[0]);
      if (chordCell(h, i) === 'lost') chordBad = true;
    }
  }
}
ok(chordOk, 'número com as bandeirinhas certas abre o resto');
ok(chordBad, 'bandeirinha no lugar errado estoura');

ok((() => { try { createGame({ sizeId: 'nope', shapeId: 'cercado', bombId: 'ovo' }); return false; } catch { return true; } })(), 'campo inválido não começa');

if (fails.length) {
  console.error(fails.length + ' falha(s)');
  process.exit(1);
}
console.log('minado ok');
