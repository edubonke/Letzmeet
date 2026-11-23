#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
umask 077
# Secrets persist only in an ignored local file; never commit this file.
if [[ ! -f .env.local ]]; then
  {
    echo 'export LETZMEET_SANDBOX=1'
    printf 'export LETZMEET_INTERNAL_HMAC_SECRET=%s\n' "$(openssl rand -hex 48)"
    printf 'export LETZMEET_SANDBOX_PAYMENT_HMAC_SECRET=%s\n' "$(openssl rand -hex 48)"
    printf 'export LETZMEET_VAULT_KEY=%s\n' "$(openssl rand -base64 32 | tr -d '\n')"
    printf 'export LETZMEET_MESSAGES_KEY=%s\n' "$(openssl rand -base64 32 | tr -d '\n')"
  } >.env.local
fi
source .env.local
node src/runner.mjs vault & VAULT_PID=$!
node src/runner.mjs core & CORE_PID=$!
trap 'kill "$VAULT_PID" "$CORE_PID" 2>/dev/null || true' EXIT
wait
