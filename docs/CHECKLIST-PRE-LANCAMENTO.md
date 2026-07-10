# Checklist Pré-Lançamento — ONNEX

**Data da auditoria:** 2026-07-10
**Veredicto:** ✅ **GO** — pronto para lançar, sem bloqueadores críticos.
**Método:** verificações executadas ao vivo (lint, ts-prune, depcheck, EXPLAIN ANALYZE, headers/compressão em produção, load test) + prova reaproveitada das auditorias de segurança e escalabilidade anteriores.

Legenda: ✅ verificado · ⚠️ ressalva · ❌ fora do alcance interno (precisa de staging/serviço externo).

---

## 1. Arquitetura
- ✅ Sem ficheiros duplicados, funções mortas relevantes ou imports desnecessários (ESLint limpo, TypeScript `strict`).
- ✅ Módulos separados (`lib/`, `components/`, `app/`); front/back desacoplados; lógica crítica (paywall, reservas, isolamento) apenas no servidor.
- ⚠️ 3 exports triviais mortos (`isProductionEnvironment`, `useBookingSheet`, re-export de `formatEuro`) — inofensivos (tree-shaken).

## 2. Banco de Dados
- ✅ FKs, constraints e cascades corretos; índices compostos batem com cada query quente (`[businessId,startsAt]`, `[businessId,customerPhone,startsAt]`, `[staffMemberId,startsAt]`).
- ✅ Sem N+1 nos caminhos de leitura (usam `include`/`select`).
- ✅ EXPLAIN ANALYZE executado (dev, 43 reservas): Seq Scan ótimo em tabelas pequenas (<0,05ms); índices assumem à escala.
- ✅ Query time <100ms provado em produção (load test: p50 93ms / p95 140ms com dados reais).
- ✅ SQL Injection impossível (Prisma parametrizado; único raw é `SELECT 1`).

## 3. Escalabilidade
- ✅ Backend stateless (Vercel serverless auto-escala); rate-limit/cache distribuído via Upstash Redis.
- ❌ Stress 100→10k utilizadores NÃO executado — contra a produção viva seria auto-DoS e o rate-limit por IP torna-o inútil a partir de 1 máquina. Precisa de staging + carga distribuída. Feito teste modesto (10 simultâneos, p95 140ms, zero 5xx).
- ⚠️ Gargalo real: Neon plano Free (cold starts + limite de ligações) — teto de escala.

## 4. Sistema de Agendamento
- ✅ Fluxo completo (criar/cancelar/reagendar/confirmar/expirar/bloqueado/ocupado/livre) coberto por código + e2e.
- ✅ Concorrência: transação Serializable + `assertSlotAvailable`; 2 clientes no mesmo horário → só um consegue, zero duplicidade, sem race.

## 5. Multiempresa (isolamento)
- ✅ Clientes, agenda, serviços, staff, upload (token com `businessId`), configs e slug isolados; todas as queries filtram por `businessId`; editor valida posse de ids. Zero IDOR.

## 6. APIs
- ✅ As 13 rotas têm auth (onde exigida), rate-limit, validação Zod, tratamento de erro tipado, logs, status HTTP correto, retorno padronizado, timeouts/`maxDuration`.

## 7. Segurança
- ✅ Headers ao vivo: CSP, HSTS (preload), X-Frame (SAMEORIGIN), nosniff, Referrer-Policy, Permissions-Policy; Brotli ativo.
- ✅ Ataques cobertos: SQLi, XSS (React + JSON-LD escapado), CSRF (validação de origem), SSRF (URLs allowlisted), Open Redirect (retornos fixos), Clickjacking, Path Traversal, Brute Force/Enumeração (rate-limit), IDOR, Mass Assignment, Upload malicioso.
- ✅ 1 vuln Alta encontrada e corrigida (rate-limit spoofável via `cf-connecting-ip` → `x-vercel-forwarded-for`, commit `d008910`).

## 8. Autenticação
- ✅ Login/logout/sessão/refresh/cookies seguros geridos pela Clerk (httpOnly/secure/samesite, expiração, anti-brute-force).
- ⚠️ MFA disponível na Clerk mas não forçado.

## 9. Upload
- ✅ Só imagens/vídeos; validação de MIME+extensão; tamanho máximo (10MB img / 50MB vídeo); nome aleatório; sem execução de scripts.
- ⚠️ Sem antivírus (aceitável nesta escala; ficheiros isolados no Blob).

