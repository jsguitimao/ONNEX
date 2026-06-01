const baseUrl = normalizeBaseUrl(process.env.STAGING_BASE_URL || process.env.NEXT_PUBLIC_APP_URL);
const cronSecret = process.env.STAGING_CRON_SECRET || process.env.CRON_SECRET;
const publicSlug = process.env.STAGING_PUBLIC_SLUG;

if (!baseUrl) {
  fail("Set STAGING_BASE_URL or NEXT_PUBLIC_APP_URL.");
}

const checks = [
  { name: "home", path: "/", status: [200] },
  { name: "robots", path: "/robots.txt", status: [200] },
  { name: "sitemap", path: "/sitemap.xml", status: [200] },
  { name: "sign-in", path: "/sign-in", status: [200] },
  { name: "dashboard-auth", path: "/dashboard", status: [200, 302, 307, 308] },
];

if (publicSlug) {
  checks.push({
    name: "public-business",
    path: `/${encodeURIComponent(publicSlug)}`,
    status: [200],
  });
}

if (cronSecret) {
  checks.push({
    name: "cron-rejects-missing-secret",
    path: "/api/cron/send-reminders",
    method: "POST",
    status: [401, 403],
  });
  checks.push({
    name: "cron-rejects-wrong-secret",
    path: "/api/cron/send-reminders",
    method: "POST",
    headers: { "x-cron-secret": `${cronSecret}-wrong` },
    status: [401, 403],
  });
  checks.push({
    name: "cron-accepts-secret",
    path: "/api/cron/send-reminders",
    method: "POST",
    headers: { "x-cron-secret": cronSecret },
    status: [200],
    timeoutMs: 45_000,
  });
}

const requiredHeaders = [
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "strict-transport-security",
];

const results = [];
for (const check of checks) {
  results.push(await runCheck(check));
}

const failed = results.filter((result) => !result.ok);
for (const result of results) {
  const marker = result.ok ? "PASS" : "FAIL";
  console.info(`${marker} ${result.name} ${result.status} ${result.durationMs}ms ${result.detail}`);
}

if (failed.length > 0) {
  process.exit(1);
}

console.info("[staging-smoke] All checks passed.");

async function runCheck(check) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), check.timeoutMs ?? 15_000);

  try {
    const response = await fetch(new URL(check.path, baseUrl), {
      method: check.method ?? "GET",
      headers: check.headers,
      redirect: "manual",
      signal: controller.signal,
    });
    const durationMs = Date.now() - startedAt;
    const expectedStatus = check.status.includes(response.status);
    const headerProblems =
      check.path === "/"
        ? requiredHeaders.filter((header) => !response.headers.get(header))
        : [];

    return {
      name: check.name,
      status: response.status,
      durationMs,
      ok: expectedStatus && headerProblems.length === 0,
      detail: headerProblems.length > 0 ? `missing headers: ${headerProblems.join(", ")}` : "",
    };
  } catch (error) {
    return {
      name: check.name,
      status: "ERR",
      durationMs: Date.now() - startedAt,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
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
  console.error(`[staging-smoke] ${message}`);
  process.exit(1);
}
