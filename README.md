# ONNEX.PT

ONNEX.PT é uma plataforma de agendamentos para barbearias, com área privada para operação e página pública estilo link-in-bio para converter visitas em reservas.

## O que já existe

- autenticação com Clerk para dashboard e onboarding
- persistência com Prisma + PostgreSQL/Neon
- página pública por slug em `/{slug}`
- fluxo de reserva pública ponta a ponta
- gestão pública por token com confirmação, cancelamento e remarcação
- agenda operacional com reservas manuais, bloqueios e mudança de estado
- CRM básico de clientes
- notificações por WhatsApp
- sitemap e robots para SEO técnico
- rate limiting básico nas rotas públicas

## Stack

- Next.js 16 com App Router
- TypeScript
- Tailwind CSS + shadcn/ui
- Clerk
- Prisma
- PostgreSQL / Neon
- deploy inicial na Vercel

## Como correr localmente

1. Instala as dependências:

```bash
npm install
```

2. Copia o ficheiro de exemplo:

```bash
cp .env.example .env.local
```

3. Preenche pelo menos:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL`

4. Gera o cliente Prisma e aplica o schema:

```bash
npm run db:generate
npm run db:push
```

5. Arranca o projeto:

```bash
npm run dev
```

## Scripts

- `npm run dev` inicia o ambiente local
- `npm run build` gera o build de produção
- `npm run lint` executa o ESLint
- `npm run test` executa a suite base com `node:test`
- `npm run test:e2e` executa os smoke tests Playwright
- `npm run test:staging` executa smoke tests contra staging/produção-like
- `npm run test:load` executa um load smoke HTTP read-only configurável
- `npm run env:check` valida o contrato mínimo de variáveis de ambiente
- `npm run db:generate` gera o cliente Prisma
- `npm run db:push` sincroniza o schema com a base de dados
- `npm run db:migrate:deploy` aplica migrations em produção/staging

## Variáveis de ambiente

O ficheiro [.env.example](./.env.example) contém todos os valores esperados pelo projeto.

### Obrigatórias

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL`

### WhatsApp

- `WHATSAPP_ACCESS_TOKEN` (token da WhatsApp Cloud API / Meta)
- `WHATSAPP_API_VERSION` (opcional, default `v21.0`)

O `phone_number_id` de cada barbearia fica na BD (`Business.whatsappPhoneNumberId`), não em env.

### Observabilidade opcional

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_ENVIRONMENT`
- `SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE`

## Notificações

As notificações são disparadas a partir de `src/lib/notifications.ts`.

- WhatsApp usa a WhatsApp Cloud API oficial da Meta (mensagens de template aprovadas)
- só a confirmação de reserva é enviada ao cliente (email + WhatsApp); não há lembretes automáticos por aqui
- o canal WhatsApp exige `WHATSAPP_ACCESS_TOKEN` + o `whatsappPhoneNumberId` da barbearia

Sem credenciais de WhatsApp, o sistema não quebra. Em vez disso, regista `SKIPPED` em `NotificationLog`.

## Segurança pública

As rotas públicas mais sensíveis têm rate limiting básico em memória:

- `GET /api/public/[slug]`
- `GET /api/public/[slug]/availability`
- `POST /api/public/[slug]/bookings`
- `GET/PATCH /api/public/booking/[token]`
- `GET /api/public/booking/[token]/availability`

Em produção, o rate limit deve usar Redis/Upstash. O contrato de env falha em modo estrito se estas variáveis estiverem ausentes.

## SEO técnico

- `src/app/robots.ts`
- `src/app/sitemap.ts`

O sitemap lista a landing e as páginas públicas ativas por slug.

## Observabilidade

O projeto agora suporta Sentry de forma real:

- inicialização de servidor em `src/sentry.server.config.ts`
- inicialização edge em `src/sentry.edge.config.ts`
- inicialização cliente em `src/instrumentation-client.ts`
- hook de request errors em `src/instrumentation.ts`
- captura de erros globais em `src/app/global-error.tsx`
- wrapper de logs aplicacionais em `src/lib/observability.ts`

Sem DSN configurado, a app continua funcional e mantém apenas logs locais.

## Deploy

O projeto está preparado para Vercel, mas o diretório `.vercel/` continua ignorado de propósito. Isso é normal: a ligação local a um projeto Vercel não deve ser versionada.

Checklist operacional completo: [docs/PRODUCTION_READINESS.md](./docs/PRODUCTION_READINESS.md).

Exemplo de validação de staging:

```bash
STAGING_BASE_URL=https://staging.example.com STAGING_PUBLIC_SLUG=demo npm run test:staging
LOAD_TEST_BASE_URL=https://staging.example.com LOAD_TEST_PUBLIC_SLUG=demo npm run test:load
```

Se precisares ligar o repositório local a outro projeto Vercel, usa:

```bash
vercel link
```

## Testes

Esta base inclui testes custom, Vitest e smoke tests Playwright para rotas públicas, auth, upload, dashboard, multi-tenant e regras de booking.

## Estrutura principal

- `src/app` rotas App Router
- `src/components` interface do produto
- `src/lib/business-modules/*` domínio principal
- `src/lib/notifications.ts` entregas WhatsApp/lembretes
- `src/lib/rate-limit.ts` proteção das rotas públicas e mutações sensíveis
- `prisma/schema.prisma` modelo de dados

## Próximas melhorias de arquitetura

- instrumentar spans de domínio e queries mais críticas
- implementar pagamentos e planos
