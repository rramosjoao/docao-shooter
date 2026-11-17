# Brechó da Porca Véia 🧺: personalizador de skin + loja de partes (Docoins)

**Status: em teste local (branch `feature/loja-skins`). Nada foi para a produção** (sem migração 0002 remota, sem deploy, sem release).

## O que é
- **Personalizador** (menu → 🧺 BRECHÓ → Personalizar): escolhe cor da camiseta, cor do shorts (grátis, paleta fixa de 14 cores) e **uma parte por espaço** (cabeça, rosto, pescoço, corpo, cintura, mãos, pés), só entre as partes que estão na **mochila**. Prévia 3D ao vivo. **Salvar e usar** grava na conta (D1). Convidado não salva nem compra.
- **Loja** (aba Loja): partes à venda por **Docoins 🪙**. Clicar no cartão experimenta na prévia sem comprar.
- As **skins atuais não mudam**: o visual personalizado é uma skin a mais ("Visual personalizado"), guardada junto da conta. Escolher uma skin da lista continua funcionando e o visual personalizado fica guardado.
- As peças 3D são as que **já existem** no modelo (`costumes.js`/`docao.js`), só com cores novas: nenhum modelo novo.

## Como o visual viaja
O visual vira um **código curto** (ex.: `x1.3.5.h3.f2.s1`, no máx. 48 caracteres): `x1.` + cor da camiseta + cor do shorts + ids das partes. É esse texto que vai na rede no lugar do id da skin. O servidor só aceita a forma canônica (cores na paleta, partes existentes, uma por espaço).

## Moeda: Docoins (só ganha jogando)
Sem compra com dinheiro real, sem conversão. Tudo calculado no **servidor** (o cliente nunca informa saldo ou ganho).

Conta nova começa com **500 Docoins** (`START_COINS` em `shared/closet.js`; o cadastro grava `coins` no INSERT). Conta que já existia ganha **+500 uma vez** na migração `0004_saldo_inicial.sql` (`UPDATE accounts SET coins = coins + 500`). O Wrangler aplica cada arquivo uma vez. Convidado não tem saldo.

| Evento | Docoins |
|---|---|
| Abate de adversário humano (não vale colega de time, suicídio nem Invasão) | +2 |
| Abate de bot | +1 |
| Fim de partida jogada (jogador ficou ≥ 60 s; não vale na Invasão) | +10 |
| Vitória na partida | +15 |
| Invasão: por wave alcançada (wave 1 não conta) | +3 |
| Invasão: vitória | +25 |
| **Teto por partida** | **80** |
| **Teto por dia (UTC) por conta** | **400** |
| Treino | **0** (nada é gravado) |

Anti-farm: teto por partida e por dia (o diário é aplicado dentro do próprio UPDATE do D1, atômico); bônus de fim só para quem jogou ≥ 60 s; abates em bots rendem metade; Treino não rende; ganhos são gravados por **delta** (gravar duas vezes não soma de novo).
Com o teto diário de 400 e a loja a 40–300, dá para comprar de 2 a 10 partes por dia de jogo intenso.

## Desafios diários (3 por dia, banco de 60)
- Banco e regras em `shared/challenges.js` (60 desafios: 24 fáceis, 24 médios, 12 difíceis; tabela em `/workspace/loja-prev/PROPOSTAS.md`).
- Sorteio: `hash(id da conta, dia de Brasília)` → 1 fácil + 1 médio + 1 difícil. O dia vira à 0h de America/Sao_Paulo. O sorteio não é gravado.
- Contagem: a sala (`server/src/game.js`, `cq()`) soma contadores por jogador com conta (abates, cabeça, armas, streaks, zonas, botijão, zumbis, poderes, danças, chat, voz...). Treino não conta e Exploração é offline (nunca chega ao servidor).
- Gravação: no fim da partida ou na saída, junto do ranking. `recordStats` lê `accounts.chal` (1 SELECT, só se houve contagem), aplica e grava no **mesmo UPDATE** do crédito da partida. `chal IS antigo` impede pagar duas vezes se duas salas gravarem juntas.
- Prêmio: entra no saldo na hora em que completa. **Sem teto** (o limite é ser só 3 por dia). Os tetos de partida (80/partida, 400/dia) continuam.
- Leitura: `GET /api/me` → `chal: { day, resetIn, list: [{ id, text, mode, tier, goal, reward, prog, done }] }`. Tela: painel "🎯 Desafios do dia" no menu principal (no céu em telas ≥1000×600; dentro da ficha em telas menores), com texto, x/meta, prêmio, ✓ e contagem até o reset; clicar abre a aba 🎯 Desafios do Brechó. Convidado vê uma chamada para entrar. Usa o mesmo /api/me da conta (só leitura).
- Migração: coluna `accounts.chal TEXT` na `0003_desafios.sql` (separada; NÃO aplicada em produção, nem a 0002).

