// Tab do Pistoleiro: busca o ranking do mapa aberto e pinta o #tabboard. Não mexe no relógio nem no movimento.
import { getAccount, getToken, loadPitRank } from './account.js';
import { createRankCache, renderPitRank, PIT_TAB_CACHE_MS } from './pocilga-rank.js';
import { GRANJA_TITLE } from './shared/granja.js';

const caches = new Map();
function cacheFor(map) {
  const id = map === 'granja' ? 'granja' : 'pocilga';
  if (!caches.has(id)) caches.set(id, createRankCache({ load: () => loadPitRank(10, id), ttl: PIT_TAB_CACHE_MS }));
  return caches.get(id);
}
const titleOf = (map) => map === 'granja' ? GRANJA_TITLE : 'Pistoleiro da Pocilga';

export function pitRankLogged() {
  const a = getAccount();
  return !!(getToken() && a && !a.dev);
}

export async function fillPitTab(map) {
  const el = document.getElementById('tabboard');
  if (!el) return;
  const id = map === 'granja' ? 'granja' : 'pocilga';
  const cache = cacheFor(id);
  const logged = pitRankLogged();
  const nick = logged ? getAccount().nick : '';
  const base = { nick, logged, variant: 'tab', title: titleOf(id) };
  const warm = cache.peek();
  el.innerHTML = renderPitRank(warm, { ...base, loading: !warm });
  let data = null, error = false;
  try {
    data = await cache.get();
    if (!data) error = true;
  } catch (e) { error = true; }
  if (el.classList.contains('hidden') || !document.body.classList.contains('pit-on')) return;
  el.innerHTML = renderPitRank(data, { ...base, error });
}
