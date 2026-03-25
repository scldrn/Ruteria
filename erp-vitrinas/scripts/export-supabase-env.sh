#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-dotenv}"
STATUS_OUTPUT="$(supabase status -o env)"

read_value() {
  local key="$1"
  printf '%s\n' "$STATUS_OUTPUT" | awk -F= -v search_key="$key" '
    $1 == search_key {
      value = substr($0, index($0, "=") + 1)
      gsub(/^"/, "", value)
      gsub(/"$/, "", value)
      print value
    }
  '
}

NEXT_PUBLIC_SUPABASE_URL="$(read_value API_URL)"
NEXT_PUBLIC_SUPABASE_ANON_KEY="$(read_value ANON_KEY)"
SUPABASE_SERVICE_ROLE_KEY="$(read_value SERVICE_ROLE_KEY)"
DB_URL="$(read_value DB_URL)"
SUPABASE_DB_PASSWORD="$(printf '%s\n' "$DB_URL" | sed -E 's|^postgresql://[^:]+:([^@]+)@.*$|\1|')"

if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" || -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" || -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
  echo "No se pudieron leer las credenciales del Supabase local" >&2
  exit 1
fi

emit_dotenv() {
  cat <<EOF
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
SUPABASE_DB_PASSWORD=$SUPABASE_DB_PASSWORD
STORAGE_BUCKET_FOTOS=fotos-visita
EOF
}

case "$MODE" in
  dotenv)
    emit_dotenv
    ;;
  github)
    : "${GITHUB_ENV:?GITHUB_ENV no está definido}"
    emit_dotenv >> "$GITHUB_ENV"
    ;;
  *)
    echo "Modo no soportado: $MODE" >&2
    exit 1
    ;;
esac
