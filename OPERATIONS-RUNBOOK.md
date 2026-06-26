# Operations Runbook — Onnex

Runbook de procedimentos operacionais derivados do `SECURITY-AUDIT-2026-05.md`. Cada secção é uma checklist accionável que o owner pode executar nos dashboards (Vercel / Twilio / Upstash / Neon) sem alterar código.

Última actualização: 2026-05-20.

---

## 1. Rotação de secrets expostos

### Twilio (descontinuado — limpar)

**Porquê:** o WhatsApp passou para a Cloud API oficial da Meta. O Twilio já não é usado por nenhum código. As env vars `TWILIO_*` e a conta/sandbox devem ser removidas para não deixar credenciais penduradas.

**Como (5 min):**
1. Abrir https://vercel.com/guilhermebilla2-9868s-projects/buk-next/settings/environment-variables
2. Apagar `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` e `TWILIO_WHATSAPP_FROM` (todas as environments)
3. Vercel → **Deployments** → mais recente → ⋯ → **Redeploy**
4. Opcional: em https://console.twilio.com, encerrar o projecto/sandbox de WhatsApp se já não for usado para mais nada.

### BLOB_READ_WRITE_TOKEN

**Porquê:** apareceu em screenshots / chats antigos.

**Como (5 min):**
1. Abrir https://vercel.com/guilhermebilla2-9868s-projects/buk-next/storage
2. Selecionar o Blob store deste projeto
3. Tab **Tokens** → encontrar o token actual
4. Clicar em **"Reset token"** ou **"Regenerate"** → confirmar
5. Vercel actualiza o env var `BLOB_READ_WRITE_TOKEN` automaticamente
6. Vercel → **Deployments** → forçar **Redeploy** do deployment de produção
7. Testar upload no `/dashboard` → confirma que ainda funciona

---

## 2. Ajustar Sentry para Hobby quota

**Porquê:** default actual `tracesSampleRate=0.2` (20%) é alto para Hobby (Sentry free tier dá 10K traces/mês). Em produção sem tráfego ainda não é problema, mas quando começarem reservas reais, pode queimar quota.

**Como (2 min):**
1. Abrir https://vercel.com/guilhermebilla2-9868s-projects/buk-next/settings/environment-variables
2. Clicar **"Add New"** → adicionar:
   - Name: `SENTRY_TRACES_SAMPLE_RATE`
   - Value: `0.05`
   - Environments: **Production only**
   - Save
3. (Opcional) adicionar também:
   - Name: `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`
   - Value: `0.05`
   - Environments: **Production only**
4. Forçar redeploy do production
5. Sentry vai amostrar 5% dos traces em vez de 20% — erros continuam todos capturados (errors são separados do tracing)

**Quando rever:** se Sentry mostrar "Approaching quota" em qualquer mês, baixar ainda mais para `0.02`. Se ficares < 50% da quota, podes voltar a subir.

---

## 3. Confirmar Upstash Redis em produção (rate limiting distribuído)

**Porquê:** `src/lib/rate-limit.ts` usa Upstash quando configurado, senão fallback in-memory. Em Vercel serverless, in-memory **não partilha estado** entre instâncias — significa que um atacante pode disparar requests contra instâncias diferentes e contornar o rate limit.

**Como verificar (3 min):**
1. Abrir https://vercel.com/guilhermebilla2-9868s-projects/buk-next/settings/environment-variables
2. Procurar **`UPSTASH_REDIS_REST_URL`** e **`UPSTASH_REDIS_REST_TOKEN`**
3. Se **AMBOS existem em Production**: ✅ rate limiting distribuído activo. Pular para 4.
4. Se faltam: criar Redis na Upstash → adicionar env vars → redeploy

**Como criar (se faltar, ~5 min):**
1. Abrir https://console.upstash.com
2. **Create Database** → escolher região mais próxima de Vercel (eu-central-1)
3. **Type:** Regional · **Eviction:** allkeys-lru · **TLS:** enabled
4. Copiar **REST URL** e **REST TOKEN** da página do database
5. Vercel → Environment Variables → adicionar ambos como **Production only**
6. Redeploy

**Como testar:** abrir DevTools → Network → executar 130 GETs a `/api/public/[teu-slug]` em sequência. Deve receber 429 a partir do request ~121 (limite 120/min). Se receberes muitos 200 acima de 120, o Upstash não está activo.

---

## 4. Neon DR (Disaster Recovery)

### Estado actual

- **Plano:** Free tier
- **Backup:** point-in-time recovery automático dentro de **7 dias**
- **RPO (Recovery Point Objective):** 0-5 min (Neon faz checkpoints contínuos)
- **RTO (Recovery Time Objective):** 5-15 min (depende de quanto demora a criar branch + redeploy)
- **Snapshots externos:** ❌ nenhum configurado (adiado até haver tráfego pagante)

