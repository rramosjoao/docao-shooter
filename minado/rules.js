// Docão Minado: campo minado clássico. Sem DOM.
// O jogador escolhe a bomba, o tamanho e o formato. O formato é uma máscara
// em cima da grade: casa de fora não existe, número só conta vizinho jogável.

export const LOSS_LINE = 'o Barriguinha te pegou';

export const BOMBS = [
  { id: 'botijao', name: 'Botijão', blurb: 'O gás da Bomba.' },
  { id: 'copo', name: 'Copo Bomba', blurb: 'O copo que grita na granja.' },
  { id: 'granada', name: 'Granada', blurb: 'Abacaxi de bolso.' },
  { id: 'choque', name: 'Pau de choque', blurb: 'A estaca elétrica.' },
  { id: 'ovo', name: 'Ovo', blurb: 'O ovo do estilingue.' },
];

export const SIZES = [
  { id: 'chiqueirinho', name: 'Chiqueirinho', cols: 9, rows: 9, density: 10 / 81, blurb: '9×9, o cercadinho.' },
  { id: 'granja', name: 'Granja', cols: 16, rows: 16, density: 40 / 256, blurb: '16×16, o pátio.' },
  { id: 'fazendona', name: 'Fazendona', cols: 30, rows: 16, density: 99 / 480, blurb: '30×16, o pasto inteiro.' },
];

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

function ellipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function inTri(x, y, ax, ay, bx, by, cx, cy) {
  const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  const wa = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
  const wb = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
  const wc = 1 - wa - wb;
  return wa >= 0 && wb >= 0 && wc >= 0;
}

function at(c, r, cols, rows) {
  return { x: (c + 0.5) / cols, y: (r + 0.5) / rows };
}

function cercado() { return true; }

function lago(c, r, cols, rows) {
  const { x, y } = at(c, r, cols, rows);
  return ellipse(x, y, 0.5, 0.5, 0.46, 0.42);
}

function celeiro(c, r, cols, rows) {
  const { x, y } = at(c, r, cols, rows);
  const body = x >= 0.12 && x <= 0.88 && y >= 0.42 && y <= 0.94;
  const roof = inTri(x, y, 0.5, 0.06, 0.06, 0.48, 0.94, 0.48);
  const door = x >= 0.40 && x <= 0.60 && y >= 0.74 && y <= 0.94;
  return (body || roof) && !door;
}

function docao(c, r, cols, rows) {
  const { x, y } = at(c, r, cols, rows);
  const body = ellipse(x, y, 0.40, 0.56, 0.26, 0.28);
  const head = ellipse(x, y, 0.66, 0.46, 0.16, 0.18);
  const snout = ellipse(x, y, 0.84, 0.50, 0.09, 0.08);
  const ear = ellipse(x, y, 0.58, 0.28, 0.07, 0.09);
  const legA = x >= 0.24 && x <= 0.38 && y >= 0.68 && y <= 0.96;
  const legB = x >= 0.44 && x <= 0.58 && y >= 0.70 && y <= 0.97;
  const tail = ellipse(x, y, 0.16, 0.44, 0.06, 0.07);
  return body || head || snout || ear || legA || legB || tail;
}

function ferradura(c, r, cols, rows) {
  const { x, y } = at(c, r, cols, rows);
  const outer = x >= 0.10 && x <= 0.90 && y >= 0.12 && y <= 0.90;
  const hole = x >= 0.34 && x <= 0.66 && y >= 0.12 && y <= 0.58;
  return outer && !hole;
}

function trilha(c, r, cols, rows) {
  const { x, y } = at(c, r, cols, rows);
  if (x < 0.04 || x > 0.96) return false;
  const center = 0.50 + 0.28 * Math.sin(((x - 0.04) / 0.92) * Math.PI * 2);
  return Math.abs(y - center) <= 0.18;
}

function raquete(c, r, cols, rows) {
  const { x, y } = at(c, r, cols, rows);
  const head = ellipse(x, y, 0.50, 0.34, 0.38, 0.26);
  const handle = x >= 0.40 && x <= 0.60 && y >= 0.46 && y <= 0.97;
  return head || handle;
}

function snooker(c, r, cols, rows) {
  const { x, y } = at(c, r, cols, rows);
  const inset = 0.05;
  if (x < inset || x > 1 - inset || y < inset || y > 1 - inset) return false;
  const pr = Math.min(2.5, Math.max(1.15, Math.min(cols, rows) * 0.13));
  const pockets = [
    [inset, inset], [0.5, inset], [1 - inset, inset],
    [inset, 1 - inset], [0.5, 1 - inset], [1 - inset, 1 - inset],
  ];
  for (const [px, py] of pockets) {
    const dx = ((x - px) * cols) / pr;
    const dy = ((y - py) * rows) / pr;
    if (dx * dx + dy * dy <= 1) return false;
  }
  return true;
}

function leque(c, r, cols, rows) {
  const { x, y } = at(c, r, cols, rows);
  if (ellipse(x, y, 0.5, 0.88, 0.22, 0.16)) return true;
  const pivotX = 0.5;
  const pivotY = 0.93;
  const length = 0.84;
  const halfW = 0.15;
  for (const angle of [-0.62, 0, 0.62]) {
    const dirX = Math.sin(angle);
    const dirY = -Math.cos(angle);
    const cx = pivotX + dirX * length * 0.5;
    const cy = pivotY + dirY * length * 0.5;
    const dx = x - cx;
    const dy = y - cy;
    const lx = dx * Math.cos(angle) + dy * Math.sin(angle);
    const ly = dx * dirX + dy * dirY;
    if (Math.abs(lx) <= halfW && Math.abs(ly) <= length * 0.5) return true;
  }
  return false;
}

