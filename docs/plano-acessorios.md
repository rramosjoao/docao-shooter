# Plano: bancada de acessórios

Rascunho de produto e de implementação. Este documento não muda a partida.

Base: `upstream/main` em `fe20e2c` (v1.17, Crachá do Porquinho). O fork local estava atrás; o plano foi escrito em cima do upstream.

Público: João, Head de Produto e Design. As decisões de UX estão fechadas o bastante para uma leva de código, e as que ainda são dele estão no final.

Mockups estáticos (não são o jogo):

- [Bancada no Arsenal, aprovada](mockups/acessorios/index.html) e a captura [01-arsenal.png](mockups/acessorios/01-arsenal.png). Essa tela fica.
- [In-game, fichas](mockups/acessorios/ingame.html), com as capturas novas: [morte](mockups/acessorios/02-morte.png), [pausa](mockups/acessorios/04-pausa.png), [preparação da Bomba](mockups/acessorios/05-bomba.png), [tela estreita](mockups/acessorios/03-estreita.png).
- As outras duas saídas, na mesma página: [temperos](mockups/acessorios/06-alt-temperos.png) e [roda](mockups/acessorios/07-alt-roda.png).

---

## Decisão em uma frase

A bancada do Arsenal tempera a arma, uma peça por lugar, e grava isso numa de três fichas. Na partida a bancada não abre: escolhe-se a ficha com um toque ou com 1, 2 e 3. A última fica armada, e nascer sem tocar nada usa ela. A folha fica no fundo da tela, com o cronômetro na borda, e quem matou continua visível. Escolher ficha na pausa espera a próxima vida. O ato de derrubar para trocar arma, com 10 s de cooldown, continua no protocolo para o cliente antigo.

---

## 1. O que o jogo já é

### Arsenal e loadout

O loadout é três índices: primária, secundária, corpo a corpo.

- Catálogo e grupos: `shared/rules.js` (`WEAPONS`, `CATEGORIES`, `PRIMARIES`, `SECONDARIES`, `MELEES`).
- Limite da sala e o que fica salvo por modo: `shared/loadout.js` (`clampLoadout`, `normWeapons`, `savedToLimits`). `weapons: null` significa tudo liberado.
- Memória no navegador: `docao.primary`, `docao.secondary`, `docao.melee`, `docao.hand` (qual das três nasce na mão), `docao.saber` (cor do sabre). Leitura e escrita em `main.js` (`setPrimary`, `setSecondary`, `setMelee`, `setSpawnHand`).
- Home: a caixa 3D abre o Arsenal (`#menu-arsenal` em `index.html`, viagem em `openMenuView` / `crateJourney` em `main.js`). Lá o jogador escolhe uma arma de cada grupo. A doca da direita (`#loadoutDock`, 168 px) só alterna a arma e marca qual nasce na mão.
- Lobby: três `<select>` em `#lobbyLoadoutRow`.
- Pausa: `#pauseGuns`. O texto muda por modo em `pause()`.
- Morte: `#deathpick` (`index.html`, visual em `hud-death.css`).
- Bomba, preparação: `#bLoad`, tecla B, troca na hora (`renderBLoad`, `bombPick`).
- Invasão, pausa entre waves: `#iLoad`, tecla B. No meio da wave a pausa avisa e não troca (`main.js`, por volta da troca `px`).
- Treino: B / N / M ciclam e equipam na hora (`trainSwap`).

São 14 primárias, 5 secundárias e 3 corpos a corpo. Hoje a ordem de `PRIMARIES` é a ordem do teclado 1–9 na morte: Fuzil, Commando, Metralhadora, MP5K, P90, FAMAS, Calibre 12, Sniper Torresmo, Canhão. Carabina, Bazuca, Semi, Disco e Lança-Milho ficam só no clique (`main.js`, `Digit1`–`Digit9` sobre `pool(PRIMARIES)`). O README ainda descreve a escada antiga (1 Fuzil, 2 Mini Uzi…). A seção 4 troca esse atalho: na partida, 1, 2 e 3 passam a ser as fichas. A bancada não copia a tabela do README.

### Stats que já existem

Cada arma em `WEAPONS` carrega o que a bala faz. Os que importam para uma peça:

| Campo | Onde muda o jogo | Quem manda online |
|---|---|---|
| `dmg`, `headMul` | dano no corpo e na cabeça. Vida é 100. | Servidor, em `traceShot` (`shared/penetration.js`) |
| `rate`, `burst`, `burstDelay` | cadência. `clockOk` / `canShoot` em `server/src/game.js` | Servidor, com folga de rede |
| `mag`, `reserve`, `reload`, `shellReload` | pente, reserva, tempo de recarga | Servidor em `progressReload` e `canShoot` |
| `falloff` `[perto, longe, mínimo]` | dano cai com a distância (`falloffMul`) | Servidor, se o `W` do `hitscan` for o resolvido |
| `range` | comprimento do raio (`traceShot`, `far = W.range`) | Servidor |
| `pen`, `pierce`, `pierceMul` | parede fina e corpos extras. Tabela `PEN_STATS` | Servidor |
| `pellets`, `spread`, `adsSpread`, `moveSpread` | cone do tiro no cliente (`main.js`, fórmula do `spread`) | Cliente. O humano manda as direções prontas (`humanFire` aceita `dirs`) |
| `recoil`, `adsFov` | coice e zoom. `ADS_SPEED` é 0,6 para todo mundo | Cliente |
| `move` | anda mais devagar (Metralhadora 0,95, Sabre 0,85, Sabre Duplo 0,70, faca 1,15 via `MELEE.speedMul`) | Cliente no jogador. No servidor, `move` entra no bot. O teto do humano é `SPEED * 1,35`, sem o `move` da arma |
| `scope`, `scopeStyle` | luneta. O cone da sniper não usa `spread`: é `sniperSpread` em `shared/combat.js` | Cliente. Torresmo sem luneta abre bem mais (`looseHip`) |
| `knock` | só a Calibre 12 empurra | Servidor |

Armas sem queda de dano: Fuzil, Commando, as três de precisão, pistola, bazuca, disco, milho, faca, sabres. Multiplicar o `range` de 140 m nelas quase não aparece nos mapas. A peça de cano, nessas armas, tem de mexer em outra coisa (parede, recuo, ou uma queda nova e curta). Nas três de precisão, criar queda quebra a identidade: Torresmo (100) e Canhão (180) matam no corpo de qualquer distância de propósito.

### Camuflagem não é acessório

`weapon-camo.js` pinta a arma desta partida: 5 abates chiqueiro, 10 bacon, 15 dourada. `gunKills` zera no começo da partida (`main.js`, ao montar o jogador online). Não há persistência. A pintura troca `map` / cor / emissivo e respeita `userData.noCamo`. Uma lente de vidro, quando existir malha, precisa desse `noCamo` para o ouro não pintar o vidro.

A camuflagem não altera stat. A bancada não entra no painel do I (`#inspect`: nome, camuflagem, abates).

