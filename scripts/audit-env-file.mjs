import { existsSync, readFileSync } from "node:fs";

const filePath = process.argv[2] || ".env.local";

if (!existsSync(filePath)) {
  fail(`Environment file not found: ${filePath}`);
}

const env = parseEnvFile(filePath);
const isPulledVercelEnv = filePath.includes(".vercel.");

const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CRON_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "BLOB_READ_WRITE_TOKEN",
];

const sensitiveKeys = new Set([
  "CLERK_SECRET_KEY",
  "CRON_SECRET",
  "UPSTASH_REDIS_REST_TOKEN",
  "BLOB_READ_WRITE_TOKEN",
]);

const missing = required.filter((key) => {
  if (!(key in env)) return true;
  if (hasValue(env[key])) return false;
  return !(isPulledVercelEnv && sensitiveKeys.has(key));
});
if (missing.length > 0) {
  fail(`Missing required keys: ${missing.join(", ")}`);
}

for (const key of required) {
  if (!hasValue(env[key]) && sensitiveKeys.has(key)) {
    continue;
  }
  if (/[\r\n\u0000-\u001f]/.test(env[key])) {
    fail(`${key} contains control characters.`);
  }
}

requireUrl(env.DATABASE_URL, "DATABASE_URL", ["postgresql:", "postgres:"]);
requireUrl(env.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL", ["https:", "http:"]);
requireUrl(env.UPSTASH_REDIS_REST_URL, "UPSTASH_REDIS_REST_URL", ["https:"]);

if (!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_")) {
  fail("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must look like a Clerk publishable key.");
}

if (hasValue(env.CLERK_SECRET_KEY) && !env.CLERK_SECRET_KEY.startsWith("sk_")) {
  fail("CLERK_SECRET_KEY must look like a Clerk secret key.");
}

if (hasValue(env.UPSTASH_REDIS_REST_TOKEN) && env.UPSTASH_REDIS_REST_TOKEN.startsWith("http")) {
  fail("UPSTASH_REDIS_REST_TOKEN looks like a URL. Check URL/token mapping.");
}

console.info(`[audit-env-file] ${filePath} passed.`);

function parseEnvFile(path) {
  const result = {};
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    result[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
  }
  return result;
}

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function requireUrl(value, key, protocols) {
  try {
    const parsed = new URL(value);
    if (!protocols.includes(parsed.protocol)) {
      throw new Error("bad protocol");
    }
  } catch {
    fail(`${key} must be a valid ${protocols.join("/")} URL.`);
  }
}

function fail(message) {
  console.error(`[audit-env-file] ${message}`);
  process.exit(1);
}
