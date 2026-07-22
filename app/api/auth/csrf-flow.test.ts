import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockRedis } from '@/test/mocks/redis';
import { createMockDb } from '@/test/mocks/db';

const { redisMock, dbFake, createSessionMock, getSessionMock, destroyAllSessionsMock, cookiesMock, redirectMock } =
  vi.hoisted(() => {
    // These factory functions are re-declared here (not imported) because
    // vi.hoisted() runs before any non-hoisted import, including our own
    // test/mocks modules.
    function createInMemoryRedis() {
      const store = new Map<string, { value: string; expireAt: number | null }>();
      const sets = new Map<string, Set<string>>();
      const loadedScripts = new Map<string, string>();
      function isExpired(entry: { expireAt: number | null } | undefined) {
        if (!entry) return true;
        if (entry.expireAt === null) return false;
        return Date.now() >= entry.expireAt;
      }
      function shaFor(script: string) {
        let hash = 0;
        for (let i = 0; i < script.length; i++) hash = (hash * 31 + script.charCodeAt(i)) | 0;
        return `sha-${hash}`;
      }
      const redis: any = {
        async get(key: string) {
          const e = store.get(key);
          if (isExpired(e)) {
            store.delete(key);
            return null;
          }
          return e!.value;
        },
        async set(key: string, value: string, ...args: any[]) {
          let expireAt: number | null = null;
          const exIdx = args.indexOf('EX');
          if (exIdx !== -1) expireAt = Date.now() + Number(args[exIdx + 1]) * 1000;
          store.set(key, { value, expireAt });
          return 'OK';
        },
        async del(...keys: string[]) {
          let c = 0;
          for (const k of keys) {
            if (store.delete(k)) c++;
            if (sets.delete(k)) c++;
          }
          return c;
        },
        async expire(key: string, seconds: number) {
          const e = store.get(key);
          if (!e || isExpired(e)) return 0;
          e.expireAt = Date.now() + seconds * 1000;
          return 1;
        },
        async ttl(key: string) {
          const e = store.get(key);
          if (!e || isExpired(e)) return -2;
          if (e.expireAt === null) return -1;
          return Math.ceil((e.expireAt - Date.now()) / 1000);
        },
        async sadd(key: string, ...members: string[]) {
          let s = sets.get(key);
          if (!s) sets.set(key, (s = new Set()));
          let added = 0;
          for (const m of members) if (!s.has(m)) (s.add(m), added++);
          return added;
        },
        async smembers(key: string) {
          return Array.from(sets.get(key) ?? []);
        },
        pipeline() {
          const ops: Array<() => Promise<any>> = [];
          const obj: any = {
            del(key: string) {
              ops.push(() => redis.del(key));
              return obj;
            },
            async exec() {
              const out = [];
              for (const op of ops) out.push([null, await op()]);
              return out;
            },
          };
          return obj;
        },
        async eval(_script: string, _numkeys: number, key: string, ...args: any[]) {
          const windowSeconds = Number(args[0]);
          const existing = store.get(key);
          if (!existing || isExpired(existing)) {
            store.set(key, { value: '1', expireAt: Date.now() + windowSeconds * 1000 });
            return 1;
          }
          const next = parseInt(existing.value, 10) + 1;
          store.set(key, { value: String(next), expireAt: existing.expireAt });
          return next;
        },
        async evalsha(sha: string, numkeys: number, key: string, ...args: any[]) {
          if (!loadedScripts.has(sha)) throw new Error('NOSCRIPT');
          return redis.eval('', numkeys, key, ...args);
        },
        async script(subcommand: string, scriptText: string) {
          const sha = shaFor(scriptText);
          loadedScripts.set(sha, scriptText);
          return sha;
        },
      };
      return {
        redis,
        _rawGet: (key: string) => store.get(key)?.value ?? null,
        _seed: (key: string, value: string, expireAt: number | null = null) => store.set(key, { value, expireAt }),
      };
    }

    function createInMemoryDb() {
      let selectResult: any = undefined;
      const insertCalls: any[] = [];
      const db = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({ where: vi.fn(() => ({ get: vi.fn(async () => selectResult) })) })),
        })),
        insert: vi.fn(() => {
          let pendingValues: any;
          return {
            values: vi.fn((values: any) => {
              pendingValues = values;
              return {
                onConflictDoUpdate: vi.fn(async (conflict: any) => {
                  insertCalls.push({ values: pendingValues, conflict });
                }),
              };
            }),
          };
        }),
      };
      return { db, insertCalls, setSelectResult: (row: any) => (selectResult = row) };
    }

    return {
      redisMock: createInMemoryRedis(),
      dbFake: createInMemoryDb(),
      createSessionMock: vi.fn(async (plexId: string, _authToken: string) => `session-token-for-${plexId}`),
      getSessionMock: vi.fn(async () => null),
      destroyAllSessionsMock: vi.fn(async () => {}),
      cookiesMock: vi.fn(),
      redirectMock: vi.fn((url: string) => {
        throw new Error(`REDIRECT:${url}`);
      }),
    };
  });

vi.mock('@/lib/redis', () => ({
  get redis() {
    return redisMock.redis;
  },
}));

vi.mock('@/lib/db', () => ({
  get db() {
    return dbFake.db;
  },
}));

vi.mock('@/lib/session', () => ({
  createSession: createSessionMock,
  getSession: getSessionMock,
  destroyAllSessions: destroyAllSessionsMock,
}));