### Visual e navegação da home

A língua do menu está em `docs/STYLE_GUIDE.md` e no interior da caixa em `style.css` (`#menu[data-crate-state=inside]`).

- Madeira escura, bandeja, seleção em dourado (`#e8bc67`), texto creme (`#fff0d1` / `#ffe3a5`).
- Letra marrom em madeira clara foi rejeitada. A folha da morte (`hud-death.css`) é o outro papel: creme `#f6e4bd`, tinta `#34402e`, carimbo `#a52e26`.
- A caixa e a mala são viagem de câmera. Durante a viagem os controles ficam `inert` (`crateMenuBusy`). `prefers-reduced-motion` pula o deslocamento e o menu continua acessível.
- Esc na caixa volta à comanda. A bancada precisa de um passo a mais: o primeiro Esc sai da bancada, o segundo sai do Arsenal.
- Abaixo de 720 px a doca deita, a grade do Arsenal vira uma coluna, o painel da caixa quase encosta na borda.
- Foco visível já existe (`#menu :is(button,…):focus-visible`).

Não há controle de toque para mirar. O único `touch-action` relevante é o laptop do míssil (`killstreak-ui.js`). Celular usa a home; a partida é mouse e teclado com pointer lock.

### Quando a troca vale

| Momento | O que acontece | Código |
|---|---|---|
| Menu, antes de jogar | Guarda no `localStorage` e, online, manda `prof` | `sendLoadout` |
| Lobby | `prof` com `live` só se a sala ainda não começou | `server/src/game.js` `applyLoadout` |
| Vivo, pausa, Mata-mata / Dominação / Exploração | Evento `px`: morre sem abate e nasce na hora. No máximo 1 vez a cada 10 s (`PX_COOLDOWN`) | `onEvent` |
| Morto | `pr`: fica em `nextPrimary` e entra no `spawn` | `pr` + `spawn` |
| Treino, preparação da Bomba, pausa da Invasão | `pr` / `px` chamam `equipNow`. Não mata | `onEvent` |
| Invasão no meio da wave | A pausa não abre a troca. `px` não mata | `pause`, `onEvent` |
| Código `minigun` no chat | Substitui a primária até morrer. O `spawn` devolve `nextPrimary` | `giveMinigun` |

Renascimento: 5 s, botão RENASCER, Espaço ou Enter. Online só nasce com `{t:'rs'}`. O pointer lock solta ao morrer para a lista ser clicável (`onPlayerDeath`).

### Rede

- Entrada: query `primary`, `secondary`, `melee` (`server/src/index.js`). Cabe pouco. Um kit de peças não deve ir na URL.
- Pacote de 20 Hz (`t:'s'`): id, posição, yaw, pitch, índice da arma, flags, vida, ping, agachamento. Sem peças. Não colocar o kit aí.
- Tiro humano: o cliente manda origem e direções. O servidor confere olho, arma no slot, pente, cadência e calcula dano, queda e parede com o `WEAPONS` constante. Não reconstitui o cone.
- Movimento: posição rejeitada se passar de `SPEED * 1,35` por tick, com folga de knock e fantasma. A penalidade da Metralhadora e dos sabres cabe dentro desses 35%. O servidor não a cobra.
- Cliente velho e servidor novo precisam conviver: o README pede o Worker no ar antes do site quando o protocolo muda.

### Conta

`server/migrations/0001_contas.sql`: a conta guarda apelido e `skin`. `account.js` só persiste a skin (`PUT /api/me/skin`). Convidado joga igual. Promessa do jogo: conta é opcional.

O kit de hoje cabe no mesmo lugar das armas: `localStorage`. Levar o kit para a conta é outra leva, e não trava o convidado.

### Performance que a bancada não pode piorar

- A home já desenha o mapa de fundo, a prévia do provador, as sombras da dança e as miniaturas das armas (uma por quadro, em `makeWeaponThumbs`).
- A miniatura é uma foto da malha de primeira pessoa. Refazê-la a cada clique de peça custa quadro e não ajuda a ler o stat.
- A morte reconstrói a lista com `innerHTML` em `buildDeathPrimaries` / `syncLoadoutUi`. A ficha troca três cartões prontos. Não refaz as 14 armas nem a miniatura a cada toque.
- Camuflagem usa textura de 64 px, filtro nearest, duas texturas no módulo. Peça nova não pede textura nova no MVP.

---

## 2. Limitações que o plano respeita

1. **Três armas, não um inventário.** A peça tempera uma das três. Não há quarto slot de arma (`shared/loadout.js`, `ensureSlots`).
2. **A sala proíbe arma, não peça.** O anfitrião marca grupos (`room-limits` no `index.html`, `normWeapons`). Peça de arma proibida some junto com a arma.
3. **Dano de perto e cadência estão calibrados.** Fuzil 20 a cada 0,1 s, FAMAS 34 em rajada de 3, Torresmo 100, Canhão 180, Calibre 12 mata até cerca de 8 m. O MVP não multiplica `dmg`, `headMul` nem `rate`.
4. **Cone, recuo, zoom e “andar mais rápido” são honestidade do cliente.** O servidor não recalcula o `spread` humano nem o `move` do jogador. Uma peça que só fecha o cone não é garantia competitiva online, do mesmo jeito que o cone de hoje já não é. O que o servidor passa a garantir: pente, tempo de recarga, queda, alcance do raio e penetração, porque isso já entra em `canShoot`, `progressReload` e `traceShot`.
5. **Sniper não usa a fórmula geral de dispersão.** `sniperSpread` ignora `w.spread`. Peça nas três de precisão tem de entrar nessa função, senão o número da bancada mente.
6. **Fuzil, Commando e as snipers não têm `falloff`.** Cano curto nelas, se for “menos alcance”, precisa criar uma queda explícita. Nas snipers isso não entra: um tiro no corpo continua um tiro no corpo.
7. **Tela de morte já enche 720p.** Folha embaixo, grade de 6 colunas, secundária, faca, botão grande (`hud-death.css`). A bancada inteira não cabe ali. Uma faixa de quatro lugares com popover também não: o alvo fica pequeno, o popover cobre a grade, e 1–9 só alcançam as nove primeiras de 14 primárias. A escolha sob o relógio passa a ser a ficha, e a grade sai da folha.
8. **Pausa pequena, e trocar arma é fuga.** `PX_COOLDOWN` de 10 s existe para a pausa não virar saída do tiroteio. A ficha na pausa enfileira a próxima vida. Ela não usa o ato de morrer, senão o jogador se derruba para ganhar pente.
9. **Minigun, disco, milho, ovo, arco e besta têm regra própria** (`shared/disc.js`, `corn.js`, `egg.js`, spin da minigun). Encaixar peça nelas é outro sistema.
10. **Malha de primeira pessoa é manual.** Cada arma é um grupo de caixas em `main.js` (o pente do fuzil é `rMag` e sai na recarga; a Calibre 12 tem telha, tubo e coronha dobrada). Terceira pessoa repete o trabalho em `docao.js`. Uma peça visível que reparenta isso quebra a recarga.
11. **Camuflagem é da partida, conta só guarda skin, convidado é de primeira classe.** Lacre de poder atrás de login quebra a promessa da v1.17.
12. **Esc e pointer lock já têm dono.** Esc pausa ou fecha a caixa. Morto, o mouse solta. Vivo, com mira travada, não abre menu de peça.
13. **Protocolo aditivo.** Campo a mais no `pr` / `px` é ignorado pelo servidor velho. Servidor novo com cliente velho trata ausência como de fábrica. O Worker sobe antes do site.