### Procedimento de recuperação (se DB ficar corrompida ou um deploy mau corromper dados)

**Cenário A — Reverter para um ponto no passado (até 7 dias atrás)**

1. Abrir https://console.neon.tech
2. Selecionar o projecto Onnex
3. Sidebar → **Branches** → clicar **"Create branch"**
4. Source: **"Branch from a specific timestamp"**
5. Escolher timestamp ANTES do incidente (ex: "há 30 minutos")
6. Branch type: **"Read-only"** primeiro (para confirmar que os dados estão bem)
7. Copiar a **connection string** dessa nova branch
8. Vercel → Environment Variables → editar `DATABASE_URL` → colar a nova connection string → **Production only**
9. Forçar redeploy
10. Testar produção → se OK, na Neon mudar a branch de read-only para **primary** (vai promover essa branch como a nova principal)

**Cenário B — DB completamente inacessível**

1. Verificar https://neon.tech/status
2. Se Neon estiver down, esperar (não há fallback configurado no plano free)
3. Se for problema só da nossa instância, abrir ticket no Neon support

**Cenário C — Dados específicos corrompidos (e.g., uma migration apagou uma coluna importante por engano)**

1. Criar branch da Neon a partir de timestamp ANTES do incidente (passos 1-6 acima)
2. Connectar à branch via Prisma Studio ou `psql`
3. Exportar a tabela afetada: `pg_dump --table="Booking" "$DATABASE_URL_OLD" > restore.sql`
4. Importar à branch primary actual: `psql "$DATABASE_URL_PROD" < restore.sql`

### Quando configurar backups externos

**Critério:** quando tiveres a **primeira barbearia real** a usar e a guardar reservas, exportar `pg_dump` semanal para um bucket S3 ou Vercel Blob. Antes disso, não vale o trabalho.

---

## 5. Itens diferidos com critérios para revisitar

Estes itens NÃO devem ser atacados agora. Cada um tem um critério explícito de "quando voltar".

### 5.1 Migrar Clerk para production instance
- **Critério:** sentir que precisas de domínio `clerk.onnex.pt` (e-mails de verificação a partir de `@onnex.pt`, white-label de UI)
- **O que envolve:** novo Clerk production instance, CNAMEs adicionais no DNS Hostinger, trocar `pk_live_` / `sk_live_` na Vercel
- **Quanto tempo:** ~2-3h + propagação DNS

### 5.2 Ligar números reais de barbearias (WhatsApp Cloud API)
- **Critério:** primeira barbearia real a querer enviar confirmações por WhatsApp
- **O que envolve:** token permanente (System User token) em vez do temporário de teste, verificação da empresa na Meta, e o fluxo de embedded signup que guarda o `phone_number_id` da barbearia em `Business.whatsappPhoneNumberId`. Os templates `reserva_confirmada` / `lembrete_marcacao` já estão submetidos.
- **Custo operacional:** ~€0.02–0.04 por mensagem de Utilidade em Portugal

### 5.3 Backups externos (snapshots pg_dump)
- **Critério:** primeiro cliente pagante OU > 100 marcações reais armazenadas
- **O que envolve:** script de export semanal + storage em Vercel Blob ou S3
- **Quanto tempo:** ~2h setup

### 5.4 CSP em modo Report-Only
- **Critério:** se aparecerem violations de CSP em logs Vercel/Sentry causando bugs visuais
- **Estado actual:** CSP em enforced (não bloqueia nada visível). Não vale recuar para Report-Only.

---

## 6. Quando aplicar tudo isto

**Hoje / esta semana (alta prioridade):**
- ☑️ Secção 1 (limpeza Twilio + rotação Blob)
- ☑️ Secção 2 (Sentry sample rate)

**Quando tiveres tempo (média prioridade):**
- ☑️ Secção 3 (confirmar Upstash em produção)

**Quando aparecer necessidade (baixa prioridade):**
- Secções 4, 5 — reactivos, baseados em critérios.

---

## 7. Histórico

| Data | Evento | Doc |
|------|--------|-----|
| 2026-05-19 | Audit pré-launch realizada | `SECURITY-AUDIT-2026-05.md` |
| 2026-05-20 | Fix error message leak em `/api/upload` | PR #8 |
| 2026-05-20 | Runbook operacional consolidado | Este doc |

---

_Manter este doc actualizado quando: (a) rotacionar secrets, (b) ajustar Sentry, (c) configurar Upstash, (d) atacar qualquer item diferido._
