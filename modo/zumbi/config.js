// ============================================================
//  Configuração do modo online.
//  SERVER_URL: endereço do Worker (Cloudflare). Pode trocar pela URL com ?server=wss://outro.host
//  (ex.: ?server=ws://127.0.0.1:8787 pra testar com `npx wrangler dev`).
// ============================================================
const q = new URLSearchParams(location.search);
// TESTE /modo/zumbi: aponta pro Worker de teste docao-shooter-infeccao (branch feature/modo-infeccao)
export const SERVER_URL = (q.get('server') || 'wss://docao-shooter-infeccao.valentimm.workers.dev').replace(/\/+$/, '');
export const HTTP_URL = SERVER_URL.replace(/^ws(s?):/, 'http$1:');
// envios por segundo do cliente pro servidor (cada mensagem conta 1/20 de requisição no plano grátis da Cloudflare)
export const SEND_HZ = Math.min(30, Math.max(5, parseInt(q.get('hz')) || 20));
export const INTERP_DELAY = 0.1; // atraso de interpolação dos outros jogadores (s)
