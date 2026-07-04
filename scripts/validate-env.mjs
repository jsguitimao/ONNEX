import { existsSync, readFileSync } from "node:fs";

function loadDotEnvFile(path) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

loadDotEnvFile(".env");
loadDotEnvFile(".env.local");

const REQUIRED_LOCAL = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
];

const REQUIRED_PRODUCTION = [
  "NEXT_PUBLIC_APP_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "BLOB_READ_WRITE_TOKEN",
];

const OPTIONAL_PROVIDER_GROUPS = [
  {
    name: "WhatsApp Cloud API",
    keys: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_WEBHOOK_VERIFY_TOKEN"],
  },
  {
    name: "Stripe",
    keys: ["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "STRIPE_PRICE_ID_TRIMESTRAL", "STRIPE_WEBHOOK_SECRET"],
  },
  {
    name: "Sentry",
    keys: ["SENTRY_DSN"],
  },
  {
    name: "Cron de lembretes",
    keys: ["CRON_SECRET"],
  },
];

function hasValue(key) {
  return typeof process.env[key] === "string" && process.env[key].trim().length > 0;
}

function isProductionLike() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.CI_ENV_CHECK_STRICT === "1"
  );
}

const required = isProductionLike()
  ? [...REQUIRED_LOCAL, ...REQUIRED_PRODUCTION]
  : REQUIRED_LOCAL;

const missing = required.filter((key) => !hasValue(key));
const malformed = required.filter((key) => hasValue(key) && /[\r\n\u0000-\u001f]/.test(process.env[key]));

if (missing.length > 0) {
  console.error("[env:check] Missing required environment variables:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

if (malformed.length > 0) {
  console.error("[env:check] Environment variables contain control characters:");
  for (const key of malformed) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

if (hasValue("NEXT_PUBLIC_APP_URL")) {
  try {
    const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
    if (!["http:", "https:"].includes(appUrl.protocol)) {
      throw new Error("invalid protocol");
    }
  } catch {
    console.error("[env:check] NEXT_PUBLIC_APP_URL must be a valid http(s) URL.");
    process.exit(1);
  }
}

for (const group of OPTIONAL_PROVIDER_GROUPS) {
  const present = group.keys.filter(hasValue);
  if (present.length > 0 && present.length < group.keys.length) {
    console.warn(
      `[env:check] ${group.name} is partially configured. Present: ${present.join(", ")}. Expected all of: ${group.keys.join(", ")}.`,
    );
  }
}

// Pooling de BD: em serverless, DATABASE_URL sem pooler esgota o max_connections
// sob carga. Avisamos (não falhamos) se a connection string de produção não
// aparentar usar pooling. Heurística: host com "-pooler", pgbouncer=true, ou
// endpoint do Prisma Accelerate.
if (isProductionLike() && hasValue("DATABASE_URL")) {
  const dbUrl = process.env.DATABASE_URL;
  const looksPooled =
    /-pooler\./i.test(dbUrl) ||
    /[?&]pgbouncer=true/i.test(dbUrl) ||
    /prisma:\/\/|accelerate\.prisma-data\.net/i.test(dbUrl);
  if (!looksPooled) {
    console.warn(
      "[env:check] DATABASE_URL não aparenta usar connection pooling. Em produção serverless, usa o endpoint pooled (Neon '-pooler' / PgBouncer / Prisma Accelerate) para não esgotar ligações sob carga.",
    );
  }
  if (!hasValue("DIRECT_URL")) {
    console.warn(
      "[env:check] DIRECT_URL não definida. É necessária para as migrações do Prisma quando DATABASE_URL usa pooler (ver .env.example).",
    );
  }
}

console.info("[env:check] Environment contract satisfied.");
