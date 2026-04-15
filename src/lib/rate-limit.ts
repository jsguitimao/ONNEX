import { Redis } from "@upstash/redis";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

type RateLimitStoreGlobal = typeof globalThis & {
  __bukRateLimitStore?: RateLimitStore;
  __bukRateLimitSweepAt?: number;
  __bukRateLimitRedis?: Redis | null;
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

function getRedis(): Redis | null {
  const globalStore = globalThis as RateLimitStoreGlobal;

  if (globalStore.__bukRateLimitRedis !== undefined) {
    return globalStore.__bukRateLimitRedis;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    globalStore.__bukRateLimitRedis = null;
    return null;
  }

  globalStore.__bukRateLimitRedis = new Redis({ url, token });
  return globalStore.__bukRateLimitRedis;
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

function buildResult(
  key: string,
  identifier: string,
  options: RateLimitOptions,
  count: number,
  resetAt: number,
  now: number
): RateLimitResult {
  const retryAfter = Math.max(Math.ceil((resetAt - now) / 1000), 1);
  return {
    ok: count <= options.limit,
    key,
    limit: options.limit,
    remaining: Math.max(options.limit - count, 0),
    retryAfter,
    resetAt,
    count,
    identifier,
  };
}

function consumeInMemory(
  key: string,
  identifier: string,
  options: RateLimitOptions,
  now: number
): RateLimitResult {
  const store = getStore();
  sweepExpiredEntries(now);

  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const nextEntry = { count: 1, resetAt: now + options.windowMs };
    store.set(key, nextEntry);
    return buildResult(key, identifier, options, 1, nextEntry.resetAt, now);
  }

  current.count += 1;
  store.set(key, current);
  return buildResult(key, identifier, options, current.count, current.resetAt, now);
}

async function consumeInRedis(
  redis: Redis,
  key: string,
  identifier: string,
  options: RateLimitOptions,
  now: number
): Promise<RateLimitResult> {
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.pexpire(key, options.windowMs);
  }

  const ttlMs = await redis.pttl(key);
  const resetAt = ttlMs > 0 ? now + ttlMs : now + options.windowMs;

  return buildResult(key, identifier, options, count, resetAt, now);
}

export async function consumeRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const now = options.now ?? Date.now();
  const identifier = options.identifier?.trim() || "anonymous";
  const key = `${options.namespace}:${identifier}`;

  const redis = getRedis();

  if (redis) {
    try {
      return await consumeInRedis(redis, key, identifier, options, now);
    } catch {
      return consumeInMemory(key, identifier, options, now);
    }
  }

  return consumeInMemory(key, identifier, options, now);
}

export function checkRequestRateLimit(
  request: Request,
  options: Omit<RateLimitOptions, "identifier">
) {
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
  globalStore.__bukRateLimitRedis = null;
}
