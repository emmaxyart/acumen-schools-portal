// Fixed-window limiter.
//
// By default counts live in process memory, which is fine for a single server. Set
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to back the same interface with
// Redis (works for serverless / several instances). If Redis is configured but
// unreachable, we fall back to memory so a limiter outage never locks everyone out.

type Bucket = { count: number; resetAt: number };
type Result = { ok: boolean; retryAfter: number };

const buckets = new Map<string, Bucket>();

function memoryLimit(key: string, limit: number, windowMs: number): Result {
  const now = Date.now();
  if (buckets.size > 5000) {
    buckets.forEach((b, k) => {
      if (b.resetAt <= now) buckets.delete(k);
    });
  }
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count++;
  return { ok: b.count <= limit, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
}

const redisConfig = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
};

/** Redis fixed window: INCR (atomic), set expiry only on the first hit, read the TTL for Retry-After. */
async function redisLimit(cfg: { url: string; token: string }, key: string, limit: number, windowMs: number): Promise<Result> {
  const rk = `cp:rl:${key}`;
  const res = await fetch(`${cfg.url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", rk],
      ["EXPIRE", rk, Math.ceil(windowMs / 1000), "NX"],
      ["PTTL", rk],
    ]),
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`Redis pipeline failed: ${res.status}`);
  const body = (await res.json()) as { result?: number | string }[];
  const count = Number(body?.[0]?.result ?? 0);
  const ttlMs = Number(body?.[2]?.result ?? windowMs);
  return {
    ok: count <= limit,
    retryAfter: Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000)),
  };
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<Result> {
  const cfg = redisConfig();
  if (cfg) {
    try {
      return await redisLimit(cfg, key, limit, windowMs);
    } catch (e) {
      console.error("[rate-limit] Redis unavailable, using memory", e);
    }
  }
  return memoryLimit(key, limit, windowMs);
}

export async function clearLimit(key: string): Promise<void> {
  buckets.delete(key);
  const cfg = redisConfig();
  if (!cfg) return;
  try {
    await fetch(`${cfg.url.replace(/\/$/, "")}/del/cp%3Arl%3A${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Best effort: the window expires on its own anyway.
  }
}

/**
 * Only trust forwarding headers when the app is behind a proxy we control (set TRUST_PROXY=1).
 * Otherwise a client could spoof X-Forwarded-For to bypass the per-IP limiter.
 */
export function clientIp(req: Request): string {
  if (process.env.TRUST_PROXY === "1") {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]?.trim() || "unknown";
    const real = req.headers.get("x-real-ip");
    if (real) return real.trim();
  }
  return "unknown";
}