## Segurança (servidor autoritativo)
- **Saldo/ganho**: só o Worker altera `accounts.coins` (ganho no lote de estatísticas; compra no `/api/shop/buy`). O preço vem do catálogo do servidor (`shared/closet.js`), ignorando qualquer preço/saldo vindo do cliente.
- **Compra atômica** (`D1.batch`): `INSERT` condicional na mochila (só se o saldo cobre) + `UPDATE` com `coins >= preço`; chave primária `(account_id, item)` barra compra dupla (o lote inteiro volta atrás). Testado com 5 compras simultâneas do mesmo item e 2 compras que não cabem no saldo.
- **Equipar**: um `UPDATE` condicional só aplica se **todas** as partes do código estão na mochila. Na sala (`prof`), o servidor reaplica a mesma checagem; convidado nunca ganha visual personalizado (nem mandando o código na URL ou no lobby).
- Rede: payload pequeno (≤ 48 caracteres), validado por regex + catálogo; código forjado/gigante é ignorado.

## Custo Cloudflare (plano pago de US$ 5) — estimativa
Referência: o plano Workers Paid inclui D1 com cerca de 25 bilhões de linhas lidas e 50 milhões de linhas escritas por mês (confira no painel; passou disso, cobra por milhão).
- **Ganho de Docoins**: **0 requisições novas**. É 1 `UPDATE` a mais dentro do mesmo lote de estatísticas que já roda 1x por jogador no **fim da partida / saída**. ≈ 2–4 linhas escritas por jogador por partida.
- **Compra**: 1 leitura prévia (2 linhas) + 1 lote (≈ 3 linhas escritas/lidas). Só quando o jogador compra.
- **Equipar visual**: 1 `UPDATE` condicional (não escreve se nada mudou) + só se mudou, 1 leitura. Trocar skin na lista é agrupado (espera 700 ms parado antes de gravar).
- **Mochila/saldo**: vêm junto do `/api/me` (1 lote de 2 SELECT pequenos, ≈ até 40 linhas), uma vez ao abrir o jogo/Brechó e **uma vez no fim de cada partida online** (para atualizar o saldo). **Sem polling.** O cliente guarda mochila e saldo em memória.
- **Ranking**: continua com cache de 60 s na borda.
- Exemplo: 1.000 jogadores com conta × 5 partidas/dia ≈ 5.000 partidas → ~20 mil linhas escritas/dia (~600 mil/mês) e uns 200 mil/mês lidas: **bem abaixo** das cotas incluídas.

## Partes à venda (32) — para aprovação
**Cabeça**

- 🧢 Boné do Churrasqueiro — 60 Docoins (`h1`, peça `cap`)
- 🧢 Boné Verde Granja — 60 Docoins (`h2`, peça `cap`)
- 🎩 Fedora do Mafioso do Chiqueiro — 150 Docoins (`h3`, peça `fedora`)
- 🎣 Chapéu de Pescador de Linguiça — 110 Docoins (`h4`, peça `bucketHat`)
- 🧶 Gorro do Inverno Sulista — 90 Docoins (`h5`, peça `roundCap`)
- 🎸 Cabeleira de Roqueiro — 180 Docoins (`h6`, peça `longHair`)
- 🌶️ Cabeleira Pimenta com Faixa — 200 Docoins (`h7`, peça `longHair`)

**Rosto**

- 👓 Óculos de Intelectual — 50 Docoins (`f1`, peça `glasses`)
- 🕶️ Óculos Escuros de Churrasco — 90 Docoins (`f2`, peça `sunglasses`)
- 🤓 Óculos Quadrado de Dev — 70 Docoins (`f3`, peça `squareGlasses`)
- 🥩 Bigode de Açougueiro — 80 Docoins (`f4`, peça `beard`)
- 😎 Óculos Radical Azul — 120 Docoins (`f5`, peça `sunglasses`)

