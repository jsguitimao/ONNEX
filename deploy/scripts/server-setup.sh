#!/usr/bin/env bash
# =============================================================================
# Onnex — preparação inicial do VPS (Ubuntu 24.04 LTS, correr como root, UMA vez)
#
#   curl -fsSL https://raw.githubusercontent.com/<repo>/main/deploy/scripts/server-setup.sh | bash
#   (ou copiar o ficheiro e: bash server-setup.sh)
#
# Faz: atualizações automáticas de segurança, firewall (22/80/443), fail2ban,
# Docker + Compose, estrutura /opt/onnex, cron de backups da BD.
# =============================================================================
set -euo pipefail

echo "==> [1/6] Atualizações do sistema + unattended-upgrades"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq unattended-upgrades fail2ban ufw git curl ca-certificates
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> [2/6] Firewall: só SSH (22), HTTP (80) e HTTPS (443)"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> [3/6] fail2ban (proteção brute-force no SSH)"
systemctl enable --now fail2ban

echo "==> [4/6] Docker + Compose (repositório oficial)"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

echo "==> [5/6] Estrutura /opt/onnex"
mkdir -p /opt/onnex /var/backups/onnex
chmod 750 /var/backups/onnex
if [ ! -d /opt/onnex/app/.git ]; then
  echo "    (clonar o repo manualmente: git clone <URL do repo> /opt/onnex/app)"
fi

echo "==> [6/6] Cron de backups da BD (a cada 6h) + limpeza"
cat > /etc/cron.d/onnex-backup <<'CRON'
# Backup da BD Onnex a cada 6 horas (min hora dia mês dia-semana)
15 */6 * * * root /opt/onnex/app/deploy/scripts/backup-db.sh >> /var/log/onnex-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/onnex-backup

echo ""
echo "✅ Servidor preparado. Próximos passos (ver docs/MIGRACAO-VPS.md):"
echo "   1. git clone <repo> /opt/onnex/app"
echo "   2. criar /opt/onnex/.env (a partir de deploy/env.production.example) + chmod 600"
echo "   3. /opt/onnex/app/deploy/scripts/deploy.sh"
