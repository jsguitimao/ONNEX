# Migração ONNEX: Vercel + Neon → VPS (Contabo)

**Data do plano:** 2026-07-16
**Decisão:** migrar app + base de dados para VPS próprio **antes** de haver clientes reais (risco mínimo agora).
**VPS escolhido:** Contabo Cloud VPS 6 (6 vCPU / 12 GB RAM / 200 GB), região **União Europeia (Alemanha)**, Ubuntu 24.04 LTS.

## O que muda e o que NÃO muda

| Componente | Hoje | Depois | Risco |
|---|---|---|---|
| App Next.js | Vercel (fra1) | Docker no VPS (standalone) | Controlado (staging antes do flip) |
| Base de dados | Neon Free | Postgres 17 no VPS | Janela de cutover ~15 min |
| HTTPS/proxy | Vercel | Caddy (Let's Encrypt automático) | Cert emitido ao flip (~1 min) |
| Deploy | `git push` → Vercel | `deploy.sh` no VPS (git pull+build+migrate+up) | Rollback via imagem `previous` |
| Backups BD | Neon (retenção 6h) | `pg_dump` a cada 6h, retenção 7 dias + offsite | **Melhor** que hoje |
| Clerk, Stripe, Resend, WhatsApp, Upstash, Sentry, Vercel Blob, cron-job.org | SaaS | **Iguais — zero alterações** (o domínio não muda) | Nenhum |
| DNS onnex.pt | Hostinger → Vercel (76.76.21.21) | Hostinger → IP do VPS | Reversível em minutos |

**Única alteração de código:** `output: "standalone"` no `next.config.ts` (ignorada pela Vercel — os dois ambientes coexistem durante toda a migração).

**Rate-limit (segurança):** o `getClientIp()` usa `x-vercel-forwarded-for` na Vercel e cai para `x-forwarded-for` fora dela. O Caddy, por omissão (sem `trusted_proxies`), descarta o `X-Forwarded-For` do cliente e escreve só o IP real — o rate-limit continua não-falsificável. **Nunca configurar `trusted_proxies` no Caddyfile.**

## Ficheiros do kit (pasta `deploy/`)

- `Dockerfile` — imagem standalone (build multi-stage, non-root) + stage `migrator`
- `docker-compose.yml` — caddy + app + db (Postgres só em 127.0.0.1:5433) + serviço `migrate`
- `Caddyfile` — HTTPS automático para onnex.pt/www + bloco staging comentado
- `env.production.example` — modelo do `/opt/onnex/.env` (valores copiados da Vercel)
- `scripts/server-setup.sh` — hardening + Docker + cron de backups (correr 1×)
- `scripts/deploy.sh` — deploy com rollback automático preparado
- `scripts/backup-db.sh` / `scripts/restore-db.sh` — backup 6/6h e restauro testável

---

## Fase 0 — Comprar o VPS (só o dono pode fazer)

1. contabo.com → **Cloud VPS 6** → faturação mensal (confirmar taxa de setup no checkout) → região **European Union (Germany)** → imagem **Ubuntu 24.04 LTS** → sem extras (Object Storage/painéis não são precisos).
2. Guardar o email da Contabo com **IP do servidor** e **password root**.
3. Entregar IP + password ao Claude (ou colar aqui) para executar as fases 1–2 por SSH.

## Fase 1 — Preparar o servidor (1×)

```bash
ssh root@<IP>
# colar o conteúdo de deploy/scripts/server-setup.sh e correr
git clone https://github.com/<org>/<repo>.git /opt/onnex/app
cp /opt/onnex/app/deploy/env.production.example /opt/onnex/.env
nano /opt/onnex/.env   # preencher com os valores da Vercel + POSTGRES_PASSWORD novo
chmod 600 /opt/onnex/.env
```

Depois: criar **chave SSH** e desligar login por password (`PasswordAuthentication no` em `/etc/ssh/sshd_config.d/`), e tirar **1 snapshot Contabo** do servidor limpo.

## Fase 2 — Staging (testar TUDO antes de mexer em produção)

1. Na Hostinger (hPanel → Domínios → onnex.pt → DNS): criar registo **A `vps` → IP do VPS** (TTL 300).
2. Descomentar o bloco `vps.onnex.pt` no `Caddyfile`.
3. No `/opt/onnex/.env` **de staging**: usar chaves Clerk de TESTE, Stripe test mode, `NEXT_PUBLIC_APP_URL=https://vps.onnex.pt`, BD local vazia (`migrate` cria o schema).
4. `deploy/scripts/deploy.sh --no-pull` → abrir https://vps.onnex.pt e testar: landing, página pública de barbearia, reserva completa, CRM, upload de imagem.
5. Testar restauro: `backup-db.sh` + `restore-db.sh` (prova o mecanismo de backup no dia 1).

## Fase 3 — Cutover (janela ~15 min, fazer à noite)

**Véspera:** baixar TTL dos registos `@` e `www` do onnex.pt para 300 na Hostinger.

1. **Pausar o job no cron-job.org** (evita lembretes duplicados durante o flip).
2. Trocar `/opt/onnex/.env` para os valores de **produção** (Clerk live, Stripe live, `NEXT_PUBLIC_APP_URL=https://onnex.pt`) — `deploy.sh --no-pull`.
3. **Copiar a BD** (do VPS, precisa de `postgresql-client-17`; connection string DIRETA do Neon, sem `-pooler`):
   ```bash
   pg_dump "<NEON_DIRECT_URL>" -Fc > /var/backups/onnex/neon-final.dump
   docker exec -i onnex-db-1 psql -U onnex -d onnex -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   docker exec -i onnex-db-1 pg_restore -U onnex -d onnex --no-owner --no-privileges < /var/backups/onnex/neon-final.dump
   docker compose -f /opt/onnex/app/deploy/docker-compose.yml --env-file /opt/onnex/.env restart app
   ```
4. **Flip DNS na Hostinger:** `@` (A) e `www` → IP do VPS (substituir os registos da Vercel `76.76.21.21` / cname).
5. Aguardar 1–5 min: o Caddy emite o certificado ao primeiro pedido com DNS propagado.

> Janela de propagação: pedidos antigos ainda caem na Vercel (que continua a funcionar contra o Neon antigo). Com zero clientes reais, uma reserva perdida nesta janela de minutos é risco aceitável — é exatamente por isto que se migra AGORA.

## Fase 4 — Verificação pós-flip (checklist)

- [ ] https://onnex.pt e https://www.onnex.pt com cadeado válido (Let's Encrypt)
- [ ] Landing, página pública, /crm com login Clerk OK
- [ ] **Reserva de teste completa** → email Resend + WhatsApp entregues
- [ ] Gestão de reserva via link /booking/<token> (cancelar/remarcar)
- [ ] Upload de imagem no editor (Vercel Blob)
- [ ] Stripe: dashboard → webhook → "Send test event" → 200
- [ ] WhatsApp: webhook de estados a receber `delivered`
- [ ] Retomar job no cron-job.org → correr 1× à mão → 200
- [ ] Sentry a receber eventos do novo ambiente
- [ ] `backup-db.sh` correu via cron (ver /var/log/onnex-backup.log)

**Rollback (se algo estiver mal):** repor na Hostinger o A `@` → `76.76.21.21` e o `www` → cname da Vercel. A Vercel + Neon ficam intactas durante todo o período de garantia — voltar atrás demora minutos.

## Fase 5 — Pós-migração

- Manter Vercel + Neon **paradas mas intactas 2 semanas** (rede de segurança). Só depois apagar o projeto Vercel e a BD Neon.
- Configurar **rclone → Google Drive** e descomentar a linha offsite no `backup-db.sh` (proteção contra perda total do VPS).
- Tirar **snapshot Contabo** com tudo a funcionar.
- Atualizar memória/docs: deploy passa a ser `deploy.sh` no VPS (o `git push` deixa de fazer deploy!).
- Cancelar/ignorar `vercel.json` e o registo `vps.onnex.pt` quando já não forem precisos.
