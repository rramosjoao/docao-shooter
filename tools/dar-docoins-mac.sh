#!/usr/bin/env bash
# Dá Docoins de TESTE a uma conta no banco LOCAL (server/.wrangler). Nunca toca a produção (--local).
# Uso: ./tools/dar-docoins-mac.sh Apelido 500
set -e
[ -n "$1" ] || { echo "Uso: $0 Apelido [quantidade]"; exit 1; }
N="${2:-500}"; case "$N" in ''|*[!0-9]*) echo "Quantidade inválida"; exit 1;; esac
NICK="${1//\'/}"
cd "$(dirname "$0")/../server"
npx wrangler d1 execute docao-contas --local --command "UPDATE accounts SET coins = coins + $N WHERE nick = '$NICK'; SELECT nick, coins FROM accounts WHERE nick = '$NICK'"
echo "Pronto. Abra o BRECHÓ de novo (ele confere o saldo no servidor ao abrir)."
