import { redis } from '@/lib/redis';

// ---------------------------------------------------------------------------
// Atomic Lua script: INCR + conditional EXPIRE in a single round-trip.
// Redis guarantees the script runs atomically — no race between INCR and EXPIRE.
// ---------------------------------------------------------------------------
const INCR_AND_EXPIRE = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return c
` as const;

// Pre-load the script hash so we can use EVALSHA (single round-trip after first
// load).  Fall back to EVAL if the script is not cached.
let scriptSha: string | null = null;

async function incrWithExpire(
  key: string,
  windowSeconds: number,
): Promise<number> {
  try {
    if (scriptSha) {
      return (await redis.evalsha(scriptSha, 1, key, windowSeconds)) as number;
    }
  } catch {
    // Script not cached (e.g. Redis restarted) — fall through to EVAL.
    scriptSha = null;
  }

  const result = (await redis.eval(
    INCR_AND_EXPIRE,
    1,
    key,
    windowSeconds,
  )) as number;

  // Cache the SHA for the next call.  Redis computes it deterministically from
  // the script text, so we can ask for it once and reuse it.
  if (!scriptSha) {
    try {
      scriptSha = (await redis.script('LOAD', INCR_AND_EXPIRE)) as string;
    } catch {
      // Non-fatal — EVAL still works, just slightly slower.
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// IP extraction
// ---------------------------------------------------------------------------

/**
 * Extract the client IP from the request.
 *
 * The app runs behind a reverse proxy (Docker / Unraid / nginx / traefik /
 * Caddy).  We trust the proxy to set `x-forwarded-for` correctly — the
 * leftmost entry is the original client IP.
 *
 * Falls back through: x-forwarded-for → x-real-ip → '127.0.0.1'
 */
function getClientIP(request: Request): string {
  // x-forwarded-for is a comma-separated chain: client, proxy1, proxy2
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (ip) return ip;
  }

  // Some proxies set x-real-ip as a single value
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // Direct access (dev, or no reverse proxy)
  return '127.0.0.1';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Unique key for this endpoint (e.g. "search-live"). */
  endpoint: string;
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Window duration in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  /** true if the request is within the limit. */
  allowed: boolean;
  /** The configured limit for this endpoint. */
  limit: number;
  /** How many requests remain in the current window. */
  remaining: number;
  /** Seconds until the window resets (only set when !allowed). */
  retryAfter?: number;
}

/**
 * Apply rate limiting to an incoming request.
 *
 * Uses a Redis-backed fixed-window counter keyed by client IP + endpoint.
 * Fails **open** — if Redis is unreachable the request is allowed through
 * rather than blocking all traffic.
 *
 * @example
 * ```ts
 * const rl = await rateLimit(request, RATE_LIMITS['search-live']);
 * if (!rl.allowed) {
 *   return NextResponse.json(
 *     { error: 'Too many requests' },
 *     { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
 *   );
 * }
 * ```
 */
export async function rateLimit(
  request: Request,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const ip = getClientIP(request);
  const windowKey = Math.floor(Date.now() / 1000 / config.windowSeconds);
  const key = `ratelimit:${config.endpoint}:${ip}:${windowKey}`;

  try {
    const current = await incrWithExpire(key, config.windowSeconds);
    const remaining = Math.max(0, config.limit - current);

    if (current > config.limit) {
      // Determine how long until the window resets.
      const ttl = await redis.ttl(key);
      const retryAfter = ttl > 0 ? ttl : config.windowSeconds;

      return { allowed: false, limit: config.limit, remaining: 0, retryAfter };
    }

    return { allowed: true, limit: config.limit, remaining };
  } catch (error) {
    // Redis is unavailable — fail open so the app remains usable.
    console.warn(
      `[rate-limit] Redis unavailable for ${config.endpoint}, allowing request:`,
      error instanceof Error ? error.message : error,
    );
    return { allowed: true, limit: config.limit, remaining: config.limit };
  }
}

// ---------------------------------------------------------------------------
// Pre-configured limits for each API route
// ---------------------------------------------------------------------------

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'search-live': { endpoint: 'search-live', limit: 30, windowSeconds: 60 },
  'media-status': { endpoint: 'media-status', limit: 30, windowSeconds: 60 },
  discover: { endpoint: 'discover', limit: 60, windowSeconds: 60 },
  'genre-content': { endpoint: 'genre-content', limit: 60, windowSeconds: 60 },
  category: { endpoint: 'category', limit: 60, windowSeconds: 60 },
  'auth-start': { endpoint: 'auth-start', limit: 5, windowSeconds: 60 },
  'auth-check': { endpoint: 'auth-check', limit: 20, windowSeconds: 60 },
  'auth-callback': { endpoint: 'auth-callback', limit: 30, windowSeconds: 60 },
  'auth-logout': { endpoint: 'auth-logout', limit: 10, windowSeconds: 60 },
  'watchlist-add': { endpoint: 'watchlist-add', limit: 20, windowSeconds: 60 },
};
