// Vozes do Copo Bomba: "granada" quando o copo sai da mão e "banana" quando explode.
// Arquivos em assets/audio/*.mp3 (gravados pelo Matheus). Tocam pelo mesmo WebAudio do jogo (master), com volume por distância.
// Só o Copo Bomba usa isto (Pokébola, míssil e foguete não).
const FILES = { granada: './assets/audio/granada.mp3', banana: './assets/audio/banana.mp3' };
const GAIN = { granada: 1.25, banana: 1.35 }; // relativo aos efeitos sintetizados (o master do jogo ainda aplica o volume geral)
const raw = {}; // baixa já na abertura da página (cache do navegador); decodifica quando o áudio liga
for (const [k, url] of Object.entries(FILES)) raw[k] = fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(url + ' ' + r.status)))).catch((e) => { console.warn('voz do copo:', e.message); return null; });
// Preferência (menu → Ajustes e pausa): desligada, o Copo Bomba fica só com os sons de sempre (arremesso e explosão sintetizados). Padrão: ligada.
const KEY = 'docao.nadeVoice';
let voiceOn = true; try { voiceOn = localStorage.getItem(KEY) !== '0'; } catch (e) { /* sem storage */ }
export const grenadeVoiceEnabled = () => voiceOn;
export function setGrenadeVoiceEnabled(on) { voiceOn = !!on; try { localStorage.setItem(KEY, voiceOn ? '1' : '0'); } catch (e) { /* sem storage */ } }
let actx = null, master = null; const bufs = {}, lastAt = {};
export function bindGrenadeVoice(ctx, out) {
  actx = ctx; master = out;
  for (const k of Object.keys(FILES)) raw[k].then((ab) => { if (!ab || bufs[k] || !actx) return; return actx.decodeAudioData(ab.slice(0)).then((b) => { bufs[k] = b; }); }).catch((e) => console.warn('voz do copo (decodificar):', e && e.message));
}
// vol 0..1 (distância já aplicada); sons de outros jogadores têm intervalo mínimo pra não virar bagunça
export function playGrenadeVoice(name, vol = 1, minGap = 0) {
  if (!voiceOn || !actx || !bufs[name] || vol < 0.03) return false;
  const t = actx.currentTime; if (minGap && t - (lastAt[name] || -9) < minGap) return false; lastAt[name] = t;
  const s = actx.createBufferSource(); s.buffer = bufs[name]; const g = actx.createGain(); g.gain.value = Math.min(1.6, GAIN[name] * vol);
  s.connect(g); g.connect(master); s.start(); s.onended = () => { try { g.disconnect(); } catch (e) { /* já solto */ } };
  (window.__voiceLog ||= []).push(name); // só pra testes
  return true;
}
export const grenadeVoiceReady = () => !!(bufs.granada && bufs.banana);
