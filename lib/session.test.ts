import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockRedis } from '@/test/mocks/redis';
import { createMockDb } from '@/test/mocks/db';

const redisMock = createMockRedis();
const dbFake = createMockDb();
const cookiesMock = vi.fn();
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
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

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

const SESSION_TTL = 604800;

async function freshSession() {
  vi.resetModules();
  return await import('@/lib/session');
}

const USER_ROW = {
  plexId: '123',
  username: 'alice',
  isAdmin: false,
  avatarUrl: null,
};

describe('session', () => {
  beforeEach(() => {
    dbFake.setSelectResult(USER_ROW);
    cookiesMock.mockReset();
    redirectMock.mockClear();
    delete process.env.SESSION_SECRET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SESSION_SECRET;
  });

  describe('createSession / getSession', () => {
    it('round-trips the auth token encrypted when SESSION_SECRET is set', async () => {
      process.env.SESSION_SECRET = 'a-long-test-secret-value';
      const { createSession, getSession } = await freshSession();

      const token = await createSession('123', 'plex-auth-token-abc');
      const raw = JSON.parse(redisMock._rawGet(`session:${token}`)!);
      expect(raw.authToken.startsWith('enc:')).toBe(true);

      const session = await getSession(token);
      expect(session).toMatchObject({ plexId: '123', authToken: 'plex-auth-token-abc', username: 'alice' });
    });

    it('falls back to plaintext storage and warns when SESSION_SECRET is unset', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { createSession, getSession } = await freshSession();

      const token = await createSession('123', 'plex-auth-token-plain');
      const raw = JSON.parse(redisMock._rawGet(`session:${token}`)!);
      expect(raw.authToken.startsWith('enc:')).toBe(false);
      expect(raw.authToken).toBe('plex-auth-token-plain');

      const session = await getSession(token);
      expect(session?.authToken).toBe('plex-auth-token-plain');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('reads legacy plaintext tokens even when SESSION_SECRET is set (back-compat)', async () => {
      process.env.SESSION_SECRET = 'a-long-test-secret-value';
      const { getSession } = await freshSession();

      const token = 'legacy-token-123';
      redisMock._seed(
        `session:${token}`,
        JSON.stringify({ plexId: '123', authToken: 'legacy-plaintext-token' }),
      );

      const session = await getSession(token);
      expect(session?.authToken).toBe('legacy-plaintext-token');
    });

    it('returns null for a missing/expired session key', async () => {
      const { getSession } = await freshSession();
      const session = await getSession('does-not-exist');
      expect(session).toBeNull();
    });

    it('returns null when the DB has no matching user', async () => {
      dbFake.setSelectResult(undefined);
      const { createSession, getSession } = await freshSession();

      const token = await createSession('123', 'some-token');
      const session = await getSession(token);
      expect(session).toBeNull();
    });

    it('refreshes sliding TTL on both session and user_sessions keys', async () => {
      const { createSession, getSession } = await freshSession();
      const expireSpy = vi.spyOn(redisMock.redis, 'expire');

      const token = await createSession('123', 'some-token');
      expireSpy.mockClear();
      await getSession(token);

      expect(expireSpy).toHaveBeenCalledWith(`session:${token}`, SESSION_TTL);
      expect(expireSpy).toHaveBeenCalledWith('user_sessions:123', SESSION_TTL);
    });

    it('catches malformed JSON and returns null without throwing', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { getSession } = await freshSession();

      redisMock._seed('session:corrupt-token', '{not valid json');

      await expect(getSession('corrupt-token')).resolves.toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('destroyAllSessions', () => {
    it('deletes every tracked session plus the tracking set', async () => {
      const { createSession, destroyAllSessions } = await freshSession();

      const tokenA = await createSession('123', 'token-a');
      const tokenB = await createSession('123', 'token-b');

      await destroyAllSessions('123');

      expect(redisMock._rawGet(`session:${tokenA}`)).toBeNull();
      expect(redisMock._rawGet(`session:${tokenB}`)).toBeNull();
      expect(await redisMock.redis.smembers('user_sessions:123')).toEqual([]);
    });

    it('does nothing when the user has no tracked sessions', async () => {
      const { destroyAllSessions } = await freshSession();
      const pipelineSpy = vi.spyOn(redisMock.redis, 'pipeline');

      await expect(destroyAllSessions('no-such-user')).resolves.toBeUndefined();
      expect(pipelineSpy).not.toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('redirects to / when there is no session cookie', async () => {
      cookiesMock.mockResolvedValue({ get: () => undefined });
      const { requireAuth } = await freshSession();

      await expect(requireAuth()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
    });

    it('returns the session when the cookie points at a valid session', async () => {
      const { createSession, requireAuth } = await freshSession();
      const token = await createSession('123', 'valid-token');
      cookiesMock.mockResolvedValue({ get: () => ({ value: token }) });

      const session = await requireAuth();
      expect(session).toMatchObject({ plexId: '123', authToken: 'valid-token' });
      expect(redirectMock).not.toHaveBeenCalled();
    });

    it('redirects to / when the session token is invalid or expired', async () => {
      cookiesMock.mockResolvedValue({ get: () => ({ value: 'nonexistent-token' }) });
      const { requireAuth } = await freshSession();

      await expect(requireAuth()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
    });
  });
});
