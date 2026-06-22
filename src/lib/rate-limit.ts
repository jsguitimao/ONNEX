import { Redis } from "@upstash/redis";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

type RateLimitStoreGlobal = typeof globalThis & {
  __onnexRateLimitStore?: RateLimitStore;
  __onnexRateLimitSweepAt?: number;
  __onnexRateLimitRedis?: Redis | null;
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
  if (!globalStore.__onnexRateLimitStore) {
    globalStore.__onnexRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalStore.__onnexRateLimitStore;
}

function getRedis(): Redis | null {
  const globalStore = globalThis as RateLimitStoreGlobal;

  if (globalStore.__onnexRateLimitRedis !== undefined) {
    return globalStore.__onnexRateLimitRedis;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    globalStore.__onnexRateLimitRedis = null;
    // Em produção serverless, sem Redis o rate-limit fica em memória — por
    // instância, sem estado partilhado, logo facilmente contornável. Avisamos
    // uma vez por isolate (o memo acima evita repetir) para não passar
    // despercebido. validate-env.mjs já exige Upstash em produção; isto é a
    // rede de segurança em runtime caso a var falte mesmo assim.
    if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
      console.warn(
        JSON.stringify({
          scope: "onnex",
          event: "rate_limit.in_memory_fallback",
          level: "warn",
          timestamp: new Date().toISOString(),
          message:
            "UPSTASH_REDIS_REST_URL/TOKEN ausentes: rate-limit a correr EM MEMORIA (nao partilhado entre instancias).",
        }),
      );
    }
    return null;
  }

  globalStore.__onnexRateLimitRedis = new Redis({ url, token });
  return globalStore.__onnexRateLimitRedis;
}

function sweepExpiredEntries(now: number) {
  const globalStore = globalThis as RateLimitStoreGlobal;
  const lastSweep = globalStore.__onnexRateLimitSweepAt ?? 0;

  if (now - lastSweep < 30_000) {
    return;
  }

  globalStore.__onnexRateLimitSweepAt = now;
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
  const [count, ttlMs] = await redis.eval<[string], [number, number]>(
    "local c = redis.call('INCR', KEYS[1]); if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; local ttl = redis.call('PTTL', KEYS[1]); return {c, ttl}",
    [key],
    [String(options.windowMs)],
  );
  const resetAt = ttlMs > 0 ? now + ttlMs : now + options.windowMs;

  return buildResult(key, identifier, options, count, resetAt, now);
}

function consumeFailClosed(
  key: string,
  identifier: string,
  options: RateLimitOptions,
  now: number
): RateLimitResult {
  return buildResult(key, identifier, options, options.limit + 1, now + options.windowMs, now);
}

function logRateLimitStoreFailure(error: unknown, namespace: string) {
  const normalizedError =
    error instanceof Error
      ? { name: error.name, message: error.message }
      : { message: typeof error === "string" ? error : "Unknown error" };

  console.error(
    JSON.stringify({
      scope: "onnex",
      event: "rate_limit.redis_failed",
      level: "error",
      timestamp: new Date().toISOString(),
      namespace,
      error: normalizedError,
    }),
  );
}

export async function consumeRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const now = options.now ?? Date.now();
  const identifier = options.identifier?.trim() || "anonymous";
  const key = `${options.namespace}:${identifier}`;

  const redis = getRedis();

  if (redis) {
    try {
      return await consumeInRedis(redis, key, identifier, options, now);
    } catch (error) {
      logRateLimitStoreFailure(error, options.namespace);
      if (process.env.NODE_ENV === "production") {
        return consumeFailClosed(key, identifier, options, now);
      }
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
  globalStore.__onnexRateLimitSweepAt = 0;
  globalStore.__onnexRateLimitRedis = null;
}