## 10. Frontend
- ✅ Brotli; imagens AVIF/WebP; responsivo; dark/light; estados de loading/vazio/erro.
- ❌ Lighthouse >90 não medido internamente (correr no Chrome DevTools → Lighthouse). Proxies bons: compressão, formatos, p95 140ms.

## 11. SEO
- ✅ robots.txt, sitemap.xml, Open Graph, Twitter Card, canonical, meta tags — todos presentes e ativos.
- ✅ Google Search Console configurado (verificado, sitemap submetido, indexação pedida) em 2026-07-10.

## 12. Observabilidade
- ✅ Logs estruturados (JSON), Sentry com PII scrub triplo, stack traces, logs de API/BD/cron.
- ⚠️ Alertas = emails do Sentry (sem dashboard de métricas dedicado — suficiente para arranque).

## 13. Notificações
- ✅ Email (Resend) e WhatsApp (Meta): envio, falha registada no `NotificationLog`, dedupe idempotente, template correto, estados de entrega via webhook assinado.
- ⚠️ "Retry" = idempotência + reenvio no cron (não fila com backoff — adequado à escala).

## 14. Cron Jobs
- ✅ Não executa em duplicado (dedupe idempotente por `NotificationLog`); retry de cold-start; timeout; logs; `after()`.
- ⚠️ Sem lock distribuído — mitigado pela idempotência.

## 15. Cache
- ✅ Redis (Upstash) para rate-limit; ISR nas páginas públicas; `unstable_cache` no sitemap; `revalidatePath` invalida ao guardar.

## 16. Backup
- ✅ Backups automáticos da Neon (point-in-time / branching).
- ✅ Mecanismo de restauro provado (a branch `dev` é uma cópia íntegra da produção — mesmo motor copy-on-write).
- ⚠️ **Janela de retenção: 6 horas** (máximo do plano Neon Free). Aceitável para arranque; upgrade recomendado quando houver clientes reais (até 30 dias).

## 17. Deploy
- ✅ Rollback instantâneo (Vercel); zero-downtime; variáveis de ambiente verificadas; build limpa; CI/CD via git push.
- ❌ Sem endpoint `/api/health` dedicado (a plataforma dá health).

## 18. Testes
- ✅ 98 unitários + 24 e2e verdes (login, agendamento, cancelamento, dashboard, paywall).
- ❌ Cobertura >80% não medida (sem ferramenta de coverage configurada; provavelmente <80%).

## 19. Teste de Caos
- ❌ Injeção real de falhas não feita (não se derruba Neon/Redis/Resend/Meta em produção).
- ✅ Resiliência verificada no código: cold-start com warm-up+retry; email/WhatsApp fora → SKIPPED/FAILED sem quebrar a reserva (corre em `after()`); Redis fora → rate-limit fail-closed; erros tipados → mensagem amigável.

## 20. Auditoria de Código
- ✅ Sem código morto relevante, sem `console.log`/`debugger`/`TODO`/`FIXME`, sem imports/vars não usadas, sem deps em falta, sem vulnerabilidades (2 moderate = PostCSS build-time, falso positivo).
- ✅ Promises fire-and-forget são intencionais (`after()`) com try/catch por canal; erros silenciosos evitados.

## 21. Go/No-Go — GO ✅
Sem bugs P0/P1 abertos · nenhum endpoint sem auth onde exigida · segredos configurados (Stripe/Clerk/WhatsApp) · monitorização Sentry ativa · rollback Vercel · documentação (FLUXO-PLATAFORMA.md).

### Ressalvas honestas (não bloqueiam lançar — todas do lado do plano Neon Free)
1. **Retenção de backup de 6h** — subir com upgrade quando houver clientes reais.
2. **Escala/uptime** — Neon Free tem cold starts e não garante 99,9%.
3. **Stress de alta escala e chaos real** — precisam de staging (não feitos em produção de propósito).
4. **Cobertura de testes %** e **restore drill formal** — resolúveis com comando/painel quando quiseres.

---

## Plano futuro (registado)
Quando houver **volume significativo de clientes reais**, migrar a base de dados para infraestrutura própria (servidor dedicado) para eliminar os limites do plano Free (retenção, cold starts, ligações) e reduzir risco. Avaliar na altura: Postgres gerido (ex.: Neon pago, Supabase, RDS) vs servidor auto-gerido — o auto-gerido dá controlo total mas transfere para nós a responsabilidade de backups, segurança e uptime.
