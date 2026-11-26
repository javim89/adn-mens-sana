#!/usr/bin/env bash
# CURL_OPTS=-k permite correrlo sin la CA de OrbStack en el sistema (deja de verificar el TLS).
set -uo pipefail
cd "$(dirname "$0")/.."

fallas=0
ok() { echo "ok    $1"; }
falla() { echo "FALLA $1"; fallas=$((fallas + 1)); }

# shellcheck disable=SC2086
pedir() { curl -sS -m 60 ${CURL_OPTS:-} -o /dev/null "$@"; }

sin_5xx() {
  local code
  code=$(pedir -w '%{http_code}' "$1")
  if [[ $code =~ ^[234] ]]; then ok "$1 -> $code"; else falla "$1 -> $code"; fi
}

redirige() {
  local destino
  destino=$(pedir -w '%{redirect_url}' "$1")
  if [[ $destino == "$2"* ]]; then ok "$1 redirige a $2"; else falla "$1 redirige a '$destino', se esperaba $2"; fi
}

# Una navegación sin cookie dev de Clerk pasa por su handshake: tiene que volver al mismo host.
handshake() {
  local destino esperado
  esperado="redirect_url=https%3A%2F%2F$1%2Fdashboard"
  destino=$(pedir -H 'Accept: text/html' -w '%{redirect_url}' "https://$1/dashboard")
  if [[ $destino == *"$esperado"* ]]; then ok "handshake de Clerk vuelve a $1"; else falla "handshake de $1 sin $esperado"; fi
}

origen() {
  local code
  code=$(pedir -H "Origin: $1" -H 'Sec-Fetch-Mode: cors' -H 'Sec-Fetch-Site: cross-site' \
    -w '%{http_code}' https://bioteam.local/_next/webpack-hmr)
  if [[ $2 == bloqueado ]]; then
    if [[ $code == 403 ]]; then ok "Origin $1 bloqueado"; else falla "Origin $1 -> $code, se esperaba 403"; fi
  elif [[ $code == 403 || $code == 000 ]]; then
    falla "Origin $1 -> $code"
  else
    ok "Origin $1 permitido -> $code"
  fi
}

salud=$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q web)" 2>/dev/null)
if [[ $salud == healthy ]]; then ok "contenedor healthy"; else falla "contenedor: ${salud:-no existe}"; fi

sin_5xx https://bioteam.local/
sin_5xx https://bioteam.local/sign-in
sin_5xx https://demo.bioteam.local/sign-in
redirige https://demo.bioteam.local/ https://demo.bioteam.local/dashboard
redirige https://bioteam.local/dashboard https://bioteam.local/
redirige https://demo.bioteam.local/dashboard https://demo.bioteam.local/
handshake bioteam.local
handshake demo.bioteam.local
origen https://bioteam.local permitido
origen https://demo.bioteam.local permitido
origen https://ajeno.example bloqueado

if ((fallas)); then
  echo "$fallas fallas"
  exit 1
fi
