const baseUrl = normalizeBaseUrl(process.env.LOAD_TEST_BASE_URL || process.env.STAGING_BASE_URL);
const durationMs = readPositiveInt("LOAD_TEST_DURATION_MS", 60_000);
const concurrency = readPositiveInt("LOAD_TEST_CONCURRENCY", 20);
const maxErrorRate = readNumber("LOAD_TEST_MAX_ERROR_RATE", 0.01);
const maxP95Ms = readPositiveInt("LOAD_TEST_MAX_P95_MS", 1500);
const publicSlug = process.env.LOAD_TEST_PUBLIC_SLUG || process.env.STAGING_PUBLIC_SLUG;
const expectedStatuses = readStatusSet("LOAD_TEST_EXPECTED_STATUSES", [200, 301, 302, 307, 308]);

if (!baseUrl) {
  fail("Set LOAD_TEST_BASE_URL or STAGING_BASE_URL.");
}

const paths = getPaths();
const deadline = Date.now() + durationMs;
const samples = [];
let total = 0;
let failed = 0;
let nextPath = 0;

console.info(
  `[load-smoke] base=${baseUrl} durationMs=${durationMs} concurrency=${concurrency} paths=${paths.join(",")}`,
);

await Promise.all(Array.from({ length: concurrency }, () => worker()));

samples.sort((a, b) => a - b);
const p50 = percentile(samples, 0.5);
const p95 = percentile(samples, 0.95);
const p99 = percentile(samples, 0.99);
const errorRate = total === 0 ? 1 : failed / total;

console.info(
  `[load-smoke] total=${total} failed=${failed} errorRate=${errorRate.toFixed(4)} p50=${p50}ms p95=${p95}ms p99=${p99}ms`,
);

if (errorRate > maxErrorRate) {
  fail(`error rate ${errorRate.toFixed(4)} exceeded ${maxErrorRate}`);
}

if (p95 > maxP95Ms) {
  fail(`p95 ${p95}ms exceeded ${maxP95Ms}ms`);
}

console.info("[load-smoke] Load smoke passed.");

async function worker() {
  while (Date.now() < deadline) {
    const path = paths[nextPath % paths.length];
    nextPath += 1;
    await hit(path);
  }
}

async function hit(path) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(new URL(path, baseUrl), {
      redirect: "manual",
      signal: controller.signal,
    });
    const duration = Date.now() - startedAt;
    total += 1;
    samples.push(duration);
    if (!expectedStatuses.has(response.status)) {
      failed += 1;
    }
  } catch {
    total += 1;
    failed += 1;
    samples.push(Date.now() - startedAt);
  } finally {
    clearTimeout(timeout);
  }
}

function getPaths() {
  const explicit = process.env.LOAD_TEST_PATHS;
  if (explicit) {
    return explicit
      .split(",")
      .map((path) => path.trim())
      .filter(Boolean);
  }

  const defaults = ["/", "/robots.txt", "/sitemap.xml"];
  if (publicSlug) {
    defaults.push(`/${encodeURIComponent(publicSlug)}`);
    defaults.push(`/api/public/${encodeURIComponent(publicSlug)}`);
  }

  return defaults;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const index = Math.min(values.length - 1, Math.ceil(values.length * p) - 1);
  return values[index];
}

function readPositiveInt(key, fallback) {
  const value = Number(process.env[key]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readNumber(key, fallback) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
}

function readStatusSet(key, fallback) {
  const raw = process.env[key];
  if (!raw) return new Set(fallback);
  const statuses = raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 100 && value <= 599);
  return new Set(statuses.length > 0 ? statuses : fallback);
}

function normalizeBaseUrl(value) {
  if (!value) return "";
  try {
    return new URL(value).toString();
  } catch {
    return "";
  }
}

function fail(message) {
  console.error(`[load-smoke] ${message}`);
  process.exit(1);
}
