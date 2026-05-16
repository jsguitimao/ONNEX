# ONNEX.PT

ONNEX.PT e uma plataforma de agendamentos para barbearias, com area privada para operacao e pagina publica estilo link-in-bio para converter visitas em reservas.

## O que ja existe

- autenticacao com Clerk para dashboard e onboarding
- persistencia com Prisma + PostgreSQL/Neon
- pagina publica por slug em `/{slug}`
- fluxo de reserva publica ponta a ponta
- gestao publica por token com confirmacao, cancelamento e remarcacao
- agenda operacional com reservas manuais, bloqueios e mudanca de estado
- CRM basico de clientes
- notificacoes por email e SMS
- sitemap e robots para SEO tecnico
- rate limiting basico nas rotas publicas

## Stack

- Next.js 16 com App Router
- TypeScript
- Tailwind CSS + shadcn/ui
- Clerk
- Prisma
- PostgreSQL / Neon
- deploy inicial na Vercel

## Como correr localmente

1. Instala as dependencias:

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
- `npm run build` gera o build de producao
- `npm run lint` executa o ESLint
- `npm run test` executa a suite base com `node:test`
- `npm run db:generate` gera o cliente Prisma
- `npm run db:push` sincroniza o schema com a base de dados

## Variaveis de ambiente

O ficheiro [.env.example](./.env.example) contem todos os valores esperados pelo projeto.

### Obrigatorias

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL`

### Email

- `RESEND_API_KEY`
- `EMAIL_FROM`

### SMS

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### Cron

- `CRON_SECRET`

### Billing

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

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

## Notificacoes

As notificacoes sao disparadas a partir de `src/lib/notifications.ts`.

- email usa Resend
- SMS usa Twilio
- emails incluem versao HTML e `text/plain`
- lembretes sao enviados pelo endpoint `GET/POST /api/cron/send-reminders`
- o cron exige `CRON_SECRET` por header, bearer token ou query string
- emails e SMS fazem retry simples em respostas `429` e `5xx` do provider

Sem credenciais de email ou SMS, o sistema nao quebra. Em vez disso, regista `SKIPPED` em `NotificationLog`.

### Scheduler de producao

Como o plano Hobby da Vercel nao cobre o agendamento que precisamos aqui, o projeto usa um scheduler externo via GitHub Actions em [.github/workflows/send-reminders.yml](./.github/workflows/send-reminders.yml).

Para ativar os lembretes automaticos em producao:

1. Define `CRON_SECRET` na Vercel.
2. Cria o secret `REMINDER_CRON_SECRET` no repositorio GitHub com exatamente o mesmo valor.
3. Opcionalmente, cria a variable `REMINDER_CRON_URL` no GitHub se quiseres usar um dominio/URL diferente de `https://www.onnex.pt/api/cron/send-reminders`.

O workflow chama o endpoint de 10 em 10 minutos com a janela `start=25` e `end=35`, o que fecha o lembrete "30 minutos antes" de forma robusta.

## Seguranca publica

As rotas publicas mais sensiveis tem rate limiting basico em memoria:

- `GET /api/public/[slug]`
- `GET /api/public/[slug]/availability`
- `POST /api/public/[slug]/bookings`
- `GET/PATCH /api/public/booking/[token]`
- `GET /api/public/booking/[token]/availability`

Este limite ajuda ja hoje, mas nao substitui uma camada distribuida. Para producao com mais carga, o proximo passo natural e mover isto para Redis/Upstash.

## SEO tecnico

- `src/app/robots.ts`
- `src/app/sitemap.ts`

O sitemap lista a landing e as paginas publicas ativas por slug.

## Observabilidade

O projeto agora suporta Sentry de forma real:

- inicializacao de servidor em `src/sentry.server.config.ts`
- inicializacao edge em `src/sentry.edge.config.ts`
- inicializacao cliente em `src/instrumentation-client.ts`
- hook de request errors em `src/instrumentation.ts`
- captura de erros globais em `src/app/global-error.tsx`
- wrapper de logs aplicacionais em `src/lib/observability.ts`

Sem DSN configurado, a app continua funcional e mantem apenas logs locais.

## Deploy

O projeto esta preparado para Vercel, mas o diretorio `.vercel/` continua ignorado de proposito. Isso e normal: a ligacao local a um projeto Vercel nao deve ser versionada.

Se precisares ligar o repositorio local a outro projeto Vercel, usa:

```bash
vercel link
```

## Testes

Esta base ja inclui testes unitarios simples com o runner nativo do Node. O objetivo desta primeira camada e validar regras puras sem adicionar friccao de tooling.

Proximos passos recomendados para testes:

- expandir unit tests para politicas de booking
- adicionar smoke tests para APIs publicas
- introduzir e2e reais para onboarding, reserva e dashboard

## Estrutura principal

- `src/app` rotas App Router
- `src/components` interface do produto
- `src/lib/business.ts` dominio principal
- `src/lib/notifications.ts` entregas email/SMS
- `src/lib/rate-limit.ts` protecao basica das rotas publicas
- `src/lib/cron-auth.ts` validacao do cron
- `prisma/schema.prisma` modelo de dados

## Proximas melhorias de arquitetura

- partir `business.ts` em modulos menores
- instrumentar spans de dominio e queries mais criticas
- implementar pagamentos e planos
- mover rate limiting para armazenamento distribuido
