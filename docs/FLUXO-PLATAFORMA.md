# Fluxo completo da plataforma ONNEX

Mapa da jornada de ponta a ponta — do visitante anónimo até à reserva de um
cliente final — com o estado de **front-end**, **back-end** e **segurança** de
cada etapa, e o teste que o prova.

> Como ler: cada etapa tem uma tabela `Front / Back / Segurança`. A coluna
> **Prova** aponta o teste automatizado (e2e Playwright em `e2e/`, ou unitário em
> `test/`). Nada aqui é afirmado sem um teste ou uma verificação a suportá-lo.

## Como correr os testes

```bash
# Unitários (97: 16 runner custom + 81 vitest) — lógica pura, sem servidor
npm test

# End-to-end (24, Playwright) — jornada real no browser + APIs
# IMPORTANTE: correr contra uma BUILD DE PRODUÇÃO, não o dev server.
# O dev server (HMR + recompilação por rota) torna os testes de render e de
# interação instáveis nesta máquina; a build de produção hidrata de forma limpa.
npm run build
npx next start -p 4466        # noutro terminal
set PLAYWRIGHT_BASE_URL=http://127.0.0.1:4466   # (Windows) ou export no bash
npm run test:e2e
```

Estado atual (2026-07-08): **97 unitários + 24 e2e = 121 testes, todos verdes.**

---

## Etapa 1 — Visitante anónimo chega à plataforma

O que vê primeiro: a landing comercial e as páginas legais. Nenhuma conta ainda.

| Camada | Estado | Prova |
|---|---|---|
| Front | Landing carrega com proposta, 3 planos (25,99 / 66,99 / 249,99 €) e email de suporte clicável (×3) | `journey-01` landing + suporte |
| Front | Liga a Política de Privacidade e Termos; ambas 200 | `journey-01` legais |
| Back | `sitemap.xml` e `robots.txt` respondem 200 (SEO) | `journey-01` sitemap/robots |
| Segurança | Todas as respostas transportam `X-Content-Type-Options: nosniff` + CSP (+ HSTS em HTTPS) | `journey-01` headers |

**Veredicto:** ✅ Front ok, SEO ok, headers de segurança ok.

---

## Etapa 2 — Criação de conta e paywall

O visitante cria conta (Clerk), o sistema provisiona-lhe um negócio, e o paywall
decide se tem acesso. Regra de ouro provada aqui: **um cliente Stripe criado ao
abrir o checkout NÃO dá acesso** — só uma subscrição real (com fim de período
escrito pelo webhook) abre o CRM. (Ver `src/lib/subscription-access.ts`.)

| Camada | Estado | Prova |
|---|---|---|
| Front | `/sign-up` e `/sign-in` servem sem erro de servidor | `journey-02` autenticação |
| Back | `/crm`, `/billing`, `/onboarding` redirecionam para `/sign-in` sem sessão | `journey-02` rotas privadas |
| Back | `/dashboard` (legado) redireciona para `/crm` | `journey-02` dashboard→crm |
| Segurança | `/api/dashboard`, `/api/account/export`, `/api/account/delete` devolvem 401 sem sessão | `journey-02` APIs privadas |
| Segurança | `/api/cron/send-reminders` exige o segredo (401 sem ele) | `journey-02` cron |
| Segurança | Negócio TRIALING sem subscrição real: página pública **sem** "Agendar" e API de reservas rejeita (403) | `journey-02` paywall |
| Back | Paywall (regra pura) testada em 8 estados, incl. checkout abandonado | `test/` (unit `hasActiveAccess`) |

**Veredicto:** ✅ Autenticação ok, rotas privadas fechadas, APIs exigem sessão,
paywall fecha o buraco de acesso grátis.

---

## Etapa 3 — Página pública do barbeiro e reserva do cliente

O barbeiro com subscrição ativa tem uma página pública; o cliente final entra,
escolhe um serviço e reserva.

| Camada | Estado | Prova |
|---|---|---|
| Front | Página do negócio renderiza serviços | `journey-03` render |
| Front (SEO) | Dados estruturados JSON-LD presentes e com parse válido (escape anti-XSS não parte o JSON) | `journey-03` JSON-LD |
| Front | Clicar num serviço abre o painel de reserva (Drawer), hidratação limpa (0 erros de consola) | `journey-03` fluxo reserva |
| Segurança | POST de uma **origem estrangeira** é rejeitado (403) antes de qualquer trabalho — anti-CSRF | `journey-03` CSRF |
| Segurança | POST com dados inválidos → 400 (validação Zod) | `journey-03` dados inválidos |
| Back | `availability` responde de forma controlada; token de gestão inválido → 404 | `journey-03` availability/token |
| Back | Reserva: transação Serializable + idempotency-key + retry de conflito | `test/booking-transaction`, `test/public-booking-idempotency` |

**Veredicto:** ✅ Render ok, SEO ok, defesas da API ok.

> ℹ️ **Soft-404 (investigado — comportamento correto, NÃO é bug):** um slug
> inexistente mostra a página "não encontrada" com código HTTP **200** em vez de
> **404**. Causa: a rota `[slug]` tem um `loading.tsx`, por isso a resposta é
> transmitida em *streaming*; quando o streaming começa, os headers (incl. o
> status 200) já foram enviados e o `notFound()` não os pode alterar — este é o
> comportamento documentado do Next 16. **Não há dano de SEO:** o Next injeta
> automaticamente `<meta name="robots" content="noindex">` na resposta, o que
> impede o Google de indexar essas páginas (verificado em produção em 3 slugs:
> HTTP 200 + noindex + conteúdo correto). O teste `journey-03` prova os três.
> Só valeria forçar um 404 real (removendo o `loading.tsx`, à custa do esqueleto
> de carregamento) se surgir uma necessidade concreta de compliance/analytics
> por código HTTP — não é o caso hoje.

---

## Cobertura por camada (resumo)

- **Front-end:** landing, legais, autenticação, página pública, render de
  serviços, abertura do painel de reserva, JSON-LD. ✅
- **Back-end:** redirecionamentos de auth, APIs 401, cron protegido,
  availability, transação de reserva, idempotência. ✅
- **Segurança:** headers (CSP/nosniff/HSTS), rotas privadas fechadas, paywall,
  anti-CSRF por origem, validação Zod, escape anti-XSS no JSON-LD. ✅

## Pendente conhecido

1. Fluxo autenticado end-to-end (dentro do CRM logado) não é coberto por e2e —
   exigiria sessão Clerk programática. Coberto indiretamente pelos unitários das
   server actions e pela verificação manual do dono.

(O "soft-404" da Etapa 3 foi investigado e **não é pendente**: é comportamento
correto do Next, sem dano de SEO graças ao noindex automático — ver a nota na
Etapa 3.)