---

## 3. O sistema de peças

### Contrato

Módulo novo, sem DOM e sem Three.js: `shared/attachments.js`. Cliente e servidor importam o mesmo.

- `kit` é um mapa por **chave** da arma (`rifle`, `shotgun`…), não por índice. O índice 9 já mudou de Mini Uzi para MP5K sem mudar de lugar (`shared/rules.js`). A chave sobrevive a isso.
- Cada valor tem até quatro ids curtos: `optic`, `barrel`, `mag`, `stock`. String vazia é “de fábrica”.
- `clampKit(weaponIndex, kit)` devolve só ids que existem naquela arma. Id desconhecido, lugar que a arma não tem, ou peça de outra família vira vazio. Arma fora do Arsenal (minigun) devolve kit vazio.
- `resolveWeapon(weaponIndex, kit)` devolve uma **cópia** do registro, com os números já aplicados. Ninguém muta `WEAPONS`: o array é estado de módulo, compartilhado por todo jogador do processo.
- `compare(before, after)` devolve só as linhas que mudaram, com frase em português de jogador. A UI não inventa conta.

Tetos depois de multiplicar, para duas peças não empilharem um monstro:

- `move` final entre 0,75 e 1,08, em cima do `move` que a arma já tem.
- `adsFov` entre 8 e 70.
- `pen` entre 0 e 2,4 (o Canhão de fábrica já tem 1,6).
- `mag` inteiro, no mínimo 1.
- `reload` no mínimo 0,3 s.

### Onde cada arma tem lugar

O lugar ausente não aparece. Não há cartão cinza de “não cabe”.

| Família | Armas | Lugares | Nome na boca do jogo |
|---|---|---|---|
| Rajada e pistola | Fuzil, Commando, Metralhadora, MP5K, P90, FAMAS, Pistolinha, Furadeira | mira, cano, pente, mão | No fuzil e na metralhadora a mão se chama coronha. Na MP5K, P90, pistola e furadeira, empunhadura |
| Escopeta | Calibre 12, Semi | boca, coronha, cartucheira | Boca usa o id `barrel`. Cartucheira usa o id `mag`. Sem mira: a massa de mira já é a arma |
| Precisão | Torresmo, Canhão, Carabina | luneta, cano, pente, apoio | Apoio é o id `stock`. A luneta não desliga `scope: true` |
| Sem bancada no MVP | Bazuca, Disco, Lança-Milho, Besta, Arco, Estilingue, Faca, Sabres, Minigun | nenhum | Estado vazio, com frase. Cor do sabre continua onde já está |

Besta, arco e estilingue pedem peça de corda (`draw`), que é outro verbo (segurar o clique). Disco pede quique. Ficam para uma leva própria, se a bancada das balas provar que o menu serve.

### Catálogo do MVP

Todas as peças abaixo nascem liberadas. Ids estáveis, texto de jogador, conta em cima do número de fábrica.

**Mira** (rajada, pistola, furadeira). Não mexe em dano.

| Id | Nome | Conta | Frase |
|---|---|---|---|
| `""` | Massa de milho | identidade | De fábrica. A mira que já veio. |
| `arame` | Alça de arame | `adsFov × 0,85`, `adsSpread × 0,75`, `spread × 1,15` | Aproxima e fecha o tiro no botão direito. No quadril, abre um pouco. |
| `barbante` | Anel de barbante | `adsFov × 1,2` (teto 70), `adsSpread × 1,25`, `spread × 0,9` | Abre o campo. Acha o alvo mais rápido e fecha menos o tiro. |

No Fuzil (fábrica `adsFov` 40, `adsSpread` 0,12, `spread` 0,01) a Alça de arame fica 34 / 0,09 / 0,012. É o par que o mockup compara.

**Luneta** (só Torresmo, Canhão, Carabina). Entra em `sniperSpread` por dois multiplicadores novos na cópia: `hipMul` (sem luneta) e `swayMul` (luneta aberta e o corpo andando; parado e no chão continua 0).

| Id | Nome | Conta | Frase |
|---|---|---|---|
| `""` | Luneta da casa | identidade, o `scopeStyle` fica | A lente que a arma já tinha. |
| `vidro` | Vidro de conserva | `adsFov × 0,75` com piso 8, `move × 0,92`, `hipMul × 1,25` | Aproxima mais. Sem a luneta, espalha mais. Anda um pouco menos. |
| `curta` | Luneta curta da quermesse | `adsFov × 1,35` com teto 70, `move × 1,03`, `hipMul × 0,85` | Campo mais aberto. Mais fácil de achar o porco. Menos aumento. |

O Canhão já está no piso 8. O Vidro de conserva não aproxima mais do que isso; a frase da bancada diz “já está no talo” e o resto do custo (quadril e andar) continua valendo. Assim o cartão não mente um zoom que o teto comeu.

**Cano** (rajada, pistola, furadeira, e as três de precisão com a ressalva abaixo).

| Id | Nome | Conta | Frase |
|---|---|---|---|
| `""` | Cano da casa | identidade | O cano que já veio. |
| `bica` | Cano de bica | `pen × 0,7`, `recoil × 0,8`, `move × 1,04`. Se a arma tem `falloff`, `n0 × 0,8` e `n1 × 0,85`. Se não tem, e não é de precisão, ganha queda `[0,45×range, 0,8×range, 0,72]` | Mais curto: recua menos e atravessa menos tábua. Longe, o tiro amansa. |
| `fogao` | Cano de fogão | `pen × 1,3`, `recoil × 1,25`, `move × 0,94`. Se tem `falloff`, `n0 × 1,2` e `n1 × 1,25`. Não cria queda em quem não tinha | Mais longo: fura mais parede e segura a queda de quem já tinha. Recua mais e anda menos. |

Nas três de precisão o Cano de bica **não cria queda**. Torresmo e Canhão continuam matando de um no corpo. O cano delas é parede, recuo e passo.

`range` dessas armas fica quieto. 140 m contra 119 m não é uma decisão que alguém sente na Arena.

**Boca** (Calibre 12 e Semi, mesmo id `barrel`).

| Id | Nome | Conta | Frase |
|---|---|---|---|
| `""` | Boca da casa | identidade | O chumbo que você já conhece. |
| `aberta` | Boca aberta | `spread × 1,25`, queda começa mais cedo (`n0 × 0,75`), `recoil × 0,85` | Abre o leque. Perto, empurra a mesma vida. Longe, some mais rápido. |
| `fechada` | Boca fechada | `spread × 0,75`, `n1 × 1,15`, `recoil × 1,1` | Junta o chumbo. Alcança um palmo a mais. O ombro sente. |

