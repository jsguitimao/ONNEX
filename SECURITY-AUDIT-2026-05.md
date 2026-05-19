# Security Audit — 2026-05-19

Auditoria read-only ao estado de segurança da Onnex (Next.js 16 + Vercel + Neon + Clerk + Twilio sandbox). Escopo: env vars, auth boundaries, mensagens de erro, headers HTTP, rate limiting, validação de input, webhooks, CSRF, observability.

Conclusão geral: **bom estado**. A maioria das defesas que se esperam num projecto de produção já está em vigor. Apenas 1 fix real identificado e algumas recomendações de hardening pré-launch.

---

## 1. Auth boundaries

### Middleware (`src/proxy.ts`)

Apenas `/api/dashboard(.*)` está protegido via `clerkMiddleware` + `auth.protect()`. Tudo o resto faz verificação ao nível da page ou da route. Decisão histórica intencional:

- `/dashboard` page NÃO está protegida no proxy porque o rewrite interno do Clerk (`/clerk_<ts>`) cai no catch-all `/[slug]/page.tsx` e parte o routing.
- `/api/upload` NÃO está protegida no proxy porque o webhook `onUploadCompleted` do Vercel Blob faz POST sem cookies de utilizador.

### Tabela de protecções por rota

| Rota | Tipo | Auth | Rate Limit | Origin Check | Zod | Sentry |
|------|------|------|------------|--------------|-----|--------|
| `GET /` (homepage) | Page pública | — | — | — | — | — |
| `GET /[slug]` | Page pública | — | (ISR) | — | — | ✅ |
| `GET /termos`, `/privacidade` | Page pública | — | — | — | — | — |
| `GET /booking/[token]` | Page pública (token-protected) | Token | (no fetch) | — | — | — |
| `GET /preview` | Page client-only (postMessage) | — | — | — | — | — |
| `GET /mock` | Page pública (demo) | — | — | — | — | — |
| `GET /dashboard` | Page protegida | ✅ Clerk session (degrada para demo readOnly se anon) | — | — | — | — |
| `GET /crm` | Page protegida | ✅ Redirect to `/sign-in` se anon | — | — | — | ✅ |
| `GET /api/dashboard` | API | ✅ Clerk `isAuthenticated` | — | (CSRF protegido por SameSite cookies) | — | server log |
| `PUT /api/dashboard` | API | ✅ Clerk `isAuthenticated` | ✅ 20/min | — | ✅ | server log |
| `POST /api/upload` | API | ✅ Via `getCurrentBusiness()` no token callback | ✅ 30/5min | — | (HandleUpload body) | server log |
| `GET /api/public/[slug]` | API | — | ✅ 120/min | — | — | ✅ |
| `GET /api/public/[slug]/availability` | API | — | ✅ 45/min | — | ✅ | ✅ |
| `POST /api/public/[slug]/bookings` | API | — | ✅ 12/5min | ✅ | ✅ | ✅ |
| `GET /api/public/booking/[token]` | API | Token | ✅ 60/min | — | — | ✅ |
| `PATCH /api/public/booking/[token]` | API | Token | ✅ 12/10min | ✅ | ✅ | ✅ |
| `GET /api/public/booking/[token]/availability` | API | Token | ✅ 30/min | — | ✅ | ✅ |
| `GET/POST /api/cron/send-reminders` | API | ✅ CRON_SECRET (timing-safe equals) | — | — | — | ✅ + ReminderRunLog |

**Verdict:** ✅ todas as rotas privadas têm auth. Todas as rotas mutantes públicas têm rate limit + Zod + origin check. Cron usa comparação timing-safe (`node:crypto.timingSafeEqual`).

---

## 2. Headers HTTP (`next.config.ts`)

CSP completa em modo enforced (não Report-Only). Headers em vigor:

