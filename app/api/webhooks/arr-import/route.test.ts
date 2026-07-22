import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter?: number;
}

const { refreshMediaStatusMock, getTmdbIdFromTvdbMock, rateLimitMock } = vi.hoisted(() => ({
  refreshMediaStatusMock: vi.fn(async () => 'requested' as const),
  getTmdbIdFromTvdbMock: vi.fn(async () => '9999'),
  rateLimitMock: vi.fn<(...args: any[]) => Promise<RateLimitResult>>(async () => ({
    allowed: true,
    limit: 120,
    remaining: 119,
  })),
}));

vi.mock('@/lib/media-status', () => ({
  refreshMediaStatus: refreshMediaStatusMock,
}));

vi.mock('@/lib/tmdb', () => ({
  getTmdbIdFromTvdb: getTmdbIdFromTvdbMock,
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
  RATE_LIMITS: { 'arr-import': { endpoint: 'arr-import', limit: 120, windowSeconds: 60 } },
}));

import { POST } from './route';

const SECRET = 'test-secret';
const URL_BASE = 'http://localhost/api/webhooks/arr-import';

function makeRequest(body: unknown, token: string | null = SECRET) {
  const url = token === null ? URL_BASE : `${URL_BASE}?token=${token}`;
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/webhooks/arr-import', () => {
  const originalSecret = process.env.ARR_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.ARR_WEBHOOK_SECRET = SECRET;
    refreshMediaStatusMock.mockClear();
    getTmdbIdFromTvdbMock.mockClear();
    rateLimitMock.mockClear();
    rateLimitMock.mockResolvedValue({ allowed: true, limit: 120, remaining: 119 });
  });

  afterEach(() => {
    process.env.ARR_WEBHOOK_SECRET = originalSecret;
  });

  it('refreshes movie status on a Radarr Download event', async () => {
    const res = await POST(
      makeRequest({ eventType: 'Download', movie: { tmdbId: 603 } }),
    );
    expect(res.status).toBe(200);
    await vi.waitFor(() => {
      expect(refreshMediaStatusMock).toHaveBeenCalledWith('603', 'movie');
    });
  });

  it('converts TVDB to TMDB and refreshes tv status on a Sonarr Download event', async () => {
    const res = await POST(
      makeRequest({ eventType: 'Download', series: { tvdbId: 12345 } }),
    );
    expect(res.status).toBe(200);
    await vi.waitFor(() => {
      expect(getTmdbIdFromTvdbMock).toHaveBeenCalledWith('12345');
      expect(refreshMediaStatusMock).toHaveBeenCalledWith('9999', 'tv');
    });
  });

  it('no-ops on a Grab event', async () => {
    const res = await POST(
      makeRequest({ eventType: 'Grab', movie: { tmdbId: 603 } }),
    );
    expect(res.status).toBe(200);
    expect(refreshMediaStatusMock).not.toHaveBeenCalled();
    expect(getTmdbIdFromTvdbMock).not.toHaveBeenCalled();
  });

  it('no-ops on a Test event', async () => {
    const res = await POST(makeRequest({ eventType: 'Test' }));
    expect(res.status).toBe(200);
    expect(refreshMediaStatusMock).not.toHaveBeenCalled();
  });

  it('no-ops on a Download event with neither movie nor series', async () => {
    const res = await POST(makeRequest({ eventType: 'Download' }));
    expect(res.status).toBe(200);
    expect(refreshMediaStatusMock).not.toHaveBeenCalled();
    expect(getTmdbIdFromTvdbMock).not.toHaveBeenCalled();
  });

  it('rejects a missing token', async () => {
    const res = await POST(makeRequest({ eventType: 'Download' }, null));
    expect(res.status).toBe(401);
    expect(refreshMediaStatusMock).not.toHaveBeenCalled();
  });

  it('rejects a wrong token', async () => {
    const res = await POST(makeRequest({ eventType: 'Download' }, 'wrong'));
    expect(res.status).toBe(401);
  });

  it('fails closed when ARR_WEBHOOK_SECRET is unset', async () => {
    delete process.env.ARR_WEBHOOK_SECRET;
    const res = await POST(makeRequest({ eventType: 'Download' }));
    expect(res.status).toBe(401);
  });

  it('rejects malformed JSON with 400', async () => {
    const req = new Request(`${URL_BASE}?token=${SECRET}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: false, limit: 120, remaining: 0, retryAfter: 30 });
    const res = await POST(makeRequest({ eventType: 'Download' }));
    expect(res.status).toBe(429);
  });
});