**Pescoço**

- 💰 Corrente de Porco Rico — 250 Docoins (`n1`, peça `chain`)
- 🧣 Cachecol Vermelho e Branco — 70 Docoins (`n2`, peça `scarf`)
- 🏴‍☠️ Bandana do Churrasco — 55 Docoins (`n3`, peça `bandana`)
- 🪪 Cordão de Crachá — 65 Docoins (`n4`, peça `lanyard`)
- 🏜️ Lenço do Deserto — 80 Docoins (`n5`, peça `desertScarf`)

**Corpo**

- 🦺 Colete de Pescador — 120 Docoins (`b1`, peça `vest`)
- 🎖️ Dragonas Douradas — 130 Docoins (`b2`, peça `epaulettes`)
- 🤠 Faixa Larga do Peão — 100 Docoins (`b3`, peça `sash`)
- 🥊 Faixas de Lutador — 60 Docoins (`b4`, peça `armWraps`)
- 🧥 Jaqueta Bufante Azul — 220 Docoins (`b5`, peça `puffer`)

**Cintura**

- 🪄 Varinha do Chef — 120 Docoins (`w1`, peça `wand`)
- 🐟 Peixe de Cinto — 90 Docoins (`w2`, peça `fish`)
- ⚔️ Espeto Laser Verde — 300 Docoins (`w3`, peça `laserSword`)

**Mãos**

- 🧤 Luvas Brancas — 70 Docoins (`g1`, peça `glove`)
- 🧤 Luvas Pretas — 70 Docoins (`g2`, peça `glove`)
- ✨ Luvas Brilhantes — 260 Docoins (`g3`, peça `glove`)

**Pés**

- 👟 Tênis do Torresmo — 80 Docoins (`s1`, peça `shoes`)
- 🥾 Botinha Vermelha — 80 Docoins (`s2`, peça `shoes`)
- 🧦 Meiões Brancos — 40 Docoins (`s3`, peça `socks`)
- 👟 Tênis Azul Royal — 80 Docoins (`s4`, peça `shoes`)


## O que falta para a produção (NÃO feito)
1. Aprovar o catálogo/preços e as regras de ganho.
2. Aplicar as migrações **0002**, **0003** e **0004** no D1 de produção (`docao-contas`): `cd server && npx wrangler d1 migrations apply docao-contas --remote` (a 0002 acrescenta `coins` e a mochila; a 0004 soma 500 Docoins em cada conta que já existe, sem zerar o saldo). Aplicar a 0004 **antes** do deploy do Worker que grava 500 no cadastro.
3. Deploy do Worker pela receita (bindings `ROOMS` + `DB`, sem ALLOW_TEST).
4. Push na main e release (patch notes: rascunho em `docs/RASCUNHO-PATCH-NOTES-BRECHO.md`).
5. Conferir em produção: cadastro, `/api/me` com `items`/`coins`, compra com conta de teste (depois apagar), salvar visual, sala online com os dois visuais.
**Ordem importante**: migração 0002 **antes** do deploy do Worker novo (o Worker novo lê as colunas novas).

## Testar no Mac
`./tools/rodar-loja-mac.sh` (site 8136, Worker 8796, D1 simulado local) e, para ganhar Docoins de teste, `./tools/dar-docoins-mac.sh SeuApelido 500`. Detalhes no fim do relatório da tarefa.

## Testes automatizados
`test-loja.mjs` (servidor: ganho, teto diário, compra, compra dupla/simultânea, saldo nunca negativo, equipar parte alheia, rede, convidado barrado), `test-loja-regras.mjs` (regras de ganho sem navegador), `test-loja-ui.mjs` (ateliê, loja, salvar, recarregar, sair da conta, 32 partes montam no modelo). `test-loja-itens.mjs` (fantasias, danças, chapéus novos), `test-desafios-regras.mjs` (banco de 60, sorteio, dia de Brasília, contadores da sala, gravação num SQLite em memória com as migrações) e `test-desafios.mjs` (ponta a ponta com wrangler local: /api/me, partida online, pagamento único, Treino não conta).