| Header | Valor | Avaliação |
|--------|-------|-----------|
| `X-Frame-Options` | `SAMEORIGIN` | ✅ |
| `X-Content-Type-Options` | `nosniff` | ✅ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | ✅ |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | ✅ HSTS de 2 anos, preload-ready |
| `Content-Security-Policy` | (ver abaixo) | ✅ comprehensive |

CSP inclui: `default-src 'self'`, `frame-ancestors 'self'`, `object-src 'none'`, whitelist explícita para Clerk / Sentry / Vercel / Blob / Cloudflare Challenges. Usa `'unsafe-inline'` em style-src (Tailwind) e script-src (Next.js inline) — standard para Next.js, aceitável.

**Verdict:** ✅ headers em ordem. Nenhuma alteração crítica recomendada.

---

## 3. Erros expostos

A maioria das rotas trata erros corretamente (mensagens genéricas + Sentry captureException + status code apropriado). Mapping de erros internos para mensagens user-friendly é consistente.

**🐛 1 fix real identificado:**

**`src/app/api/upload/route.ts:67-69`** — quando `handleUpload` falha, devolve `error.message` raw ao client:
```ts
const message = error instanceof Error ? error.message : "Erro ao carregar ficheiro.";
return NextResponse.json({ error: message }, { status: 400 });
```

Risco: mensagens internas do Vercel Blob ou stack details podem chegar ao browser. Fix proposto: whitelist apenas as mensagens user-friendly que o próprio handler lança (e.g., "Formato não suportado..."); resto genérico. **A fixar no PR 2.**

---

## 4. Env vars / leaks

Procurei `process.env.*` em `src/`. Todos os usages são leituras server-side ou variáveis públicas (`NEXT_PUBLIC_*`). Nenhum secret hardcoded, nenhum env exposto em código client.

