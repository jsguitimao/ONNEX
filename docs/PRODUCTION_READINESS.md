# Production Readiness

## Required Secrets

Set these in Vercel production:

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CRON_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `BLOB_READ_WRITE_TOKEN`

Recommended for full operations:

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`

Set these in GitHub Actions:

- `CI_DATABASE_URL`
- `CI_NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CI_CLERK_SECRET_KEY`
- `CI_CRON_SECRET`
- `CI_UPSTASH_REDIS_REST_URL`
- `CI_UPSTASH_REDIS_REST_TOKEN`
- `REMINDER_CRON_SECRET`

Optional GitHub variable:

- `REMINDER_CRON_URL`, defaults to `https://www.onnex.pt/api/cron/send-reminders`.

## Deploy Checklist

1. Run `npm run env:check` with production-like env.
2. Run `npm ci`.
3. Run `npm run lint`.
4. Run `npm test`.
5. Run `npx prisma validate`.
6. Run `npx prisma migrate deploy`.
7. Run `npm run build`.
8. Run `npm run test:e2e` against staging.
9. Verify `/api/cron/send-reminders` rejects missing/wrong secrets and accepts the configured secret.
10. Verify Sentry receives a test event in the target environment.

## Staging Verification

Run against the staging deployment before promoting to production:

```bash
STAGING_BASE_URL=https://staging.example.com \
STAGING_PUBLIC_SLUG=demo \
STAGING_CRON_SECRET=replace-me \
npm run test:staging
```

Expected result:

- home, robots, sitemap, sign-in and dashboard auth boundary respond without 500s
- homepage includes core security headers
- cron rejects calls without a secret
- cron accepts the configured secret
- configured public business page responds with 200

The same checks can be run from GitHub Actions using `Staging verification`.
Set repository secret `STAGING_CRON_SECRET` before using the workflow.

Before a production rollout, pull and audit Vercel production env values:

```bash
vercel env pull .env.vercel.production.local --environment=production --yes
npm run env:audit-file -- .env.vercel.production.local
```

This catches missing required values, malformed URLs, URL/token swaps and copied newline characters.

## Load Smoke

Run a short safe read-only load smoke against staging:

```bash
LOAD_TEST_BASE_URL=https://staging.example.com \
LOAD_TEST_PUBLIC_SLUG=demo \
LOAD_TEST_DURATION_MS=60000 \
LOAD_TEST_CONCURRENCY=20 \
LOAD_TEST_MAX_ERROR_RATE=0.01 \
LOAD_TEST_MAX_P95_MS=1500 \
npm run test:load
```

The default load smoke only hits read endpoints:

- `/`
- `/robots.txt`
- `/sitemap.xml`
- `/{LOAD_TEST_PUBLIC_SLUG}`
- `/api/public/{LOAD_TEST_PUBLIC_SLUG}`

For a broader test, set `LOAD_TEST_PATHS` to a comma-separated list. Do not include mutating endpoints unless the target database is disposable.

By default the load smoke treats only 200/3xx responses as successful. Override with `LOAD_TEST_EXPECTED_STATUSES` only when intentionally testing protected preview URLs.

## Go / No-Go Criteria

Go only if all are true:

- CI is green on the production branch.
- `npm run test:staging` passes against staging.
- `npm run test:load` passes at the agreed concurrency.
- `npx prisma migrate deploy` has been tested against a staging database snapshot.
- Sentry receives server and client events from staging.
- Reminder cron runs once manually and does not duplicate notifications.
- Rollback target is known and the previous deployment is still available.

No-go if any are true:

- any 5xx appears in staging smoke
- p95 exceeds the configured threshold under light load
- rate limit Redis is unavailable in a production-like environment
- migration requires destructive data changes without a tested restore
- Sentry or logs are unavailable during rollout

## Operational Alerts

Configure alerts in Sentry or the hosting provider for:

- HTTP 5xx spike on public booking endpoints
- `rate_limit.redis_failed`
- `upload.failed`
- `cron.send_reminders.failed`
- `whatsapp_failed`
- `account.delete.*`
- unhandled request errors from `captureRequestError`

Recommended initial thresholds:

- 5 or more server errors in 10 minutes
- any cron failure in 30 minutes
- any rate-limit Redis failure in production
- WhatsApp provider failure rate above 5% over 30 minutes

## Rollback Checklist

1. Roll back the Vercel deployment first.
2. Check whether the deployed migration is backward-compatible.
3. Do not manually revert database migrations unless the rollback plan for that migration is explicit.
4. Disable `.github/workflows/send-reminders.yml` temporarily if notification failures are causing customer impact.
5. Confirm `/sitemap.xml`, `/robots.txt`, `/sign-in`, `/dashboard`, and one public business page respond below 500.

## Current Known Residuals

- `npm audit` still reports a moderate `postcss` advisory through `next`; npm's forced fix suggests a downgrade to Next 9 and must not be applied.
- Full production confidence still requires staging E2E with real Clerk, Redis, Blob, Sentry, and a disposable PostgreSQL database.
- Local `.env*` files may contain real secrets because they are ignored by git. Rotate any value that was copied into chats, screenshots, logs, or shared terminals.
