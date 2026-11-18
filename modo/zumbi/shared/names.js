// Nomes dos jogadores (cliente + servidor): limpa, limita e evita repetidos ("Matheus (2)").
export const NAME_MAX = 16, DEFAULT_NAME = 'Docão';
// tira controles, zero-width/bidi, < > e espaços repetidos; corta em NAME_MAX caracteres (por code point)
export function cleanName(raw, fallback = DEFAULT_NAME) {
  let s = String(raw ?? '').normalize('NFC').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff<>]/g, '').replace(/\s+/g, ' ').trim();
  s = Array.from(s).slice(0, NAME_MAX).join('').trim();
  return s || fallback;
}
// taken: nomes já usados (qualquer caixa). Devolve base ou "base (2)", "base (3)"…
export function uniqueName(base, taken) {
  const low = new Set([...taken].map((n) => String(n).toLowerCase()));
  if (!low.has(base.toLowerCase())) return base;
  for (let i = 2; i < 100; i++) { const n = `${Array.from(base).slice(0, NAME_MAX - 4).join('').trim()} (${i})`; if (!low.has(n.toLowerCase())) return n; }
  return base + ' ' + Math.floor(Math.random() * 1000);
}
