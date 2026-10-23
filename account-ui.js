// ============================================================
//  Telas de conta e ranking (menu): faixa "Convidado / Logado", janela de entrar/criar conta e ranking.
//  Textos em pt-BR, estilo comanda. Não mexe no jogo: só avisa quem mudou via onAccount.
// ============================================================
import { getAccount, getStats, onAccount, register, login, logout, loadRank, refreshStats } from './account.js';
import { nickError, passError, cleanNick } from './shared/nick.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RANK_MODES = [['all', 'Geral'], ['dm', 'Mata-mata'], ['dom', 'Dominação'], ['bomb', 'Bomba'], ['inv', 'Invasão']];
let reg = false, rankMode = 'all', rankSort = 'kills', busy = false;

function renderStrip(a) {
  const t = $('acctTxt'), b = $('acctBtn');
  if (a) { t.innerHTML = `🐷 Logado como <b>${esc(a.nick)}</b> · apelido e skin guardados`; b.textContent = 'MINHA CONTA'; }
  else { t.textContent = 'Convidado · crie uma conta para ter apelido só seu, skin guardada e ranking'; b.textContent = 'ENTRAR'; }
}
function renderUser() {
  const a = getAccount(), s = (getStats() || {}).all || { kills: 0, deaths: 0, wins: 0, matches: 0 };
  $('acctGuest').classList.toggle('hidden', !!a); $('acctUser').classList.toggle('hidden', !a);
  if (a) {
    $('acctNickView').textContent = a.nick;
    $('acctStats').innerHTML = [['Abates', s.kills], ['Mortes', s.deaths], ['Vitórias', s.wins], ['Partidas', s.matches]].map(([k, v]) => `<div><b>${v | 0}</b>${k}</div>`).join('');
  }
}
function setMode(isReg) {
  reg = isReg; $('acctTabLogin').classList.toggle('active', !reg); $('acctTabReg').classList.toggle('active', reg);
  $('acctPass2Row').classList.toggle('hidden', !reg); $('acctSubmit').textContent = reg ? 'CRIAR CONTA' : 'ENTRAR'; $('acctErr').textContent = '';
  $('acctPass').autocomplete = reg ? 'new-password' : 'current-password';
  $('acctHelp').textContent = reg ? 'Apelido de 3 a 16 letras/números (pode ter espaço . - _). Ele fica fixo e é só seu. Senha de pelo menos 8 caracteres.' : 'Entre com o apelido e a senha da sua comanda.';
}
function openAcct() { $('acctErr').textContent = ''; $('acctPass').value = ''; $('acctPass2').value = ''; renderUser(); $('acctModal').classList.remove('hidden'); if (getAccount()) refreshStats(); else $('acctNick').focus(); }
const closeAcct = () => $('acctModal').classList.add('hidden');

async function submit(ev) {
  ev.preventDefault(); if (busy) return; const err = $('acctErr'); err.textContent = '';
  const nick = cleanNick($('acctNick').value), pass = $('acctPass').value;
  if (reg) {
    const e = nickError(nick) || passError(pass) || (pass !== $('acctPass2').value ? 'As senhas não são iguais' : null);
    if (e) { err.textContent = e; return; }
  } else if (!nick || !pass) { err.textContent = 'Preencha apelido e senha'; return; }
  busy = true; $('acctSubmit').disabled = true;
  const r = await (reg ? register(nick, pass) : login(nick, pass));
  busy = false; $('acctSubmit').disabled = false;
  if (r.error) { err.textContent = r.error; $('acctPass').value = ''; $('acctPass2').value = ''; return; }
  $('acctPass').value = ''; $('acctPass2').value = ''; closeAcct();
}

async function renderRank() {
  const box = $('rankBody'); box.innerHTML = '<div class="rank-empty">Carregando…</div>';
  const rows = await loadRank(rankMode, rankSort), me = getAccount();
  if (!rows) { box.innerHTML = '<div class="rank-empty">Não deu pra carregar o ranking agora.</div>'; return; }
  if (!rows.length) { box.innerHTML = '<div class="rank-empty">Ninguém no ranking ainda. Entre numa sala online com sua conta e seja o primeiro porco da lista! 🐷</div>'; return; }
  box.innerHTML = `<table><thead><tr><th>#</th><th>Apelido</th><th>Abates</th><th>Mortes</th><th>K/D</th><th>Vitórias</th></tr></thead><tbody>${rows.map((r, i) => `<tr${me && me.nick === r.nick ? ' class="me"' : ''}><td>${i + 1}</td><td>${esc(r.nick)}</td><td>${r.kills | 0}</td><td>${r.deaths | 0}</td><td>${r.deaths ? (r.kills / r.deaths).toFixed(2) : (r.kills | 0)}</td><td>${r.wins | 0}</td></tr>`).join('')}</tbody></table>`;
}
function openRank() { closeAcct(); $('rankModal').classList.remove('hidden'); renderRank(); }

export function initAccountUI() {
  $('rankModes').innerHTML = RANK_MODES.map(([id, nm]) => `<button type="button" data-mode="${id}"${id === rankMode ? ' class="active"' : ''}>${nm}</button>`).join('');
  $('rankModes').onclick = (e) => { const b = e.target.closest('button[data-mode]'); if (!b) return; rankMode = b.dataset.mode; $('rankModes').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); renderRank(); };
  document.querySelector('.rank-sort').onclick = (e) => { const b = e.target.closest('button[data-sort]'); if (!b) return; rankSort = b.dataset.sort; document.querySelectorAll('.rank-sort button').forEach((x) => x.classList.toggle('active', x === b)); renderRank(); };
  $('acctBtn').onclick = openAcct; $('acctClose').onclick = closeAcct; $('rankBtn').onclick = openRank; $('rankClose').onclick = () => $('rankModal').classList.add('hidden');
  $('acctRank').onclick = openRank;
  $('acctTabLogin').onclick = () => setMode(false); $('acctTabReg').onclick = () => setMode(true);
  $('acctForm').addEventListener('submit', submit);
  $('acctLogout').onclick = async () => { await logout(); renderUser(); $('acctNick').focus(); };
  for (const id of ['acctModal', 'rankModal']) { $(id).addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') $(id).classList.add('hidden'); }); $(id).addEventListener('mousedown', (e) => e.stopPropagation()); }
  onAccount((a) => { renderStrip(a); renderUser(); });
  renderStrip(getAccount()); setMode(false);
}
