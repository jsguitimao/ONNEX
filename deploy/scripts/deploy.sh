#!/usr/bin/env bash
# =============================================================================
# Onnex — deploy no VPS (substitui o "git push → Vercel")
#
#   /opt/onnex/app/deploy/scripts/deploy.sh            # deploy do main mais recente
#   /opt/onnex/app/deploy/scripts/deploy.sh --no-pull  # deploy do código local como está
#
# Passos: git pull → guarda imagem anterior (rollback) → build → migrações →
# up → smoke test. Se o smoke test falhar, instruções de rollback no fim.
# =============================================================================
set -euo pipefail

APP_DIR=/opt/onnex/app
ENV_FILE=/opt/onnex/.env
COMPOSE=(docker compose -f "$APP_DIR/deploy/docker-compose.yml" --env-file "$ENV_FILE")

cd "$APP_DIR"

if [ "${1:-}" != "--no-pull" ]; then
  echo "==> git pull"
  git pull --ff-only
fi

echo "==> A guardar imagem atual como onnex-app:previous (rollback)"
if docker image inspect onnex-app:latest >/dev/null 2>&1; then
  docker tag onnex-app:latest onnex-app:previous
fi

echo "==> Build da nova imagem"
"${COMPOSE[@]}" build app

echo "==> Migrações do Prisma"
"${COMPOSE[@]}" run --rm migrate

echo "==> A subir a nova versão"
"${COMPOSE[@]}" up -d

echo "==> Smoke test (até 60s)"
for i in $(seq 1 12); do
  sleep 5
  if curl -fsS -o /dev/null http://127.0.0.1:80 -H "Host: onnex.pt" --max-time 5 2>/dev/null \
     || "${COMPOSE[@]}" exec -T app wget -q -O /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
    echo "✅ Deploy OK — app a responder ($(git rev-parse --short HEAD))"
    docker image prune -f >/dev/null
    exit 0
  fi
done

echo "❌ App não respondeu ao smoke test. Logs:"
"${COMPOSE[@]}" logs --tail=50 app
echo ""
echo "ROLLBACK manual:"
echo "  docker tag onnex-app:previous onnex-app:latest"
echo "  ${COMPOSE[*]} up -d app"
exit 1
