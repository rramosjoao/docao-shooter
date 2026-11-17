# Login (contas) — como testar e como subir pra produção

Escopo: login opcional com **apelido fixo** (um apelido = uma conta), **ranking** (abates, mortes, vitórias, partidas por modo; Treino não conta), **skin salva na conta** (só skins que já existem) e **convidado continua jogando**. Senha com **PBKDF2-SHA256** (100 000 iterações, sal por conta), sessão por **token aleatório** (só o hash SHA-256 fica no banco), limite de tentativas por apelido/IP.

## Teste local (Mac)
`./tools/rodar-login-mac.sh` — usa o D1 simulado (`server/.wrangler/state`), site na porta 8135 e Worker na 8795 (mude com `SITE_PORT`/`WORKER_PORT`). Nada vai pra Cloudflare. `ALLOW_TEST` não é ligado.

## Produção (feito na v1.17: D1 docao-contas id 992d49c8-9c5f-48e9-80d0-d79c595ae896, migração 0001 aplicada, Worker com bindings ROOMS + DB)
Passos, caso precise refazer:
1. Criar o D1: `cd server && npx wrangler d1 create docao-contas` (copiar o `database_id` que aparece).
2. Trocar o `database_id` de mentira (`0000…`) no `server/wrangler.jsonc` pelo id real.
3. Migração: `npx wrangler d1 migrations apply docao-contas --remote` (cria accounts, sessions, stats, rate_limits).
4. Deploy do Worker (receita normal, agora **com** o binding `DB` além do `ROOMS`; sem `ALLOW_TEST`).
5. Publicar o site (push na main) e conferir: cadastro, login, `/api/rank`, jogo como convidado e online com conta.
Sem o binding `DB` o servidor responde 503 nas rotas de conta e o jogo segue como convidado (nada quebra).

## Custo do D1 (cota separada do Workers)
- Entrar na sala com conta: 1 leitura (token → conta). Visitante: 0.
- Gravar ranking: abates e mortes são somados em memória e gravados em lote só quando o jogador sai da sala ou a partida acaba (1 escrita por jogador logado por vez; visitante e Treino: 0).
- Ranking: soma a tabela inteira; a resposta fica 60 s no cache da borda (no máx. ~1 leitura da tabela por minuto por filtro).
- Limpeza de sessões/limites vencidos: 5% das requisições, em lote.
