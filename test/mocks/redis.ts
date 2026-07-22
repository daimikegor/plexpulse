import { vi } from 'vitest';

interface Entry {
  value: string;
  expireAt: number | null; // ms epoch, null = no expiry
}

interface SetEntry {
  kind: 'set';
  members: Set<string>;
  expireAt: number | null;
}

/**
 * In-memory fake of the ioredis client surface used by lib/rate-limit.ts and
 * lib/session.ts. Real INCR/EXPIRE/TTL semantics matter here — these tests
 * assert on counting and expiry behavior, not just "was redis called".
 */
export function createMockRedis() {
  const store = new Map<string, Entry>();
  const sets = new Map<string, SetEntry>();
  const loadedScripts = new Map<string, string>(); // sha -> script text

  function isExpired(entry: { expireAt: number | null } | undefined): boolean {
    if (!entry) return true;
    if (entry.expireAt === null) return false;
    return Date.now() >= entry.expireAt;
  }

  function shaFor(script: string): string {
    // Not a real SHA1 — deterministic enough for the fake NOSCRIPT/EVALSHA flow.
    let hash = 0;
    for (let i = 0; i < script.length; i++) {
      hash = (hash * 31 + script.charCodeAt(i)) | 0;
    }
    return `sha-${hash}`;
  }

  function incrAndExpire(key: string, windowSeconds: number): number {
    const existing = store.get(key);
    if (!existing || isExpired(existing)) {
      store.set(key, { value: '1', expireAt: Date.now() + windowSeconds * 1000 });
      return 1;
    }
    const next = parseInt(existing.value, 10) + 1;
    store.set(key, { value: String(next), expireAt: existing.expireAt });
    return next;
  }

  const redis = {
    async get(key: string): Promise<string | null> {
      const entry = store.get(key);
      if (isExpired(entry)) {
        store.delete(key);
        return null;
      }
      return entry!.value;
    },

    async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
      let expireAt: number | null = null;
      const exIdx = args.indexOf('EX');
      if (exIdx !== -1) {
        const seconds = Number(args[exIdx + 1]);
        expireAt = Date.now() + seconds * 1000;
      }
      store.set(key, { value, expireAt });
      return 'OK';
    },

    async del(...keys: string[]): Promise<number> {
      let count = 0;
      for (const key of keys) {
        if (store.delete(key)) count++;
        if (sets.delete(key)) count++;
      }
      return count;
    },

    async expire(key: string, seconds: number): Promise<number> {
      const entry = store.get(key) ?? sets.get(key);
      if (!entry || isExpired(entry)) return 0;
      entry.expireAt = Date.now() + seconds * 1000;
      return 1;
    },

    async ttl(key: string): Promise<number> {
      const entry = store.get(key);
      if (!entry || isExpired(entry)) return -2;
      if (entry.expireAt === null) return -1;
      return Math.ceil((entry.expireAt - Date.now()) / 1000);
    },

    async sadd(key: string, ...members: string[]): Promise<number> {
      let entry = sets.get(key);
      if (!entry || isExpired(entry)) {
        entry = { kind: 'set', members: new Set(), expireAt: null };
        sets.set(key, entry);
      }
      let added = 0;
      for (const m of members) {
        if (!entry.members.has(m)) {
          entry.members.add(m);
          added++;
        }
      }
      return added;
    },

    async smembers(key: string): Promise<string[]> {
      const entry = sets.get(key);
      if (!entry || isExpired(entry)) return [];
      return Array.from(entry.members);
    },

    pipeline() {
      const ops: Array<() => Promise<any>> = [];
      const pipelineObj = {
        del(key: string) {
          ops.push(() => redis.del(key));
          return pipelineObj;
        },
        async exec() {
          const results = [];
          for (const op of ops) {
            results.push([null, await op()]);
          }
          return results;
        },
      };
      return pipelineObj;
    },

    async eval(script: string, _numkeys: number, key: string, ...args: any[]): Promise<number> {
      const windowSeconds = Number(args[0]);
      return incrAndExpire(key, windowSeconds);
    },

    async evalsha(sha: string, _numkeys: number, key: string, ...args: any[]): Promise<number> {
      if (!loadedScripts.has(sha)) {
        throw new Error('NOSCRIPT No matching script. Please use EVAL.');
      }
      const windowSeconds = Number(args[0]);
      return incrAndExpire(key, windowSeconds);
    },

    async script(subcommand: string, scriptText: string): Promise<string> {
      if (subcommand !== 'LOAD') throw new Error(`Unsupported SCRIPT subcommand: ${subcommand}`);
      const sha = shaFor(scriptText);
      loadedScripts.set(sha, scriptText);
      return sha;
    },
  };

  return {
    redis,
    // Test-only helpers for inspecting/seeding raw state.
    _rawGet: (key: string) => store.get(key)?.value ?? null,
    _seed: (key: string, value: string, expireAt: number | null = null) => {
      store.set(key, { value, expireAt });
    },
  };
}

export function spyRedis(redis: ReturnType<typeof createMockRedis>['redis']) {
  return {
    eval: vi.spyOn(redis, 'eval'),
    evalsha: vi.spyOn(redis, 'evalsha'),
    script: vi.spyOn(redis, 'script'),
    ttl: vi.spyOn(redis, 'ttl'),
    expire: vi.spyOn(redis, 'expire'),
    del: vi.spyOn(redis, 'del'),
  };
}
