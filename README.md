# Bukly — plataforma de agendamentos para barbearias

Software de agendamento online para barbearias portuguesas. Cada negócio tem
página pública por slug (`/nome-da-barbearia`), dashboard privado, gestão de
equipa e serviços, e confirmações automáticas por email.

## Stack

- **Next.js 16** (App Router, Turbopack) · React 19 · TypeScript
- **Tailwind CSS 4** · `@base-ui/react` · `lucide-react`
- **Prisma 6** + PostgreSQL (recomendado: [Neon](https://neon.tech))
- **Clerk** para autenticação
- **Resend** para email transacional
- **Vercel Cron** para lembretes automáticos
- **Zod** para validação

## Setup local

```bash
# 1. Instalar dependências
npm install

# 2. Copiar e preencher variáveis de ambiente
cp .env.example .env
# edita .env com DATABASE_URL, chaves Clerk, Resend, etc.

# 3. Criar schema na base de dados
npx prisma db push

# 4. Correr em dev
npm run dev
```

Aplicação disponível em [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm start` | Correr build de produção |
| `npm run lint` | Linter (ESLint) |
| `npm run db:generate` | Gerar Prisma Client |
| `npm run db:push` | Sincronizar schema com a BD |

## Arquitetura

```
src/
  app/
    page.tsx                      Landing pública
    sign-in/, sign-up/            Páginas Clerk
    onboarding/                   Setup inicial do negócio
    dashboard/                    Painel operacional (protegido)
    [slug]/                       Página pública do negócio
    booking/[token]/              Gestão de reserva pelo cliente
    api/
      dashboard/                  CRUD protegido (services, team, bookings, …)
      public/                     Slots + criação de reserva (público)
      onboarding/                 Setup do negócio
      cron/send-reminders/        Lembretes 30min antes
  components/                     Componentes UI + fluxos
  lib/
    db.ts                         Prisma client singleton
    business.ts                   Lógica de domínio (slots, bookings, dashboard)
    notifications.ts              Envio de emails via Resend
    demo-data.ts                  Fallback sem BD configurada
  proxy.ts                        Middleware Clerk
prisma/
  schema.prisma                   Modelo de dados
```

## Fluxos principais

1. **Onboarding** — utilizador autentica-se → `/onboarding` cria Business, Location, Services, StaffMembers e WeeklyAvailability.
2. **Página pública** — `/{slug}` mostra serviços e equipa; cliente escolhe serviço, profissional e horário.
3. **Gestão da reserva** — link com token (`/booking/{token}`) para confirmar, cancelar ou reagendar.
4. **Dashboard** — agenda semanal, bookings, clientes, serviços, equipa, bloqueios.
5. **Lembretes** — Vercel Cron chama `/api/cron/send-reminders` a cada 10min.

## Deploy (Vercel)

1. Criar projeto Vercel ligado ao repo.
2. Definir variáveis de ambiente (ver `.env.example`).
3. Adicionar cron em `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/send-reminders", "schedule": "*/10 * * * *" }
  ]
}
```

4. Em Clerk (produção), autorizar o domínio Vercel.
5. Em Resend, verificar o domínio usado em `EMAIL_FROM`.

## Segurança

- Rotas protegidas via `src/proxy.ts` (Clerk).
- `/api/cron/*` exige header `Authorization: Bearer $CRON_SECRET`.
- Multi-tenant: todas as queries filtram por `businessId` do owner autenticado.

## Licença

Privado.
