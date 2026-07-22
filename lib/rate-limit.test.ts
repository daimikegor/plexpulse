import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockRedis, spyRedis } from '@/test/mocks/redis';

const mock = createMockRedis();

vi.mock('@/lib/redis', () => ({
  get redis() {
    return mock.redis;
  },
}));

const { rateLimit, RATE_LIMITS } = await import('@/lib/rate-limit');

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/whatever', { headers });
}

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('allows requests under the limit and decrements remaining correctly', async () => {
    const config = { endpoint: `test-under-${Math.random()}`, limit: 3, windowSeconds: 60 };
    const req = makeRequest({ 'x-forwarded-for': '1.1.1.1' });

    const r1 = await rateLimit(req, config);
    expect(r1).toEqual({ allowed: true, limit: 3, remaining: 2 });

    const r2 = await rateLimit(req, config);
    expect(r2).toEqual({ allowed: true, limit: 3, remaining: 1 });

    const r3 = await rateLimit(req, config);
    expect(r3).toEqual({ allowed: true, limit: 3, remaining: 0 });
  });

  it('blocks once current exceeds the limit and returns retryAfter', async () => {
    const config = { endpoint: `test-over-${Math.random()}`, limit: 1, windowSeconds: 45 };
    const req = makeRequest({ 'x-forwarded-for': '2.2.2.2' });

    await rateLimit(req, config); // consumes the only slot
    const blocked = await rateLimit(req, config);

    expect(blocked.allowed).toBe(false);
    expect(blocked.limit).toBe(1);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(45);
  });

  it('fails open when redis is unavailable', async () => {
    const config = { endpoint: `test-failopen-${Math.random()}`, limit: 5, windowSeconds: 60 };
    const req = makeRequest({ 'x-forwarded-for': '3.3.3.3' });

    const evalSpy = vi.spyOn(mock.redis, 'eval').mockRejectedValue(new Error('ECONNREFUSED'));
    const evalshaSpy = vi.spyOn(mock.redis, 'evalsha').mockRejectedValue(new Error('ECONNREFUSED'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await rateLimit(req, config);

    expect(result).toEqual({ allowed: true, limit: 5, remaining: 5 });
    expect(warnSpy).toHaveBeenCalled();

    evalSpy.mockRestore();
    evalshaSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('extracts the client IP from the first entry of x-forwarded-for', async () => {
    const config = { endpoint: `test-xff-${Math.random()}`, limit: 1, windowSeconds: 60 };
    const spies = spyRedis(mock.redis);

    await rateLimit(makeRequest({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1, 10.0.0.2' }), config);

    const keyUsed = spies.eval.mock.calls[0]?.[2] ?? spies.evalsha.mock.calls[0]?.[2];
    expect(keyUsed).toContain('9.9.9.9');
    expect(keyUsed).not.toContain('10.0.0.1');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
    const config = { endpoint: `test-realip-${Math.random()}`, limit: 1, windowSeconds: 60 };
    const spies = spyRedis(mock.redis);

    await rateLimit(makeRequest({ 'x-real-ip': '8.8.8.8' }), config);

    const keyUsed = spies.eval.mock.calls[0]?.[2] ?? spies.evalsha.mock.calls[0]?.[2];
    expect(keyUsed).toContain('8.8.8.8');
  });

  it('falls back to 127.0.0.1 when no IP headers are present', async () => {
    const config = { endpoint: `test-noip-${Math.random()}`, limit: 1, windowSeconds: 60 };
    const spies = spyRedis(mock.redis);

    await rateLimit(makeRequest(), config);

    const keyUsed = spies.eval.mock.calls[0]?.[2] ?? spies.evalsha.mock.calls[0]?.[2];
    expect(keyUsed).toContain('127.0.0.1');
  });

  it('tracks different IPs as independent buckets', async () => {
    const config = { endpoint: `test-independent-${Math.random()}`, limit: 1, windowSeconds: 60 };

    const a1 = await rateLimit(makeRequest({ 'x-forwarded-for': '5.5.5.5' }), config);
    const b1 = await rateLimit(makeRequest({ 'x-forwarded-for': '6.6.6.6' }), config);

    expect(a1.allowed).toBe(true);
    expect(b1.allowed).toBe(true);
  });

  it('accumulates within the same fixed window and resets in a new window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const config = { endpoint: `test-window-${Math.random()}`, limit: 2, windowSeconds: 60 };
    const req = makeRequest({ 'x-forwarded-for': '7.7.7.7' });

    const r1 = await rateLimit(req, config);
    expect(r1.remaining).toBe(1);

    // Still within the same 60s window.
    vi.setSystemTime(new Date('2026-01-01T00:00:30.000Z'));
    const r2 = await rateLimit(req, config);
    expect(r2.remaining).toBe(0);

    // New window — counter resets.
    vi.setSystemTime(new Date('2026-01-01T00:01:05.000Z'));
    const r3 = await rateLimit(req, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(1);

    vi.useRealTimers();
  });

  it('reuses EVALSHA after the script has been loaded once', async () => {
    const config = { endpoint: `test-evalsha-${Math.random()}`, limit: 5, windowSeconds: 60 };
    const spies = spyRedis(mock.redis);

    await rateLimit(makeRequest({ 'x-forwarded-for': '11.11.11.11' }), config);
    await rateLimit(makeRequest({ 'x-forwarded-for': '11.11.11.11' }), config);

    expect(spies.evalsha).toHaveBeenCalled();
  });

  it('every RATE_LIMITS entry has an endpoint matching its own key', () => {
    for (const [key, config] of Object.entries(RATE_LIMITS)) {
      expect(config.endpoint).toBe(key);
    }
  });
});
