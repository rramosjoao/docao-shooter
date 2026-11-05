// ============================================================
//  Brechó da Porca Véia 🧺 (menu): personalizador de visual + loja de partes, com prévia 3D própria (um mini renderizador que só
//  existe com a janela aberta). Nada aqui decide saldo, preço ou posse: o servidor decide, a tela só pede e mostra.
//  Convidado não salva nem compra (a janela só convida a entrar na conta).
// ============================================================
import * as THREE from 'three';
import { makeDocao } from './docao.js';
import { poseVictory, resetVictoryPose, ALL_DANCES, isPaidDance, normDance } from './victory-dance.js';
import './costumes.js';
import { getAccount, getItems, getEarn, getChal, onAccount, refreshStats, equipLook, buyItem } from './account.js';
import { CHAL_PER_DAY, TIERS } from './shared/challenges.js';
import { COLORS, SLOTS, ITEMS, CURRENCY, COIN_ICON, SHOP_NAME, SHOP_EMOJI, SHOP_BUTTON, DEFAULT_LOOK, COSTUME_SLOT, DANCE_SLOT, encodeLook, parseLook, itemById, itemForDance } from './shared/closet.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let look = { ...DEFAULT_LOOK, items: {} }, tab = 'look', trial = null, busy = false, three = null, raf = 0;

const currentCode = () => { const items = { ...look.items }; if (trial && trial.slot !== DANCE_SLOT) { if (trial.slot !== COSTUME_SLOT) delete items[COSTUME_SLOT]; items[trial.slot] = trial.id; } return encodeLook({ shirt: look.shirt, pants: look.pants, items }); };
const msg = (t, ok = false) => { const m = $('closetMsg'); m.textContent = t || ''; m.style.color = ok ? '#2a6f4a' : ''; };

// ---------- prévia 3D ----------
function startThree() {
  if (three) return;
  const canvas = $('closetCanvas'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(260, 330, false);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 260 / 330, 0.1, 50); cam.position.set(0, 1.25, 5.2); cam.lookAt(0, 1.0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8f7a55, 1.8)); const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(2, 3, 3); scene.add(sun);
  three = { renderer, scene, cam, model: null, code: '', yaw: 0, dance: '', danceUntil: 0, t: 0, last: 0 };
  bindSpin(canvas);
}
function showModel() {
  if (!three) return; const code = currentCode(); if (three.code === code && three.model) return;
  if (three.model) three.scene.remove(three.model.group); three.code = code;
  three.model = makeDocao(code, { withGun: false, pose: 'idle' }); three.scene.add(three.model.group); three.last = 0;
}
// Prévia PARADA, de frente. Só gira se a pessoa arrastar o boneco ou apertar ◀ ▶ (e "Frente" volta pro centro).
function bindSpin(canvas) {
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, yaw: three.yaw }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('drag'); });
  canvas.addEventListener('pointermove', (e) => { if (drag) three.yaw = drag.yaw + (e.clientX - drag.x) * 0.012; });
  const end = () => { drag = null; canvas.classList.remove('drag'); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
}
const owned = (id) => getItems().includes(id);
const turn = (d) => { if (three) three.yaw = d === 0 ? 0 : three.yaw + d; };
// dança de prévia: a da loja fica rodando enquanto a parte estiver "experimentando"; a escolhida nos botões roda uma vez
function playDance(id, forever) { if (!three) return; three.dance = id; three.t = 0; three.danceUntil = forever ? Infinity : performance.now() + 3300; }
function stopDance() { if (!three) return; three.dance = ''; if (three.model) { resetVictoryPose(three.model); three.model.group.position.set(0, 0, 0); three.model.group.rotation.set(0, 0, 0); } }
function loop(now) {
  if (!three || $('closetModal').classList.contains('hidden')) { raf = 0; return; }
  const dt = Math.min(0.05, three.last ? (now - three.last) / 1000 : 0.016); three.last = now;
  const m = three.model;
  if (m) {
    if (three.dance && now > three.danceUntil) stopDance();
    if (three.dance) { three.t += dt; m.danceBase = { x: 0, y: 0, z: 0, yaw: three.yaw }; poseVictory(m, three.dance, three.t); }
    else m.group.rotation.y = three.yaw;
  }
  three.renderer.render(three.scene, three.cam); raf = requestAnimationFrame(loop);
}
function stopThree() { if (raf) cancelAnimationFrame(raf); raf = 0; } // o renderizador fica (criado uma vez) e só o laço de desenho para; perder o contexto WebGL e recriar na mesma tela dá erro