A Calibre 12 continua com `knock`. A boca não mexe no empurrão: empurrar é a alma da pump (`test-spas.mjs` exige que só ela tenha `knock`).

**Pente** (rajada, pistola, furadeira, precisão). A reserva não cresce. Caixa de munição continua enchendo até o `reserve` de fábrica. Pente maior não é munição de graça no meio da vida: ver a regra de equipar vivo, abaixo.

| Id | Nome | Conta | Frase |
|---|---|---|---|
| `""` | Pente de lata | identidade | De fábrica. |
| `linguica` | Fita de linguiça | `mag` arredondado `× 1,5`, `reload × 1,35`, `move × 0,96` | Mais bala na arma. Demora mais para encher e pesa no passo. |
| `bolso` | Pente de bolso | `mag × 0,6`, no mínimo 1, `reload × 0,75`, `move × 1,02` | Acaba logo. Volta para a briga mais cedo. |

Fuzil: 30 → 45 na fita, ou 18 no bolso. Recarga 1,6 s → 2,16 s ou 1,2 s. Metralhadora: 100 → 150, recarga 3,1 s → 4,2 s, em cima do `move` 0,95 que ela já tem. O teto 0,75 segura a pilha com coronha.

**Cartucheira** (escopetas, id `mag`). A pump recarrega cartucho a cartucho (`shellReload`). O tempo é por cartucho.

| Id | Nome | Conta | Frase |
|---|---|---|---|
| `""` | Tubo da casa | identidade | Oito, do jeito da SPAS. |
| `cartucheira` | Cartucheira de lona | `mag + 2`, `reload × 1,15` | Dois cartuchos a mais. Cada um entra um pouco mais devagar. |
| `curto` | Tubo curto | `mag − 2` (mínimo 2), `reload × 0,85` | Menos cartucho. O pump volta mais cedo. |

**Mão** (id `stock`).

| Id | Nome | Onde | Conta | Frase |
|---|---|---|---|---|
| `""` | Cabo da casa | todas que têm o lugar | identidade | O cabo que já veio. |
| `enxada` | Coronha de enxada | fuzil, commando, metralhadora, FAMAS, escopetas, precisão | `recoil × 0,75`, `move × 0,95` | Firma o tiro. O passo encurta. |
| `sabugo` | Empunhadura de sabugo | MP5K, P90, pistola, furadeira, e também as de coronha como alternativa leve | `recoil × 1,15`, `adsSpread × 0,85`, `move × 1,03` | Mais solta na mão. O cano sobe mais. Mirando, fecha um pouco. |
| `bipe` | Tripé de ordenha | só as três de precisão | `move × 0,88`, `swayMul × 0,5`, `hipMul × 1,15` | Parado na luneta, o balanço de quem anda cai pela metade. No quadril e no passo, piora. |

“De fábrica” é uma peça de verdade, com nome. A bancada não trata vazio como erro.

### O que a peça não faz no MVP

- Não aumenta dano de perto, multiplicador de cabeça nem cadência.
- Não mexe em `knock`, foguete, disco, milho, ovo, arco, besta, faca, sabre, minigun, Copo Bomba, killstreak.
- Não atravessa a proibição da sala.
- Não vai no pacote de 20 Hz.
- Não pede conta.
- Não destrava por abate. A camuflagem continua sendo o prêmio da partida, pintado, sem stat.

### Desbloqueio

MVP: tudo aberto, salvo no navegador. `docao.fichas` é um JSON com três fichas. `docao.ficha` é o índice da ficha armada (0, 1 ou 2). Cada ficha tem `name`, `primary`, `secondary`, `melee`, `hand` e `kits`, e `kits` é um mapa pela chave da arma (`rifle`, `sniper`…), com os quatro ids. Quem já tem `docao.primary`, `docao.secondary` e `docao.melee` ganha a ficha 1 com esse loadout; as outras duas nascem cópia dela, peladas, com nome editável. JSON corrompido ou ausente vira três fichas de fábrica, sem aviso de erro. `docao.kit` solto deixa de ser a fonte: o kit mora dentro da ficha.

Fase posterior, se o João quiser memória entre computadores: coluna na conta, convidado segue no `localStorage`, os dois com o mesmo catálogo aberto. Lacre de poder fica desenhado (o mockup tem o estado) e desligado. Se um dia ligar, o lacre é cosmético ou é um teto que o servidor confere na conta. Abate só no `localStorage` é trapaça de uma linha no F12, e abate que dá dano quebra o convidado.

O estado “lacrado” do mockup existe para a UI não nascer sem ele: peça visível, sem clique, frase da condição (“15 abates com este fuzil na caderneta”). Ele não entra na primeira leva.

### Como o servidor impede trapaça

1. O cliente manda ids. O servidor chama `clampKit` e guarda `nextKit`. No `spawn`, copia para `kit` e zera pente e reserva com `resolveWeapon`, não com `WEAPONS` cru.
2. `canShoot`, `progressReload` e `hitscan` usam a cópia resolvida da arma que está na mão. Dano, queda, `pen`, `range`, tamanho de pente e tempo de recarga saem dali.
3. `pr` e `px` ganham um quinto campo: o conteúdo da ficha armada, três índices e o kit de cada uma, chaves curtas. O nome da ficha fica no navegador. O servidor passa o trio por `clampLoadout` e cada kit por `clampKit`. Arma proibida na sala cai no fallback que o loadout já tem, e o cartão mostra esse fallback antes de nascer. Cliente velho omite o campo: de fábrica. Servidor velho ignora o campo: a partida segue sem peça até o Worker atualizar. Ordem de publicação: Worker, depois o site.
4. O kit não entra na query do WebSocket. O cliente manda `{t:'kit', kit}` junto do primeiro `prof`, que já existe. Quem entra no lugar de um bot espera até 0,5 s (`respawnAt`). O `spawn` usa o `nextKit` que tiver chegado. Teste de corrida: kit que chega depois do spawn só vale na vida seguinte, nunca reenche o pente no meio do tiro.
5. Trocar peça com a vida já rolando (Treino, preparação da Bomba, pausa da Invasão) não completa pente. `mag = min(atual, mag novo)`. Bala a mais só entra na próxima recarga, tirando da reserva. Pente menor derruba o excedente no chão da conta, sem devolver para a reserva. Isso fecha o “equipar a fita para ganhar 15 balas”.
6. Pausa comum: escolher ficha manda `pr` (a próxima vida), com o trio e os kits. Não dispara `px`. Não mata. Não gasta o cooldown de 10 s. O `px` continua no servidor para o cliente antigo e para os modos que já equipam na hora. A pausa nova não oferece o botão de se derrubar.
7. Minigun de chat ignora o kit até a morte. O nascimento devolve a primária com o kit dela.
8. Cone, recuo e zoom ficam no cliente nesta leva, com a frase da bancada honesta no single player e no feeling. Uma leva seguinte pode recusar direção fora do cone do yaw/pitch que o servidor já guarda, com folga para o recuo aleatório. Sem isso, vender “fecha o tiro” como vantagem de ranked é mentira: hoje qualquer cliente já manda a direção que quiser.
9. Andar mais rápido ou mais devagar também fica no cliente enquanto o teto for `SPEED * 1,35` sem `move`. Não apertar esse teto no MVP: 35% de folga engole a Metralhadora (5%) e um passo de sabugo (3%), e apertar o teto mexe em knock, escada e lag de quem nem usa peça. A frase da peça de passo diz o feeling. O número que o servidor garante é o outro (pente, recarga, queda, parede).