export const SHAPES = [
  { id: 'cercado', name: 'Cercado', from: 'Fazenda', blurb: 'Retângulo clássico, chão batido.', cell: cercado },
  { id: 'lago', name: 'Lago', from: 'Fazenda', blurb: 'A represa oval, no meio do pasto.', cell: lago },
  { id: 'celeiro', name: 'Celeiro', from: 'Fazenda', blurb: 'Telhado, salão e a porta aberta.', cell: celeiro },
  { id: 'docao', name: 'Silhueta do Docão', from: 'Fazenda', blurb: 'O porco de lado, focinho pra fora.', cell: docao },
  { id: 'ferradura', name: 'Ferradura', from: 'Fazenda', blurb: 'O U do rodeio.', cell: ferradura },
  { id: 'trilha', name: 'Trilha do milharal', from: 'Fazenda', blurb: 'O caminho entre as espigas.', cell: trilha },
  { id: 'raquete', name: 'Raquete', from: 'Tênis', blurb: 'A oval e o cabo, da quadra de saibro.', cell: raquete },
  { id: 'snooker', name: 'Mesa do Snooker', from: 'Snooker', blurb: 'O pano da sinuca, com as caçapas abertas.', cell: snooker },
  { id: 'leque', name: 'Leque do Truco', from: 'Truco', blurb: 'Três cartas abertas na mesa do boteco.', cell: leque },
];

export function mineCount(cells, density) {
  if (cells < 2) return 0;
  return Math.max(1, Math.min(cells - 1, Math.round(cells * density)));
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rnd) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

export function neighbors(game, i) {
  const cols = game.cols;
  const x = i % cols;
  const y = (i / cols) | 0;
  const out = [];
  for (const [dy, dx] of DIRS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= game.rows) continue;
    const j = ny * cols + nx;
    if (game.playable[j]) out.push(j);
  }
  return out;
}

export function createGame({ sizeId, shapeId, bombId, seed = 1 }) {
  const size = SIZES.find((s) => s.id === sizeId);
  const shape = SHAPES.find((s) => s.id === shapeId);
  const bomb = BOMBS.find((b) => b.id === bombId);
  if (!size || !shape || !bomb) throw new Error('campo inválido');
  const n = size.cols * size.rows;
  const playable = new Uint8Array(n);
  let count = 0;
  for (let r = 0; r < size.rows; r++) {
    for (let c = 0; c < size.cols; c++) {
      if (shape.cell(c, r, size.cols, size.rows)) {
        playable[r * size.cols + c] = 1;
        count++;
      }
    }
  }
  if (count < 2) throw new Error('formato pequeno demais');
  const mines = mineCount(count, size.density);
  return {
    cols: size.cols,
    rows: size.rows,
    sizeId,
    shapeId,
    bombId,
    seed: seed >>> 0,
    playable,
    mine: new Uint8Array(n),
    adj: new Uint8Array(n),
    state: new Uint8Array(n),
    mines,
    placed: false,
    status: 'ready',
    opened: 0,
    flags: 0,
    safe: count - mines,
    hit: -1,
    playableCount: count,
  };
}

function place(game, origin) {
  const rnd = mulberry32((Math.imul(game.seed ^ origin, 0x9E3779B1) ^ 0x85EBCA6B) >>> 0);
  const zone = new Set([origin, ...neighbors(game, origin)]);
  let pool = [];
  for (let i = 0; i < game.playable.length; i++) {
    if (game.playable[i] && !zone.has(i)) pool.push(i);
  }
  if (pool.length < game.mines) {
    pool = [];
    for (let i = 0; i < game.playable.length; i++) {
      if (game.playable[i] && i !== origin) pool.push(i);
    }
  }
  shuffle(pool, rnd);
  for (let k = 0; k < game.mines; k++) game.mine[pool[k]] = 1;
  for (let i = 0; i < game.playable.length; i++) {
    if (!game.playable[i] || game.mine[i]) continue;
    let n = 0;
    for (const j of neighbors(game, i)) if (game.mine[j]) n++;
    game.adj[i] = n;
  }
  game.placed = true;
}

function flood(game, i) {
  if (!game.playable[i] || game.state[i] !== 0) return;
  if (game.mine[i]) {
    game.state[i] = 1;
    game.status = 'lost';
    game.hit = i;
    return;
  }
  game.state[i] = 1;
  game.opened++;
  if (game.adj[i] !== 0) return;
  for (const j of neighbors(game, i)) flood(game, j);
}

function settle(game) {
  if (game.status !== 'lost' && game.opened >= game.safe) game.status = 'won';
  return game.status;
}

export function openCell(game, i) {
  if (game.status === 'won' || game.status === 'lost') return game.status;
  if (!game.playable[i] || game.state[i] === 2) return game.status;
  if (game.state[i] === 1) return chordCell(game, i);
  if (!game.placed) {
    place(game, i);
    game.status = 'play';
  }
  flood(game, i);
  return settle(game);
}

export function toggleFlag(game, i) {
  if (game.status === 'won' || game.status === 'lost') return false;
  if (!game.playable[i] || game.state[i] === 1) return false;
  if (game.state[i] === 2) {
    game.state[i] = 0;
    game.flags--;
  } else {
    game.state[i] = 2;
    game.flags++;
  }
  return true;
}

export function chordCell(game, i) {
  if (!game.placed || game.status === 'won' || game.status === 'lost') return game.status;
  if (!game.playable[i] || game.state[i] !== 1 || game.adj[i] === 0) return game.status;
  const near = neighbors(game, i);
  let flags = 0;
  for (const j of near) if (game.state[j] === 2) flags++;
  if (flags !== game.adj[i]) return game.status;
  for (const j of near) {
    if (game.state[j] === 0) flood(game, j);
    if (game.status === 'lost') break;
  }
  return settle(game);
}
