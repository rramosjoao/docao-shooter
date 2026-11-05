// Apelido de conta (cliente + servidor): regras de cadastro e chave única (sem acento, sem caixa, sem pontuação).
export const NICK_MIN = 3, NICK_MAX = 16, PASS_MIN = 8, PASS_MAX = 128;
const RESERVED = new Set(['docao', 'admin', 'administrador', 'moderador', 'sistema', 'system', 'servidor', 'convidado', 'bot', 'staff']);
const OK_RE = /^[\p{L}\p{N}](?:[\p{L}\p{N} ._-]*[\p{L}\p{N}])?$/u;
export const cleanNick = (raw) => String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
// chave de unicidade: "Matheus", "matheus", "Mathéus" e "M.atheus" caem na mesma chave
export function nickKey(raw) {
  return cleanNick(raw).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}
// devolve a mensagem de erro (pt-BR) ou null se o apelido serve
export function nickError(raw) {
  const s = cleanNick(raw), n = Array.from(s).length;
  if (n < NICK_MIN || n > NICK_MAX) return `O apelido precisa ter de ${NICK_MIN} a ${NICK_MAX} letras`;
  if (!OK_RE.test(s)) return 'Use só letras, números, espaço, ponto, hífen e _';
  const k = nickKey(s);
  if (Array.from(k).length < NICK_MIN) return `O apelido precisa ter pelo menos ${NICK_MIN} letras ou números`;
  if (RESERVED.has(k)) return 'Esse apelido é reservado';
  return null;
}
export function passError(p) {
  if (typeof p !== 'string') return 'Senha inválida';
  if (p.length < PASS_MIN) return `A senha precisa ter pelo menos ${PASS_MIN} caracteres`;
  if (p.length > PASS_MAX) return `A senha pode ter no máximo ${PASS_MAX} caracteres`;
  return null;
}
