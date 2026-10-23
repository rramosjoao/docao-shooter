// ============================================================
//  Conta do jogador (login OPCIONAL): fala com o Worker (/api/auth, /api/me, /api/rank). Sem Three.js.
//  O token fica só no navegador (localStorage 'docao.auth'); convidado = sem token, o jogo funciona igual.
// ============================================================
import { HTTP_URL } from './config.js';

const KEY = 'docao.auth';
let token = ''; try { token = localStorage.getItem(KEY) || ''; } catch (e) { /* sem storage */ }
let account = null, stats = null; // { nick, skin } · { all:{kills,deaths,wins,matches}, dm:{...}, ... }
const subs = new Set();
const emit = () => subs.forEach((f) => { try { f(account, stats); } catch (e) { console.error(e); } });
export const getToken = () => token;
export const getAccount = () => account;
export const getStats = () => stats;
export const onAccount = (f) => { subs.add(f); return () => subs.delete(f); };
function setToken(t) { token = t || ''; try { if (token) localStorage.setItem(KEY, token); else localStorage.removeItem(KEY); } catch (e) { /* sem storage */ } }

async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {}; if (body) headers['Content-Type'] = 'application/json'; if (auth && token) headers.Authorization = 'Bearer ' + token;
  let r; try { r = await fetch(HTTP_URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); } catch (e) { return { ok: false, status: 0, data: { error: 'Sem conexão com o servidor' } }; }
  const data = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, data };
}
async function enter(path, nick, password) {
  const r = await api(path, { method: 'POST', body: { nick, password } });
  if (!r.ok || !r.data.token) return { error: r.data.error || 'Não deu certo. Tente de novo.' };
  setToken(r.data.token); account = r.data.account; stats = null; emit(); refreshStats(); return { account };
}
export const register = (nick, password) => enter('/api/auth/register', nick, password);
export const login = (nick, password) => enter('/api/auth/login', nick, password);
export async function logout() { const t = token; if (t) await api('/api/auth/logout', { method: 'POST', auth: true }); setToken(''); account = null; stats = null; emit(); }
export function dropSession() { setToken(''); account = null; stats = null; emit(); } // token vencido/recusado pelo servidor da sala
export async function refreshStats() {
  if (!token) return null; const r = await api('/api/me', { auth: true });
  if (r.status === 401) { dropSession(); return null; }
  if (r.ok) { account = r.data.account; stats = r.data.stats; emit(); } return r.ok ? r.data : null;
}
export const loadMe = refreshStats; // no começo: confere o token guardado (se vencer, volta a convidado)
export async function saveSkin(skin) {
  if (!token || !account || account.skin === skin) return;
  const r = await api('/api/me/skin', { method: 'PUT', body: { skin }, auth: true });
  if (r.ok && account) { account.skin = skin; } else if (r.status === 401) dropSession();
}
export async function loadRank(mode = 'all', sort = 'kills') {
  const r = await api(`/api/rank?mode=${encodeURIComponent(mode)}&sort=${encodeURIComponent(sort)}&limit=20`);
  return r.ok ? r.data.rows || [] : null;
}