Bots nascem de fábrica. Eles não rolam kit. O pool de primária da sala continua o mesmo.

---

## 4. UX

### Onde cada escolha acontece

| Lugar | O que é | Por quê |
|---|---|---|
| Home, dentro da caixa, um nível abaixo do Arsenal | A bancada completa, gravando a ficha que está aberta | É o lugar sem relógio. A doca de 168 px não cresce. A captura 01 continua valendo |
| Tela de morte | Três fichas grandes, folha no fundo, cronômetro na borda | O relógio é de poucos segundos. A última ficha já está armada |
| Preparação da Bomba e pausa entre waves da Invasão | As mesmas três fichas, numa faixa no fundo (`#bLoad`, `#iLoad`) | O site e o centro da tela continuam livres. A ficha entra agora, com a regra do pente |
| Pausa comum | As mesmas três fichas, painel no centro | A partida já está parada. A ficha espera a próxima vida |
| Lobby | As três fichas no lugar da linha de selects | O lobby não tem a caixa 3D. Levar o jogador para a home no meio da sala perde o código da sala |
| Vivo, mira travada | Nada | I continua a inspeção. Esc continua a pausa. Não há tecla nova no tiroteio |
| Arma sem lugar | Estado vazio dentro da bancada | Faca, sabre, bazuca e o resto não ganham cartão fantasma |

Treino abre as mesmas três fichas, com a frase “no estande a ficha entra agora e o pente não enche sozinho”. O servidor aplica na hora, como a arma.

### In-game: três saídas, uma recomendada

O Arsenal continua a oficina. Montar a alça, o cano e o pente é decisão de bancada, com tempo. Sob o relógio de nascer, a decisão é outra: qual conjunto já salvo entra nesta vida. Três saídas foram desenhadas em cima disso. A recomendada é a primeira.

**A · Fichas de chapa.** Recomendada. Três classes salvas, no espírito da classe customizada e da troca de loadout no respawn. Cada ficha é um cartão grande: nome, primária em tipo grande, secundária e faca, quatro selos das peças, e uma frase de relance. A última ficha usada nasce com o filete dourado e o texto “Vai nascer com esta”. Espaço, quando a barra zera, usa essa ficha. 1, 2 e 3 (e as setas) trocam na hora, sem segundo carimbo. Toque no cartão faz o mesmo. A folha senta no fundo. O cronômetro é a barra dourada na borda da folha e o texto do botão (“Renascer em 3,2s”). Quem matou e o porco ficam na metade de cima.

As três fichas do mockup, para a captura e o texto baterem:

| Tecla | Nome | Armas | Peças da primária | Relance |
|---|---|---|---|---|
| 1 | Pelada | Fuzil, Pistolinha, Faca | Massa de milho, Cano da casa, Lata, Cabo da casa | Mira 40 · pente 30 · o fuzil de hoje |
| 2 | Arame, armada | as mesmas | Alça de arame, Cano de bica, Lata, Sabugo | Mira 34 · fecha no direito · abre no quadril |
| 3 | Torresmo | Sniper Torresmo, Pistolinha, Faca | Luneta curta, Cano da casa, Lata, Tripé | 1 tiro no corpo · anda um pouco menos |

A conta da frase cabe no catálogo: Alça de arame no Fuzil é `adsFov` 34. Luneta curta (`move × 1,03`) com Tripé (`move × 0,88`) anda um pouco menos, e o tiro no corpo da sniper continua um, porque o cano dela não cria queda.

Por que a ficha de chapa:

- Em poucos segundos a escolha útil é o conjunto, e três opções cabem na memória de trabalho. Fazer nada também é válido: a última ficha já está armada.
- Um toque ou uma tecla. O alvo é o cartão inteiro, bem acima de 44 px.
- A frase de relance cabe num olhar. A comparação completa, com as réguas, continua na bancada, onde há tempo de ler.
- A grade de 14 primárias sai da folha. A folha fica mais baixa, e o cronômetro e a câmera de quem matou continuam na tela. As cinco primárias que o 1–9 de hoje não alcança passam a existir porque alguém as pôs numa ficha no Arsenal.
- A sala continua mandando. `clampLoadout` e `clampKit` correm no servidor. Se a ficha pede uma arma proibida, o cartão mostra o fallback antes do nascimento.
- Teclado, mouse e toque disparam o mesmo verbo. O estado armado está escrito (“Vai nascer com esta”), além do dourado.

**B · Temperos da arma.** A grade de primárias fica, e embaixo há três temperos grandes da arma aberta (Z Pelado, X Arame, C Bolso). Serve quem quer trocar só o fuzil e manter o hábito da grade. Custa dois passos (arma, depois tempero), a folha continua alta, e 1–9 seguem sem alcançar Carabina, Bazuca, Semi, Disco e Lança-Milho. O cronômetro cabe. O meio da tela encolhe. Captura: `06-alt-temperos.png`.

**C · Roda.** Quatro gomos (mira, cano, pente, mão) em volta do nome da arma, no centro da tela. Um gesto de mouse escolhe o gomo. A roda senta em cima de quem matou, do texto da morte e do cronômetro. No teclado os quatro gomos não têm uma tecla óbvia. No toque o gomo é pequeno. Leitor de tela lê um círculo sem ordem clara. A morte já soltou o pointer lock, então a roda não aproveita a mira travada que esse gesto costuma pedir. Captura: `07-alt-roda.png`.

A pausa usa o painel no centro porque a ação já está congelada e não há cronômetro de nascer. Morte, Bomba e pausa entre waves usam a faixa no fundo, para o mundo e o relógio ficarem livres. Na Bomba a faixa diz “Na mão agora” e lembra que o pente não enche sozinho. B fecha a faixa e devolve a mira. Entre waves da Invasão, a mesma faixa.

### Forma da ficha

```json
{
  "name": "Arame",
  "primary": 0,
  "secondary": 4,
  "melee": 7,
  "hand": "primary",
  "kits": {
    "rifle": { "optic": "arame", "barrel": "bica", "mag": "", "stock": "sabugo" }
  }
}
```