// ---------- telas ----------
function renderWallet() {
  const a = getAccount(), e = getEarn(); if (!a) return;
  $('closetWallet').innerHTML = `${COIN_ICON} <b>${a.coins | 0}</b> ${CURRENCY}<small>Partidas hoje: ${e.today | 0}/${e.cap | 0} · desafios sem teto</small>`;
}
const curDance = () => { try { return normDance(localStorage.getItem('docao.dance')); } catch (e) { return 'moonwalk'; } };
function renderLook() {
  const owned = new Set(getItems());
  const sw = (key, val) => COLORS.map((c, i) => `<button type="button" class="closet-sw${val === i ? ' on' : ''}" data-${key}="${i}" style="background:${c}" aria-label="Cor ${i + 1}"></button>`).join('');
  let h = `<div class="closet-slot"><h4>Camiseta</h4><div class="closet-chips">${sw('shirt', look.shirt)}</div></div><div class="closet-slot"><h4>Shorts</h4><div class="closet-chips">${sw('pants', look.pants)}</div></div>`;
  for (const [k, name] of SLOTS) {
    const mine = ITEMS.filter((i) => i.slot === k && owned.has(i.id));
    h += `<div class="closet-slot"><h4>${name}${k === COSTUME_SLOT ? ' <small>(troca camiseta, shorts e peças de uma vez)</small>' : ''}</h4><div class="closet-chips"><button type="button" data-slot="${k}" data-item=""${!look.items[k] ? ' class="on"' : ''}>Nada</button>${mine.map((i) => `<button type="button" data-slot="${k}" data-item="${i.id}"${look.items[k] === i.id ? ' class="on"' : ''}>${i.emoji} ${esc(i.name)}</button>`).join('')}${mine.length ? '' : '<span class="closet-note">Nada na mochila ainda. Veja a Loja!</span>'}</div></div>`;
  }
  const cur = curDance(), mineD = ALL_DANCES.filter((d) => !isPaidDance(d.id) || owned.has(d.item));
  h += `<div class="closet-slot"><h4>Dança da vitória (tecla B)</h4><div class="closet-chips">${mineD.map((d) => `<button type="button" data-dance-pick="${d.id}"${cur === d.id ? ' class="on"' : ''}>💃 ${esc(d.name)}</button>`).join('')}</div></div>`;
  h += '<button type="button" id="closetSave" class="ticket-btn">SALVAR E USAR ESTE VISUAL</button><p class="closet-note">As skins da lista continuam no menu. O visual salvo vale nas partidas online com conta.</p>';
  $('closetLook').innerHTML = h;
}
function renderShop() {
  const e0 = getEarn();
  const owned = new Set(getItems()), a = getAccount(), coins = a ? a.coins | 0 : 0;
  let h = `<p class="closet-note">Como ganhar ${CURRENCY}: abates, fim de partida, vitória e waves da Invasão, em partidas <b>online com conta</b> (até ${e0.cap | 0} por dia), mais os <b>3 desafios do dia</b> (sem teto). Treino não rende. Não dá pra comprar com dinheiro de verdade.</p>`;
  for (const [k, name] of SLOTS) {
    h += `<div class="closet-sec"><h4>${name}</h4><div class="closet-grid">` + ITEMS.filter((i) => i.slot === k).map((i) => {
      const has = owned.has(i.id), can = coins >= i.price;
      return `<div class="closet-card${trial && trial.id === i.id ? ' try' : ''}" data-try="${i.id}"><b>${i.emoji} ${esc(i.name)}</b><div class="price">${COIN_ICON} ${i.price}</div><button type="button" data-buy="${i.id}"${has || !can ? ' disabled' : ''}>${has ? 'NA MOCHILA' : can ? 'COMPRAR' : 'FALTAM ' + (i.price - coins)}</button></div>`;
    }).join('') + '</div></div>';
  }
  h += `<div class="closet-sec"><h4>Danças da vitória <small>(tecla B)</small></h4><div class="closet-grid">` + ITEMS.filter((i) => i.slot === DANCE_SLOT).map((i) => {
    const has = owned.has(i.id), can = coins >= i.price;
    return `<div class="closet-card${trial && trial.id === i.id ? ' try' : ''}" data-try="${i.id}"><b>${i.emoji} ${esc(i.name)}</b><small>${esc(i.line)}</small><div class="price">${COIN_ICON} ${i.price}</div><button type="button" data-buy="${i.id}"${has || !can ? ' disabled' : ''}>${has ? 'NA MOCHILA' : can ? 'COMPRAR' : 'FALTAM ' + (i.price - coins)}</button></div>`;
  }).join('') + '</div></div>';
  $('closetShop').innerHTML = h;
}
// ---------- desafios do dia (só leitura: quem conta e paga é o servidor) ----------
const hms = (s) => { s = Math.max(0, s | 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${String(m).padStart(2, '0')}min` : m ? `${m}min ${String(s % 60).padStart(2, '0')}s` : `${s}s`; };
function chalClock() { const c = getChal(), el = document.getElementById('chalReset'); if (el && c) el.textContent = hms(c.resetIn); if (c && c.resetIn <= 0 && !chalRefreshing) { chalRefreshing = true; refreshStats().finally(() => { chalRefreshing = false; }); } }
let chalTimer = 0, chalRefreshing = false;
function renderChal() {
  const c = getChal(), box = $('closetChal');
  if (!c || !c.list) { box.innerHTML = '<p class="closet-note">Carregando os desafios…</p>'; return; }
  const done = c.list.filter((x) => x.done).length, total = c.list.reduce((t, x) => t + x.reward, 0);
  box.innerHTML = `<div class="chal-head"><b>Desafios do dia</b> <span>${done}/${CHAL_PER_DAY} feitos · até ${COIN_ICON} ${total}</span></div>`
    + c.list.map((x) => `<div class="chal-card t${x.tier}${x.done ? ' done' : ''}"><div class="chal-top"><span class="chal-tier">${TIERS[x.tier]}</span><span class="chal-mode">${esc(x.mode)}</span><span class="chal-prize">${x.done ? '✅ ' : ''}${COIN_ICON} ${x.reward}</span></div>`
      + `<div class="chal-text">${esc(x.text)}</div><div class="chal-bar"><i style="width:${Math.round(100 * Math.min(1, x.prog / x.goal))}%"></i></div><div class="chal-prog">${x.done ? 'Completo! Prêmio já está na carteira.' : `${x.prog} / ${x.goal}`}</div></div>`).join('')
    + `<p class="closet-note">Novos desafios em <b id="chalReset">${hms(c.resetIn)}</b> (meia-noite de Brasília). Valem só em partida <b>online com conta</b>; Treino e Exploração não contam. O progresso aparece no fim de cada partida. Prêmio de desafio não tem teto diário.</p>`;
}
function render() {
  const a = getAccount(); $('closetGuest').classList.toggle('hidden', !!a); $('closetMain').classList.toggle('hidden', !a);
  if (!a) return; renderWallet(); renderLook(); renderShop();
  renderChal();
  $('closetLook').classList.toggle('hidden', tab !== 'look'); $('closetShop').classList.toggle('hidden', tab !== 'shop'); $('closetChal').classList.toggle('hidden', tab !== 'chal');
  $('closetTabLook').classList.toggle('active', tab === 'look'); $('closetTabShop').classList.toggle('active', tab === 'shop'); $('closetTabChal').classList.toggle('active', tab === 'chal');
  showModel();
}
function setTab(t) { tab = t; if (t !== 'shop') { trial = null; stopDance(); } msg(''); render(); }

function loadLookFromAccount() {
  const a = getAccount(), p = a && (parseLook(a.custom) || parseLook(a.skin)); const owned = new Set(getItems());
  look = p ? { shirt: p.shirt, pants: p.pants, items: Object.fromEntries(Object.entries(p.items).filter(([, id]) => owned.has(id))) } : { ...DEFAULT_LOOK, items: {} };
}
export function openCloset(want) {
  trial = null; msg(''); tab = want === 'chal' || want === 'shop' ? want : 'look'; $('closetModal').classList.remove('hidden');
  clearInterval(chalTimer); chalTimer = setInterval(() => { if ($('closetModal').classList.contains('hidden')) clearInterval(chalTimer); else chalClock(); }, 1000);
  if (getAccount()) { loadLookFromAccount(); startThree(); render(); if (!raf) raf = requestAnimationFrame(loop); refreshStats().then(() => { if (!$('closetModal').classList.contains('hidden')) { loadLookFromAccount(); render(); } }); }
  else render();
}
function closeCloset() { clearInterval(chalTimer); $('closetModal').classList.add('hidden'); trial = null; stopDance(); stopThree(); }

async function onClick(e) {
  const t = e.target; if (busy) return;
  const sw = t.closest('[data-shirt],[data-pants]');
  if (sw) { if (sw.dataset.shirt !== undefined) look.shirt = +sw.dataset.shirt; else look.pants = +sw.dataset.pants; msg(''); render(); return; }
  const sl = t.closest('button[data-slot]');
  if (sl) {
    const k = sl.dataset.slot;
    if (sl.dataset.item) { if (k === COSTUME_SLOT) look.items = {}; else delete look.items[COSTUME_SLOT]; look.items[k] = sl.dataset.item; } else delete look.items[k]; // fantasia completa não mistura com outras partes
    msg(''); render(); return;
  }
  const dp = t.closest('[data-dance-pick]');
  if (dp) { const id = dp.dataset.dancePick; try { localStorage.setItem('docao.dance', id); } catch (er) { /* sem storage */ } document.dispatchEvent(new CustomEvent('docao-dance-pick', { detail: id })); playDance(id, false); msg('Dança escolhida! Ela roda no B durante a partida.', true); render(); return; }
  if (t.closest('[data-turn]')) { turn(t.closest('[data-turn]').dataset.turn === 'front' ? 0 : +t.closest('[data-turn]').dataset.turn); return; }
  if (t.closest('#closetSave')) {
    busy = true; msg('Salvando…'); const r = await equipLook(encodeLook(look)); busy = false;
    if (r.error) msg(r.error); else { msg('Visual salvo! Ele já está valendo. 🐷', true); document.dispatchEvent(new CustomEvent('docao-look-saved')); } return;
  }
  const buy = t.closest('button[data-buy]');
  if (buy) {
    busy = true; buy.disabled = true; const it = itemById(buy.dataset.buy); const r = await buyItem(buy.dataset.buy); busy = false;
    if (r.error) msg(r.error); else { msg(`Comprou: ${it.name}! Já está na sua mochila.`, true); if (it.dance) { try { localStorage.setItem('docao.dance', it.dance); } catch (er) { /* sem storage */ } document.dispatchEvent(new CustomEvent('docao-dance-pick', { detail: it.dance })); } else { if (it.slot === COSTUME_SLOT) look.items = {}; else delete look.items[COSTUME_SLOT]; look.items[it.slot] = it.id; } trial = null; }
    render(); return;
  }
  const card = t.closest('[data-try]');
  if (card) {
    const it = itemById(card.dataset.try); trial = trial && trial.id === it.id ? null : { id: it.id, slot: it.slot };
    if (trial && it.dance) playDance(it.dance, true); else stopDance();
    msg(trial ? (owned(it.id) ? 'Prévia (você já tem). Clique de novo pra tirar.' : 'Prévia (ainda não é seu). Clique de novo pra tirar.') : ''); render();
  }
}

export function initCloset() {
  $('closetBtn').textContent = `${SHOP_EMOJI} ${SHOP_BUTTON}`; $('closetTitle').textContent = `${SHOP_NAME} ${SHOP_EMOJI}`; // nome da loja: constantes em shared/closet.js
  $('closetBtn').onclick = () => openCloset(); $('closetClose').onclick = closeCloset;
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-open-chal]')) openCloset('chal'); }); // clicar num desafio do painel do menu abre a aba Desafios
  $('closetLogin').onclick = () => { closeCloset(); $('acctBtn').click(); };
  $('closetTabLook').onclick = () => setTab('look'); $('closetTabShop').onclick = () => setTab('shop'); $('closetTabChal').onclick = () => setTab('chal');
  $('closetModal').addEventListener('click', onClick);
  $('closetModal').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') closeCloset(); });
  $('closetModal').addEventListener('mousedown', (e) => e.stopPropagation());
  onAccount((a) => { if (!a && !$('closetModal').classList.contains('hidden')) { stopThree(); render(); } else if (a && !$('closetModal').classList.contains('hidden') && !busy) { renderWallet(); renderShop(); renderChal(); } });
}
