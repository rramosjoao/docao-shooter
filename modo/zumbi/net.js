// ============================================================
//  Cliente de rede do modo online: REST (criar/consultar sala) + WebSocket com reconexão.
//  Sem Three.js: main.js decide o que fazer com cada mensagem (onMessage).
// ============================================================
import { SERVER_URL, HTTP_URL } from './config.js';
import { getToken } from './account.js';

export async function createRoom(opts) {
  const r = await fetch(HTTP_URL + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opts) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.code) throw new Error(j.error || 'Servidor indisponível'); return j.code;
}
export async function roomInfo(code) {
  const r = await fetch(HTTP_URL + '/api/rooms/' + encodeURIComponent(code)); return r.json().catch(() => ({ exists: false }));
}
const tokKey = (code) => 'docao.tok.' + code;

export class Net {
  constructor(code, profile, handlers) {
    this.code = code.toUpperCase(); this.profile = profile; this.h = handlers; // { onMessage, onStatus(status, detail) }
    this.ws = null; this.closed = false; this.tries = 0; this.ping = 0; this.pingAt = 0; this.id = 0; this.out = [];
    this.connect();
    this.pingTimer = setInterval(() => this.sendPing(), 2000);
  }
  connect() {
    const p = this.profile, tok = sessionStorage.getItem(tokKey(this.code)) || '';
    const qs = new URLSearchParams({ name: p.name, skin: p.skin, primary: String(p.primary), secondary: String(p.secondary ?? ''), melee: String(p.melee ?? ''), token: tok });
    let ws; // conta: o token vai no subprotocolo (fora da URL); convidado: como sempre
    try { const at = getToken(); ws = at ? new WebSocket(`${SERVER_URL}/ws/${this.code}?${qs}`, ['docao', 'tk.' + at]) : new WebSocket(`${SERVER_URL}/ws/${this.code}?${qs}`); } catch (e) { this.h.onStatus('error', 'URL do servidor inválida'); return; }
    this.ws = ws; this.h.onStatus(this.tries ? 'reconnecting' : 'connecting');
    ws.onopen = () => { this.sendPing(); };
    ws.onmessage = (ev) => {
      if (ev.data === 'pong') { if (this.pingAt) { this.ping = Math.round(performance.now() - this.pingAt); this.pingAt = 0; } return; }
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'welcome') { this.id = m.id; this.tries = 0; try { sessionStorage.setItem(tokKey(this.code), m.token); } catch (e) { /* sem storage */ } this.h.onStatus('open'); }
      if (m.t === 'error') { this.closed = true; this.h.onStatus('error', m.msg); }
      this.h.onMessage(m);
    };
    ws.onclose = (ev) => {
      if (this.ws !== ws) return; this.ws = null;
      if (this.closed || ev.code === 4000 || ev.code === 4001) { if (!this.closed) { this.closed = true; this.h.onStatus('error', ev.reason || 'Desconectado'); } return; }
      if (this.tries++ >= 10) { this.closed = true; this.h.onStatus('error', 'Sem conexão com o servidor'); return; }
      this.h.onStatus('reconnecting'); setTimeout(() => !this.closed && this.connect(), Math.min(4000, 500 * this.tries));
    };
  }
  get open() { return !!this.ws && this.ws.readyState === 1; }
  send(o) { if (this.open) this.ws.send(JSON.stringify(o)); }
  sendPing() { if (this.open && !this.pingAt) { this.pingAt = performance.now(); this.ws.send('ping'); } else if (this.pingAt && performance.now() - this.pingAt > 5000) this.pingAt = 0; }
  close() { this.closed = true; clearInterval(this.pingTimer); try { sessionStorage.removeItem(tokKey(this.code)); } catch (e) { /* */ } if (this.ws) { try { this.ws.close(1000, 'saiu'); } catch (e) { /* */ } } this.ws = null; }
}