Os índices do exemplo são os de hoje (`shared/rules.js`); o código lê a chave, e o índice viaja porque o loadout atual já é índice. `kits` só precisa das armas que a ficha equipa. Arma sem lugar vai com kit vazio. Três fichas, teto duro: a UI não oferece uma quarta. Renomear é na bancada, num campo de texto ao lado dos três chips. Nome vazio volta para “Ficha 1”.

A linha dos chips entra acima do título da bancada aprovada. A captura 01 não foi refeita: o miolo (lugares, olhar, carimbar, comparação) fica. O chip aberto é a ficha que “Por na arma” grava. Trocar de chip na bancada não manda nada para a partida; só muda qual ficha a oficina está editando.

### Fluxo da home

1. Comanda. O jogador abre o Arsenal pela caixa, como hoje. Movimento reduzido corta a viagem.
2. Arsenal. Uma arma de cada grupo, como hoje. A arma selecionada ganha um segundo clique, ou o botão “Temperar” no cartão, e vira a arma aberta.
3. A grade dos outros grupos sai. No lugar fica a bandeja daquela família à esquerda e a bancada à direita. Acima do título, três chips e o nome dizem qual ficha a bancada grava. Esc ou “← Arsenal” volta à grade, sem fechar a caixa. O segundo Esc fecha a caixa, como hoje.
4. Quatro lugares (ou três, na escopeta). Um está em foco.
5. As peças daquele lugar são botões. Uma está “Na arma”. Outra pode estar “Olhando”.
6. Olhar atualiza a comparação. Não equipa.
7. “Por na arma” carimba a peça olhada. Se ela já está na arma, o botão fica “Já está na arma” e não faz nada.
8. A escolha cai na ficha aberta, no `localStorage`, na hora. Online, segue no próximo `prof` / `pr`. A frase de confirmação: “Alça de arame no Fuzil, na ficha Arame. Vale quando você nascer.”

Mouse, teclado e toque usam o mesmo verbo. Passar o mouse não muda número. Número muda ao olhar (foco, seta ou toque). Isso evita comparação que só existe no hover e some no celular e no leitor de tela.

Na home, sem relógio, olhar e carimbar continuam separados. Na partida o toque na ficha já é o carimbo: a ficha dourada é a que vai nascer, e um segundo botão “Por na arma” não existe ali. Desfazer é tocar a ficha anterior, ou apertar o número dela.

### Hierarquia da bancada

```
Comanda
  └─ Arsenal
       └─ Bancada, com a ficha aberta (1, 2 ou 3)
            ├─ Lugares (mira, cano, pente, mão)
            ├─ Peças do lugar em foco
            ├─ Comparação (só o que muda)
            └─ Carimbar, na ficha aberta
Partida (morte, pausa, Bomba, entre waves, lobby)
  └─ Três fichas
       └─ A dourada entra nesta vida, ou na próxima
```

A comparação é do lugar em foco, não do kit inteiro. “Agora” é o kit carimbado. “Se carimbar” é esse kit com o lugar trocado pela peça olhada. Linha igual some. A frase embaixo é uma oração, com o ganho e o custo.

Régua de madeira, não gráfico de DPS. O número cru fica ao lado, em pt-BR (`0,09`). A cor ajuda e não é o único canal: a frase diz “fecha” ou “abre”. Verde de “melhor” foi evitado de propósito, porque recuo menor e campo maior não são o mesmo eixo.

### Teclado, mouse e toque

Home, bancada aberta, foco dentro dela:

| Tecla | Ato |
|---|---|
| 1 2 3 | troca a ficha que a bancada grava. Com o foco no nome, o número digita |
| ← → | troca o lugar |
| ↑ ↓ | olha a peça anterior ou a próxima |
| Enter | carimba a peça olhada na ficha aberta |
| Esc | volta ao Arsenal. De novo, volta à comanda |

Tab segue a ordem natural: voltar, armas da família, lugares, peças, carimbar. Cada lugar é `role="tab"`. As peças são `role="radio"` num `radiogroup` com o nome da arma. O botão carimbar é o commit.

Morte, Bomba, entre waves e pausa, mouse solto. O mesmo verbo no clique, na tecla e no toque:

| Tecla | Ato |
|---|---|
| 1, 2, 3 | arma essa ficha na hora |
| ← → ou ↑ ↓ | a ficha vizinha, também na hora |
| Espaço, ou Enter no botão | nascer, quando o tempo acabou, com a ficha dourada |
| Esc, na pausa | continuar. A ficha dourada espera a próxima vida |
| B, na Bomba e entre waves | fecha a faixa e devolve a mira |

Espaço não troca ficha. Trocar é 1, 2, 3 ou o toque no cartão. Enter no botão de nascer nasce; Enter com o foco num cartão arma essa ficha, do mesmo jeito que o número. Os dois atos ficam em controles diferentes, e o botão de nascer anuncia a ficha (“Nasce com a Arame”).

Não usar `,` e `.`: na Exploração elas trocam a primária.

Toque: o cartão inteiro é o alvo, acima de 44 px. Abaixo de 720 px os três cartões empilham na largura da tela, o cronômetro fica preso no topo da folha e o botão de nascer fica preso embaixo. Não há segundo carimbo. A bancada da home, sem relógio, continua um lugar por vez, com “Por na arma” grudado no fim do painel: lá a decisão é a peça, e cabe ler.

Pointer lock vivo: nenhum destes atalhos. A pausa é o caminho, e lá a ficha só enfileira.

### Estados

| Estado | Como se mostra | Quando |
|---|---|---|
| De fábrica | Nome da peça da casa, sem selo de erro | Sempre disponível. É a escolha “pelado” |
| Na arma | Filete dourado e a palavra “Na arma” | A peça carimbada daquele lugar |
| Olhando | Contorno dourado `#edc982`, o mesmo foco visível da caixa, e a comparação | Foco, seta ou toque, antes do carimbo |
| Já está na arma | O botão de carimbar desabilitado, com esse texto | Olhando a peça que já está carimbada |
| Não entra nesta arma | O lugar ou a peça não é desenhado. Uma linha na bandeja diz onde ela existe | Luneta no fuzil, boca na sniper |
| Sem bancada | Ilustração da caixa fechada e a frase “Essa peça da casa já vem temperada.” Botão de voltar | Faca, sabre, bazuca, disco, milho, besta, arco, ovo, minigun |
| Lacrado | Peça visível, listra, sem clique, condição por extenso | Desenhado, desligado no MVP |
| Sala proibiu a arma | A arma some do Arsenal, como hoje. O kit dela fica guardado e não viaja | `weaponOn` |
| Kit inválido vindo da rede ou do disco | Vira de fábrica naquele lugar, em silêncio | `clampKit` |

Arma proibida não apaga a memória. Se o anfitrião devolver o grupo, o kit volta.

### Feedback

