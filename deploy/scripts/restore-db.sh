#!/usr/bin/env bash
# =============================================================================
# Onnex — restauro da BD a partir de um backup do backup-db.sh
#
#   deploy/scripts/restore-db.sh /var/backups/onnex/onnex-YYYYMMDD-HHMM.dump
#
# ATENÇÃO: substitui TODO o conteúdo da BD pelo backup. Pára a app durante o
# restauro para não haver escritas a meio.
# =============================================================================
set -euo pipefail

DUMP="${1:?Uso: restore-db.sh <ficheiro .dump>}"
[ -f "$DUMP" ] || { echo "Ficheiro não existe: $DUMP"; exit 1; }

APP_DIR=/opt/onnex/app
ENV_FILE=/opt/onnex/.env
COMPOSE=(docker compose -f "$APP_DIR/deploy/docker-compose.yml" --env-file "$ENV_FILE")

read -r -p "Isto SUBSTITUI a BD atual por $DUMP. Escrever RESTAURAR para continuar: " CONFIRM
[ "$CONFIRM" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }

echo "==> A parar a app"
"${COMPOSE[@]}" stop app

echo "==> Restauro (drop + recreate do schema public)"
docker exec -i onnex-db-1 psql -U onnex -d onnex -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i onnex-db-1 pg_restore -U onnex -d onnex --no-owner --no-privileges < "$DUMP"

echo "==> A subir a app"
"${COMPOSE[@]}" up -d app
echo "✅ Restauro concluído."
