type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

type RateLimitStoreGlobal = typeof globalThis & {
  __bukRateLimitStore?: RateLimitStore;
  __bukRateLimitSweepAt?: number;
};

export type RateLimitOptions = {
  namespace: string;
  limit: number;
  windowMs: number;
  identifier?: string;
  now?: number;
};

export type RateLimitResult = {
  ok: boolean;
  key: string;
  limit: number;
  remaining: number;
  retryAfter: number;
  resetAt: number;
  count: number;
  identifier: string;
};

function getStore() {
  const globalStore = globalThis as RateLimitStoreGlobal;
  if (!globalStore.__bukRateLimitStore) {
    globalStore.__bukRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalStore.__bukRateLimitStore;
}

function sweepExpiredEntries(now: number) {
  const globalStore = globalThis as RateLimitStoreGlobal;
  const lastSweep = globalStore.__bukRateLimitSweepAt ?? 0;

  if (now - lastSweep < 30_000) {
    return;
  }

  globalStore.__bukRateLimitSweepAt = now;
  const store = getStore();

  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function getClientIp(request: Request) {
  const forwardedFor =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "anonymous";

  return forwardedFor.split(",")[0]?.trim() || "anonymous";
}

export function consumeRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now();
  const identifier = options.identifier?.trim() || "anonymous";
  const key = `${options.namespace}:${identifier}`;
  const store = getStore();

  sweepExpiredEntries(now);

  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const nextEntry = {
      count: 1,
      resetAt: now + options.windowMs,
    };

    store.set(key, nextEntry);

    return {
      ok: true,
      key,
      limit: options.limit,
      remaining: Math.max(options.limit - 1, 0),
      retryAfter: Math.max(Math.ceil(options.windowMs / 1000), 1),
      resetAt: nextEntry.resetAt,
      count: nextEntry.count,
      identifier,
    };
  }

  current.count += 1;
  store.set(key, current);

  const retryAfter = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);

  return {
    ok: current.count <= options.limit,
    key,
    limit: options.limit,
    remaining: Math.max(options.limit - current.count, 0),
    retryAfter,
    resetAt: current.resetAt,
    count: current.count,
    identifier,
  };
}

export function checkRequestRateLimit(request: Request, options: Omit<RateLimitOptions, "identifier">) {
  return consumeRateLimit({
    ...options,
    identifier: getClientIp(request),
  });
}

export function buildRateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
    "Retry-After": String(result.retryAfter),
  };
}

export function resetRateLimitStoreForTests() {
  const globalStore = globalThis as RateLimitStoreGlobal;
  getStore().clear();
  globalStore.__bukRateLimitSweepAt = 0;
}