- Carimbar: a frase de uma linha, em região `aria-live="polite"`. Uma batida curta de madeira no WebAudio que o jogo já sintetiza, respeitando o mudo da home. Sem arquivo novo.
- Os números que mudam trocam no ato. Com `prefers-reduced-motion`, sem deslize.
- No nascimento, o aviso que já existe (“Nasceu de novo com o equipamento novo”) ganha o nome da ficha quando a troca foi na pausa. Na morte, o cartão dourado já mostrou. Não empilhar toast.
- Erro de rede não tem peça: o servidor corrigiu em silêncio e o cliente, ao receber o `spawn`, alinha a UI ao kit aceito. Se o jogador carimbou uma luneta num fuzil por cliente adulterado, a UI volta para Massa de milho sem modal.

### Acessibilidade

- Contraste da caixa: creme em madeira escura, dourado em marrom. Contraste da morte: tinta `#34402e` em `#f6e4bd`, carimbo com creme. Sem letra marrom em madeira clara.
- Foco sempre visível, 3 px, na cor que a caixa já usa.
- Nome acessível em texto. A miniatura é `alt=""` / `aria-hidden`.
- A comparação tem frase. A régua é decorativa (`aria-hidden`) para o leitor não ouvir três barras e depois a mesma oração.
- Alvo de 44 px no toque. Na partida o alvo é o cartão, bem maior. O estado armado tem texto, além da cor. A barra do cronômetro é `aria-hidden`; o tempo está no botão e na frase.
- A viagem da caixa continua cancelável por Esc e por movimento reduzido. A bancada funciona nos dois.
- Não depender de arrastar. Não há ordem de peça para o jogador ordenar.

### Wireframes

Bancada, home. A captura 01. A linha dos chips é o acréscimo; o miolo da captura permanece.

```
┌ Caixa ─────────────────────────────────────────────────────────┐
│ [← Arsenal]   [1 Pelada] [2 Arame · aberta] [3 Torresmo]      │
│               EQUIPAMENTO DA CASA                              │
│               Temperar o Fuzil Pururuca                        │
│               Uma peça por lugar. Grava na ficha Arame.        │
│ ┌ Rajada ──────────┐ ┌ Bancada ─────────────────────────────┐ │
│ │ ■ Fuzil          │ │ [Mira·olhando] [Cano] [Pente] [Mão] │ │
│ │   Commando       │ │ ( ) Massa de milho      Na arma      │ │
│ │   Metralhadora   │ │ (•) Alça de arame       Olhando      │ │
│ │   MP5K           │ │ ( ) Anel de barbante                 │ │
│ │                  │ │ Agora            Se carimbar         │ │
│ │ Luneta não       │ │ aproxima  40     aproxima  34        │ │
│ │ aparece aqui.    │ │ mirando  0,12    mirando  0,09       │ │
│ └──────────────────┘ │ quadril  0,010   quadril  0,012      │ │
│                      │ “Aproxima e fecha no botão direito.  │ │
│                      │  No quadril, abre um pouco.”         │ │
│                      │              [ Por na arma ]         │ │
│                      └──────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

Morte. Captura `02-morte.png`. Folha no fundo. A metade de cima fica com quem matou.

```
        Você foi pururucado por Torresmo
        a ficha dourada já está armada
════════════════════════════════════════  barra · Renasce em 3,2s
[1 Pelada]  [2 Arame · vai nascer]  [3 Torresmo]   [ Renascer em 3,2s ]
 Fuzil        Fuzil · mira 34          Sniper         Espaço, com a Arame
 mira 40      fecha no direito         1 no corpo
```

Pausa. Captura `04-pausa.png`. Painel no centro, ação já parada.

```
Pausa na chapa
Escolhe a ficha da próxima vida. Continuar não te derruba.
[1 Pelada]  [2 Arame · na próxima vida]  [3 Torresmo]
[ Continuar · Esc ]
```

Preparação da Bomba, e a pausa entre waves. Captura `05-bomba.png`. O site fica no centro.

```
                         SITE A

════ Rodada em 8s · a ficha entra agora ════
[1 Pelada] [2 Arame · na mão agora] [3 Torresmo]
1 2 3 troca na hora · B fecha e devolve a mira
```

Tela estreita. Captura `03-estreita.png`. Cartões empilhados, cronômetro preso em cima, nascer preso embaixo.

```
Você foi pururucado por Torresmo
════ 3,2s ════
[ 1 Pelada · Fuzil · mira 40 ]
[ 2 Arame · vai nascer com esta ]
[ 3 Torresmo · Sniper ]
[ Renascer em 3,2s ]
```

Arma sem lugar, só na bancada:

```
Temperar a Faca de churrasqueiro
[ caixa fechada ]
Essa peça da casa já vem temperada.
A cor do sabre, quando for o caso, continua no Arsenal.
[ ← Arsenal ]
```

---

## 5. Plano de implementação

Nenhuma fase abaixo está feita. Porte é o tamanho da mudança, não um prazo.

### Arquivos

| Arquivo | Fase | Mudança |
|---|---|---|
| `shared/attachments.js` | 0 | Catálogo, `clampKit`, `resolveWeapon`, `compare`, frases |
| `test-acessorios.mjs` | 0 | Contas do Fuzil, da Calibre 12, da sniper, tetos, kit sujo, arma sem lugar |
| `index.html` | 1 e 3 | Bancada dentro de `#menu-arsenal`, com a linha das três fichas. Cartões em `#deathpick`, `#pause`, `#bLoad`, `#iLoad` e no lobby |
| `style.css`, `hud-death.css` | 1 e 3 | Bandeja, estados, folha de madeira no fundo, cartão armado, 720 px, foco |
| `main.js` | 1–4 | Abrir/fechar bancada, Esc em dois passos, `docao.fichas`, tiro/recarga/HUD/zoom/passo com a cópia resolvida, três cartões no lugar da grade |
| `server/src/game.js` | 2 | `nextKit` / `kit`, `pr`/`px`/`prof`, `spawn`, `canShoot`, `progressReload`, `hitscan` |
| `server/src/index.js` | 2 | Mensagem `kit` no mesmo caminho do `prof` |
| `shared/combat.js` | 2 | `sniperSpread` lê `hipMul` e `swayMul` com padrão 1, para o jogo de hoje não mudar |
| `net.js` | 2 | Enviar e aplicar o evento de kit no spawn, fora do pacote de 20 Hz |
| `main.js` (malha) e `docao.js` | 4 | Grupos opcionais de mira, cano, pente, cabo, com `noCamo` no vidro |
| `weapon-camo.js` | 4 | Só se a lente nova não herdar `noCamo` sozinha. A pintura não ganha stat |
| `server/migrations`, `account.js` | 5, opcional | Kit na conta, convidado intacto |
| `README.md`, `PATCH_NOTES.md` | quando for versão | Controles e a frase de jogador. O README de 1–9 já está velho; na leva da ficha, 1, 2 e 3 passam a ser as fichas |

`weapon-thumbs.js` fica. A miniatura não muda no MVP. Um selo de uma letra na doca (“temperado”) basta para a home fechada mostrar que o fuzil não está pelado.

### Fases

