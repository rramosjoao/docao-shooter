// Protocolo de chat e voz, sem navegador nem Worker: node test-social.mjs
import { Game } from './server/src/game.js';

const fails = [];
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + msg); if (!c) fails.push(msg); };
const chats = (box, id) => (box.get(id) || []).filter((m) => m.t === 'chat' && !m.sys);
const sys = (box, id) => (box.get(id) || []).filter((m) => m.t === 'chat' && m.sys);
const sigs = (box, id) => (box.get(id) || []).filter((m) => m.t === 'sig');

function room(mode = 'dm') {
  const box = new Map(); const ids = new Set(); const mem = { n: 0 };
  const g = new Game({ code: 'TEST', map: 'arena', max: 8, fillBots: false, mode }, {
    send(id, o) { ids.add(id); if (!box.has(id)) box.set(id, []); box.get(id).push(o); },
    broadcast(o) { for (const id of ids) { if (!box.has(id)) box.set(id, []); box.get(id).push(o); } },
    startLoop() {}, stopLoop() {}, saveCfg() { mem.n++; mem.log = g.chatLog.map((x) => x.text); },
  });
  return { g, box, mem };
}
function enter(g, name, token = '') {
  const r = g.join({ name, skin: 'classico', primary: 0, token });
  g.welcome(r.ent); return r.ent;
}

const dm = room('dm');
const ana = enter(dm.g, 'Ana');
const bia = enter(dm.g, 'Bia');
ok(sys(dm.box, ana.id).some((m) => m.text === 'Bia entrou'), 'quem já está na sala vê “Bia entrou”');
ok(dm.g.chatLog.some((m) => m.text === 'Ana entrou') && dm.g.chatLog.some((m) => m.text === 'Bia entrou'), 'histórico guarda as entradas');

dm.g.onMessage(ana.id, { t: 'say', text: '  olá\nmundo  ', scope: 'team' });
ok(chats(dm.box, bia.id).some((m) => m.text === 'olá mundo' && m.scope === 'all'), 'no mata-mata o time vira todos e o texto é limpo');
ok(chats(dm.box, ana.id).some((m) => m.text === 'olá mundo'), 'quem mandou também recebe');

const long = 'x'.repeat(120);
dm.g.onMessage(bia.id, { t: 'say', text: long, scope: 'all' });
ok(chats(dm.box, ana.id).some((m) => m.text.length === 80 && m.name === 'Bia'), 'corta em 80 e o nome vem do servidor');

dm.g.onMessage(ana.id, { t: 'say', text: '   ', scope: 'all' });
const before = chats(dm.box, bia.id).length;
ok(chats(dm.box, bia.id).length === before, 'mensagem vazia não sai');

for (let i = 0; i < 5; i++) dm.g.onMessage(ana.id, { t: 'say', text: 'r' + i, scope: 'all' });
const burst = chats(dm.box, bia.id).map((m) => m.text);
ok(burst.includes('r0') && burst.includes('r2') && !burst.includes('r3') && !burst.includes('r4'), 'a 4ª mensagem em sequência passa e a 5ª não');

dm.g.onMessage(bia.id, { t: 'cfg', chat: false });
ok(dm.g.cfg.chat !== false, 'quem não é anfitrião não desliga o chat');
dm.g.onMessage(ana.id, { t: 'cfg', chat: false });
dm.g.onMessage(bia.id, { t: 'say', text: 'sumiu', scope: 'all' });
ok(dm.g.cfg.chat === false && !chats(dm.box, ana.id).some((m) => m.text === 'sumiu'), 'anfitrião desliga e o servidor descarta o say');

const dom = room('dom');
const a = enter(dom.g, 'Ana');
const b = enter(dom.g, 'Bia');
const c = enter(dom.g, 'Caio');
dom.g.state = 'playing';
a.team = 0; b.team = 1; c.team = 0; a.alive = b.alive = c.alive = true;
dom.g.onMessage(a.id, { t: 'say', text: 'time', scope: 'team' });
ok(chats(dom.box, c.id).some((m) => m.text === 'time' && m.scope === 'team'), 'o aliado recebe o chat do time');
ok(!chats(dom.box, b.id).some((m) => m.text === 'time'), 'o outro time não recebe');