Secrets actuais (server-side only): `CRON_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `SENTRY_AUTH_TOKEN`, `UPSTASH_REDIS_REST_TOKEN`, `BLOB_READ_WRITE_TOKEN`.

**Verdict:** ✅ sem leaks. **Ação operacional pendente (fora do código):** rotacionar `TWILIO_AUTH_TOKEN` e `BLOB_READ_WRITE_TOKEN` que foram visíveis em screenshots de sessões anteriores.

---

## 5. Rate limiting (`src/lib/rate-limit.ts`)

Implementação híbrida: Upstash Redis quando configurado (`UPSTASH_REDIS_REST_*`), fallback in-memory caso contrário. Em Vercel serverless, in-memory é por-instância (não partilha estado entre cold starts) — adequado como fallback, não como controlo principal.

**Verdict:** ✅ todas as rotas públicas têm rate limit. Recomendação: confirmar que `UPSTASH_REDIS_REST_*` está configurado em produção para garantia distribuída (foi documentado no `.env.example`).

---

## 6. CSRF

Estratégia por tipo de rota:

| Tipo | Mecanismo |
|------|-----------|
| `/api/dashboard/*` (Clerk-protected) | Clerk sessão + SameSite cookies |
| `/api/public/*/bookings` (POST) | `validatePublicMutationOrigin` + rate limit |
| `/api/public/booking/[token]` (PATCH) | Token unguessable na URL + `validatePublicMutationOrigin` |
| `/api/cron/send-reminders` | CRON_SECRET (Bearer) |
| `/api/upload` (POST) | Auth via `getCurrentBusiness()` no callback |

**Verdict:** ✅ cobertura adequada. Sem tokens CSRF explícitos (não são necessários com origin check + SameSite cookies).

---

## 7. Webhooks

Sem rotas de webhook explícitas no projecto actualmente:
- Twilio: sandbox não envia status callbacks por defeito; nenhum webhook configurado
- Clerk: nenhum endpoint `/api/webhooks/clerk` (sem dependência de eventos user.created)
- Vercel Blob: `onUploadCompleted` é callback interno, não webhook HTTP

**Verdict:** ✅ sem webhooks → sem vector. **Recomendação para futuro:** se adicionar webhook Twilio (status de entrega) ou Clerk (sync de utilizadores), implementar verificação de assinatura com `svix` (Clerk) ou Twilio request validator antes de qualquer DB write.

---

## 8. Cookies

A app não escreve cookies próprios. Toda a auth-related cookie management é do Clerk (Secure + HttpOnly + SameSite=Lax por defeito). O `cookie-banner.tsx` apenas escreve `onnex.cookieConsent.v1` em `localStorage` (não cookie). Não há tracking de cookies publicitários.

**Verdict:** ✅ adequado para GDPR baseline. Banner de consentimento mostrado na primeira visita.

---

## 9. Observability (Sentry — `src/lib/sentry-options.ts`)

Sentry configurado com defaults razoáveis:
- Server: `tracesSampleRate` default 0.2 (20%) — **alto para Hobby quota**. Recomendado lowerizar para 0.05-0.1 em produção.
- Client: `tracesSampleRate` default 0.1 (10%) — OK
- `replaysSessionSampleRate` default 0 — ✅ sem session replay por defeito
- `replaysOnErrorSampleRate` default 1 — ✅ 100% replay em erros (útil para debug sem queimar quota)
- Source maps: gerados se `SENTRY_AUTH_TOKEN` presente em build, ocultados do browser pelo Sentry SDK

**Verdict:** ✅ funcional. **Recomendação para PR 4:** ajustar env var `SENTRY_TRACES_SAMPLE_RATE=0.05` em produção Vercel para não queimar quota Hobby.

---

## 10. Neon DR (point-in-time recovery)

Free tier Neon suporta point-in-time recovery dentro de 7 dias (branching). **Sem snapshots externos configurados.** Adequado pré-launch.

**Recomendação documentar** (PR 4):
- RPO actual: 0-5 min (Neon faz checkpoint contínuo)
- RTO actual: 5-15 min (criar branch a partir do PiT desejado + apontar `DATABASE_URL` para a branch)
- Como recuperar: dashboard Neon → projeto → Branches → "Restore" picker → escolher timestamp → criar branch read-only → mudar `DATABASE_URL` na Vercel → redeploy

---

## 11. Higiene / lixo

- 🗑️ `tmp-crm-review.png` na root do repo (untracked, lixo de uma sessão de review) — **apagado neste PR**.

---

## Próximos PRs derivados deste audit

### PR 2 — Aplicar fixes críticos (escopo pequeno)
1. Fix `/api/upload/route.ts` error message leak (item 3 acima)
2. Eventualmente: aplicar fixes adicionais que apareçam ao testar

### PR 3 — Hardening adicional (escopo médio)
1. Confirmar `UPSTASH_REDIS_REST_*` em produção (operacional, sem código)
2. Revisão fina da CSP se aparecerem violations em logs Vercel/Sentry

### PR 4 — Sentry + DR docs (escopo pequeno)
1. Definir `SENTRY_TRACES_SAMPLE_RATE=0.05` na Vercel (operacional)
2. Documentar Neon DR (este doc actualizado se necessário)

### Operacional (sem PR — owner faz nos dashboards)
- Rotacionar `TWILIO_AUTH_TOKEN` (Twilio Console → Auth Tokens → rotate)
- Rotacionar `BLOB_READ_WRITE_TOKEN` (Vercel → Storage → Blob → reset token)
- Após cada rotação: actualizar env var na Vercel + redeploy

---

## Diferidos (não fazer agora)

- **Clerk hardening final** — esperar migração para Clerk production instance (CNAMEs em `clerk.onnex.pt`).
- **Twilio WhatsApp Business** — esperar primeira barbearia real interessada.
- **DR com snapshots externos** — não vale o trabalho enquanto não há tráfego pagante.
- **CSP em Report-Only** — a actual em enforced está a passar; não vale recuar.

---

_Última actualização: 2026-05-19. Auditor: Claude Code (Opus 4.7) + revisão Codex (CLI Claude)._
