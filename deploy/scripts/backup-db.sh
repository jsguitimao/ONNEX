#!/usr/bin/env bash
# =============================================================================
# Onnex — backup da BD (chamado pelo cron a cada 6h; pode correr-se à mão)
#
# Formato custom do pg_dump (-Fc): comprimido e restaurável com pg_restore.
# Retenção local: 28 backups (~7 dias). Offsite opcional via rclone (ver fim).
# =============================================================================
set -euo pipefail

BACKUP_DIR=/var/backups/onnex
STAMP=$(date +%Y%m%d-%H%M)
OUT="$BACKUP_DIR/onnex-$STAMP.dump"

mkdir -p "$BACKUP_DIR"

docker exec onnex-db-1 pg_dump -U onnex -d onnex -Fc > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
echo "[backup] $(date -Is) OK: $OUT ($(du -h "$OUT" | cut -f1))"

# Retenção: manter os 28 mais recentes
ls -1t "$BACKUP_DIR"/onnex-*.dump 2>/dev/null | tail -n +29 | xargs -r rm -f

# --- Offsite (RECOMENDADO — proteger contra perda total do VPS) --------------
# Depois de configurar o rclone (ex.: Google Drive: `rclone config`),
# descomentar a linha abaixo:
# rclone copy "$OUT" gdrive:onnex-backups/ --quiet