a.alive = false; b.alive = true; c.alive = false;
dom.g.onMessage(a.id, { t: 'say', text: 'morta', scope: 'all' });
ok(chats(dom.box, c.id).some((m) => m.text === 'morta'), 'morto ouve morto');
ok(!chats(dom.box, b.id).some((m) => m.text === 'morta'), 'vivo não ouve morto');
b.alive = false;
dom.g.onMessage(c.id, { t: 'say', text: 'vivo', scope: 'all' });
c.alive = true;
dom.g.onMessage(c.id, { t: 'say', text: 'vivo', scope: 'all' });
ok(chats(dom.box, a.id).some((m) => m.text === 'vivo'), 'morto ouve quem está vivo');

dom.g.onMessage(a.id, { t: 'voice', scope: 'team' });
dom.g.onMessage(b.id, { t: 'voice', scope: 'off' });
dom.g.onMessage(a.id, { t: 'sig', to: b.id, kind: 'offer', data: 'v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\n' });
ok(!sigs(dom.box, b.id).length, 'sem par de voz o servidor não encaminha a oferta');
dom.g.onMessage(b.id, { t: 'voice', scope: 'all' });
dom.g.onMessage(a.id, { t: 'sig', to: b.id, kind: 'offer', data: 'v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\n' });
ok(sigs(dom.box, b.id).some((m) => m.from === a.id && m.kind === 'offer'), 'se um dos dois está em Todos, a oferta passa');
dom.g.onMessage(b.id, { t: 'voice', scope: 'team' });
dom.g.onMessage(c.id, { t: 'voice', scope: 'team' });
dom.box.get(c.id).length = 0;
dom.g.onMessage(a.id, { t: 'sig', to: c.id, kind: 'offer', data: 'v=0\r\naliado\r\n' });
ok(sigs(dom.box, c.id).some((m) => m.from === a.id), 'mesmo time em Time se conecta');
dom.box.get(b.id).length = 0;
dom.g.onMessage(a.id, { t: 'sig', to: b.id, kind: 'offer', data: 'v=0\r\ninimigo\r\n' });
ok(!sigs(dom.box, b.id).length, 'times opostos em Time não se conectam');
dom.g.onMessage(a.id, { t: 'sig', to: c.id, kind: 'offer', data: 'nao-sdp' });
ok(sigs(dom.box, c.id).length === 1, 'oferta que não é SDP é descartada');
dom.g.onMessage(a.id, { t: 'sig', to: c.id, kind: 'ice', data: { candidate: 'cand', sdpMid: '0', sdpMLineIndex: 0 } });
ok(sigs(dom.box, c.id).some((m) => m.kind === 'ice' && m.data.candidate === 'cand'), 'o ICE vai em mensagem separada');

const back = enter(dom.g, 'Ana', a.token);
const welcome = dom.box.get(a.id).filter((m) => m.t === 'welcome').pop();
ok(back.id === a.id && welcome.chat.some((m) => m.text === 'time'), 'reconexão devolve o histórico');
ok(dom.g.chatLog.filter((m) => m.sys && m.text === 'Ana entrou').length === 1, 'reconectar não anuncia entrada de novo');
ok((dom.box.get(b.id).filter((m) => m.t === 'voices').pop().list.find((row) => row[0] === a.id) || [])[1] === 'off', 'reconectar volta a voz para mudo');

dom.g.state = 'lobby';
dom.g.leave(b.id);
ok(dom.g.chatLog.some((m) => m.sys && m.text === 'Bia saiu'), 'sair do lobby anuncia no chat');
ok(!dom.g.ents.has(b.id), 'sair do lobby tira o jogador na hora');

if (fails.length) { console.error(fails.length + ' falha(s)'); process.exit(1); }
console.log('chat e voz ok');