**Fase 0 — contrato.** Porte pequeno. Módulo compartilhado e teste node, sem UI. Critério: o Fuzil com Alça de arame resolve 34 / 0,09 / 0,012; Canhão com Vidro de conserva permanece em fov 8 e a frase diz que o zoom não desce mais; Calibre 12 com boca não ganha nem perde `knock`; kit com luneta no fuzil volta vazio; `WEAPONS[0].adsFov` continua 40 depois do resolve.

**Fase 1 — bancada na home, offline.** Porte grande, concentrado em `main.js` e no CSS da caixa. O tiro local, a recarga, o HUD de munição, o zoom e o passo usam `resolveWeapon` da ficha aberta. A linha das três fichas grava em `docao.fichas`. Bots continuam de fábrica. Esc em dois níveis. Movimento reduzido. 720 px com um lugar por vez. Ainda não há servidor. Critério: carimbar na ficha 2, recarregar a página, ver a mesma peça nessa ficha e a ficha 1 intacta; comparar só mostra linha que mudou; faca mostra o estado vazio; leitor de tela ouve a frase ao mover a seta.

**Fase 2 — servidor.** Porte médio, risco no protocolo. Worker primeiro. Cliente velho entra e joga de fábrica. Pente e queda conferidos com dois clientes de teste, no modelo de `test-online.mjs`. Corrida do join. Troca viva não cria bala. Pausa comum não mata. Critério: um cliente adulterado que manda `mag: 999` ou luneta no fuzil nasce com o clamp; o dano a 30 m com Cano de bica no MP5K bate com `falloffMul` da cópia, nos dois lados.

**Fase 3 — morte, pausa, lobby, Bomba, Invasão.** Porte médio. Três cartões no lugar da grade de `#deathpick` e da lista de `#pause`, `#bLoad`, `#iLoad` e do lobby. 1, 2 e 3 armam a ficha. Espaço nasce com a dourada quando a barra zera. A pausa manda `pr`. Bomba e entre waves aplicam na hora com a regra do pente, faixa no fundo, B devolve a mira. Abaixo de 720 px os cartões empilham, o cronômetro fica preso em cima e o nascer embaixo. Critério em 1280×720 e em 390×844: a mensagem de quem matou e o cronômetro continuam visíveis, um toque troca a ficha, e nascer sem tocar usa a última. Suíte existente de respawn e de bomba continua verde.

**Fase 4 — malha.** Porte grande. Só primeira pessoa, e só três silhuetas reaproveitadas (alça, cano mais longo, pente mais alto), ligadas por visibilidade, sem geometria nova por quadro. Não reparentar `rMag` nem a telha da pump. Terceira pessoa fica para o fim desta fase e pode sair do corte se a malha de `docao.js` não tiver um grupo óbvio. Vidro com `noCamo`. Miniatura não é refeita. Critério: recarga do fuzil e da pump iguais às de hoje com a peça de fábrica; com a fita, o pente visível é mais alto e a animação ainda acha o mesh.

**Fase 5 — conta, se o João pedir.** Porte médio. Migração D1, `PUT` do kit, convidado no `localStorage`, mesmo catálogo aberto. Sem lacre.

### Riscos

| Risco | Por que acontece | O que a leva faz |
|---|---|---|
| A bancada mente um número que o servidor não aplica | Cone, recuo, zoom e passo são do cliente | A frase e este plano separam feeling de stat garantido. Dano de perto não entra no MVP |
| Pente grátis no meio da vida | `equipNow` hoje enche arma nova | `min(atual, novo)` e o teste online |
| Esc fecha a caixa inteira no meio da escolha | Hoje Esc na caixa volta à comanda | Primeiro Esc só sai da bancada, coberto por teste de teclado |
| Folha da morte cobre quem matou ou o cronômetro | 14 primárias mais uma faixa de peças | A grade sai. Três cartões no fundo. Barra e botão dizem o tempo. Captura em 1280×720 e em 390 px |
| Enter nasce em vez de armar a ficha | Espaço e Enter já são o RENASCER | Espaço e o botão nascem. 1, 2, 3 e o toque no cartão armam. O botão anuncia o nome da ficha |
| O hábito do 1–9 na morte quebra | Hoje 1 é Fuzil e 9 é Canhão, e cinco armas ficam de fora | O nome da arma vai grande no cartão. A sniper mora na ficha 3, montada no Arsenal. O README velho se corrige nesta leva |
| Ficha pede arma que a sala proibiu | O anfitrião marca grupos, não peças | `clampLoadout` devolve o fallback e o cartão mostra essa arma antes de nascer |
| Cliente novo, Worker velho | Campo extra ignorado | Jogo segue sem peça. Site só depois do Worker |
| Cliente velho, Worker novo | Sem quinto campo | De fábrica. Sem queda de protocolo |
| Recarga da pump quebra ao mostrar a peça | A telha é um grupo com posição animada | Fase 4 não mexe nesse grupo. Peça é irmão, não pai |
| Mutar `WEAPONS` vaza peça para o bot e para o outro jogador no mesmo isolate | O array é módulo único no Worker | `resolveWeapon` copia. O teste da fase 0 lê o original depois |
| Apertar o anti-cheat de velocidade | Folga de 35% é de propósito | MVP não mexe em `maxH` |
| Lacre por abate no F12 | `localStorage` é do jogador | Lacre desligado |
| Doca e dança e miniaturas no mesmo quadro | A home já está cheia de canvas | Bancada é DOM. Miniatura não invalida |

### Fora deste plano

- Peça em bazuca, disco, milho, besta, arco, ovo, faca, sabre, minigun.
- Quarto slot de arma, faca como acessório, ou kit que a sala inteira é obrigada a usar.
- Ranked, pick de rascunho no começo do round de Mata-mata, ou troca de peça com a mira travada.
- Refazer as miniaturas em 3D ao vivo dentro da caixa.
- Mudar dano de perto ou cadência para “valer a pena” a peça. Se uma peça parecer inútil sem isso, ela sai do catálogo. Não se empurra o TTK.

---

## 6. O que ainda é decisão do João

1. **MVP com tudo aberto**, memória só no navegador. Recomendado. A alternativa é a fase 5, ainda sem lacre.
2. **Ficha na pausa não derruba.** Ela espera a próxima vida. O `px` fica no servidor para o cliente antigo. A pausa nova não tem o botão de se derrubar. Recomendado, para a ficha não virar fuga nem pente grátis.
3. **Sem peça nas armas de regra própria** (lista da seção 3). Recomendado para a primeira leva caber na bancada sem mentir o stat.
4. **Malha só depois do stat e do menu** (fase 4). A primeira versão da bancada usa a miniatura que já existe e os números. Recomendado: o jogador entende a troca pela frase, e a malha não segura o resto.
5. **Cano de bica cria queda leve nas armas que hoje não têm**, exceto nas três de precisão. É o único lugar em que um stat novo aparece. Se isso parecer aumento de escopo, o cano dessas armas fica só em penetração, recuo e passo, e a frase não promete alcance.

Com essas cinco no sim, a fase 0 pode começar sem outra rodada de produto.