vi.mock('@/lib/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/rate-limit')>();
  return {
    ...actual,
    rateLimit: vi.fn(async () => ({ allowed: true, limit: 999, remaining: 999 })),
  };
});

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

const APP_URL = 'https://plexpulse.example.com';

import { POST as startPOST } from '@/app/api/auth/start/route';
import { GET as checkGET } from '@/app/api/auth/check/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';

function makeRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, init);
}

function trustedPost(url: string): Request {
  return makeRequest(url, { method: 'POST', headers: { origin: APP_URL } });
}

describe('auth CSRF nonce lifecycle', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = APP_URL;
    delete process.env.ADMIN_PLEX_IDS;
    dbFake.setSelectResult(undefined);
    dbFake.insertCalls.length = 0;
    createSessionMock.mockClear();
    cookiesMock.mockReset();
    redirectMock.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('start: rejects requests from an untrusted origin', async () => {
    const res = await startPOST(makeRequest('http://localhost/api/auth/start', { method: 'POST' }));
    expect(res.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('start: creates a PIN, binds a nonce, and returns it', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'pin-1', code: 'ABCD' }),
    });

    const res = await startPOST(trustedPost('http://localhost/api/auth/start'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pinId).toBe('pin-1');
    expect(body.nonce).toBeTruthy();

    const stored = await redisMock.redis.get('pin_nonce:pin-1');
    expect(stored).toBe(body.nonce);
  });

  it('check: 400 when pinId or nonce is missing', async () => {
    const res = await checkGET(makeRequest('http://localhost/api/auth/check?pinId=pin-1'));
    expect(res.status).toBe(400);
  });

  it('check: 403 when the nonce does not match, and never calls plex.tv', async () => {
    await redisMock.redis.set('pin_nonce:pin-1', 'correct-nonce', 'EX', 300);

    const res = await checkGET(
      makeRequest('http://localhost/api/auth/check?pinId=pin-1&nonce=wrong-nonce'),
    );

    expect(res.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('check: one-time use — replaying the same nonce after success fails', async () => {
    await redisMock.redis.set('pin_nonce:pin-1', 'the-nonce', 'EX', 300);
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}), // authToken absent — not yet approved
    });

    const first = await checkGET(
      makeRequest('http://localhost/api/auth/check?pinId=pin-1&nonce=the-nonce'),
    );
    expect(first.status).toBe(200);

    const replay = await checkGET(
      makeRequest('http://localhost/api/auth/check?pinId=pin-1&nonce=the-nonce'),
    );
    expect(replay.status).toBe(403);
  });

  it('check: not-yet-authenticated poll returns a freshly regenerated nonce', async () => {
    await redisMock.redis.set('pin_nonce:pin-1', 'the-nonce', 'EX', 300);
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const res = await checkGET(
      makeRequest('http://localhost/api/auth/check?pinId=pin-1&nonce=the-nonce'),
    );
    const body = await res.json();

    expect(body.authenticated).toBe(false);
    expect(body.nonce).toBeTruthy();
    expect(body.nonce).not.toBe('the-nonce');

    const storedNow = await redisMock.redis.get('pin_nonce:pin-1');
    expect(storedNow).toBe(body.nonce);
  });

  it('check: happy path creates the session, upserts the user, and sets the cookie', async () => {
    await redisMock.redis.set('pin_nonce:pin-1', 'the-nonce', 'EX', 300);
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ authToken: 'plex-token-xyz' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 555, username: 'bob', thumb: 'http://img/x.png' }) });

    const res = await checkGET(
      makeRequest('http://localhost/api/auth/check?pinId=pin-1&nonce=the-nonce'),
    );
    const body = await res.json();

    expect(body.authenticated).toBe(true);
    expect(res.headers.get('set-cookie')).toContain('session_token=');
    expect(createSessionMock).toHaveBeenCalledWith('555', 'plex-token-xyz');

    expect(dbFake.insertCalls).toHaveLength(1);
    expect(dbFake.insertCalls[0].values).toMatchObject({ plexId: '555', username: 'bob', isAdmin: false });
  });

  it('check: grants admin when the Plex user id is in ADMIN_PLEX_IDS', async () => {
    process.env.ADMIN_PLEX_IDS = '555, 999';
    await redisMock.redis.set('pin_nonce:pin-1', 'the-nonce', 'EX', 300);
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ authToken: 'plex-token-xyz' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 555, username: 'bob' }) });

    await checkGET(makeRequest('http://localhost/api/auth/check?pinId=pin-1&nonce=the-nonce'));

    expect(dbFake.insertCalls[0].values).toMatchObject({ isAdmin: true });
  });

  it('check: does not grant admin when the Plex user id is absent from ADMIN_PLEX_IDS', async () => {
    process.env.ADMIN_PLEX_IDS = '111, 222';
    await redisMock.redis.set('pin_nonce:pin-1', 'the-nonce', 'EX', 300);
    (fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ authToken: 'plex-token-xyz' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 555, username: 'bob' }) });

    await checkGET(makeRequest('http://localhost/api/auth/check?pinId=pin-1&nonce=the-nonce'));

    expect(dbFake.insertCalls[0].values).toMatchObject({ isAdmin: false });
  });

  it('logout: rejects requests from an untrusted origin', async () => {
    const res = await logoutPOST(makeRequest('http://localhost/api/auth/logout', { method: 'POST' }));
    expect(res.status).toBe(403);
  });
});
