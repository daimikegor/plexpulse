import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { dbFake } = vi.hoisted(() => {
  function createInMemoryDb() {
    let selectResult: any = undefined;
    const insertCalls: Array<{ values: any; conflict: any }> = [];
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
  return { dbFake: createInMemoryDb() };
});

vi.mock('@/lib/db', () => ({
  get db() {
    return dbFake.db;
  },
}));

const PLEX_URL = 'http://plex.local:32400';
const PLEX_TOKEN = 'test-plex-token';

async function freshPlexLibrary() {
  vi.resetModules();
  return await import('@/lib/plex-library');
}

function makeRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'movie',
    mediaType: 'movie',
    guids: '[]',
    itemCount: 0,
    lastScanAt: new Date(),
    lastScanSuccess: false,
    lastScanError: null,
    scanInProgress: false,
    ...overrides,
  };
}

function sectionsResponse(sections: Array<{ key: string; title: string; type: string }>) {
  return { ok: true, status: 200, json: async () => ({ MediaContainer: { Directory: sections } }) };
}

function itemsResponse(items: any[], opts: { totalSize?: number; size?: number } = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      MediaContainer: {
        Metadata: items,
        size: opts.size ?? items.length,
        ...(opts.totalSize !== undefined ? { totalSize: opts.totalSize } : {}),
      },
    }),
  };
}

function itemWithGuid(guidId: string) {
  return { Guid: [{ id: guidId }] };
}

async function flush() {
  await new Promise((r) => setTimeout(r, 10));
}

describe('lib/plex-library', () => {
  beforeEach(() => {
    dbFake.setSelectResult(undefined);
    dbFake.insertCalls.length = 0;
    process.env.PLEX_SERVER_URL = PLEX_URL;
    process.env.PLEX_SERVER_TOKEN = PLEX_TOKEN;
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PLEX_SERVER_URL;
    delete process.env.PLEX_SERVER_TOKEN;
    vi.restoreAllMocks();
  });

  describe('concurrency guard', () => {
    it('skips the scan when one is already in progress and recent', async () => {
      dbFake.setSelectResult(
        makeRow({ scanInProgress: true, lastScanAt: new Date(Date.now() - 5 * 60 * 1000) }),
      );
      const { runPlexLibraryScan } = await freshPlexLibrary();

      await runPlexLibraryScan('movie');

      expect(fetch).not.toHaveBeenCalled();
      expect(dbFake.insertCalls).toHaveLength(0);
    });

    it('regression: bypasses the guard and re-scans when scanInProgress is stale (>30min)', async () => {
      dbFake.setSelectResult(
        makeRow({ scanInProgress: true, lastScanAt: new Date(Date.now() - 31 * 60 * 1000) }),
      );
      (fetch as any).mockResolvedValueOnce(sectionsResponse([]));
      const { runPlexLibraryScan } = await freshPlexLibrary();

      await runPlexLibraryScan('movie');

      expect(fetch).toHaveBeenCalled();
      expect(dbFake.insertCalls.length).toBeGreaterThanOrEqual(2);
      expect(dbFake.insertCalls[0].values.scanInProgress).toBe(true); // claim
      expect(dbFake.insertCalls.at(-1)!.values.scanInProgress).toBe(false); // finalize
    });

    it('claims the slot on the first-ever scan (no existing row)', async () => {
      dbFake.setSelectResult(undefined);
      (fetch as any).mockResolvedValueOnce(sectionsResponse([]));
      const { runPlexLibraryScan } = await freshPlexLibrary();

      await runPlexLibraryScan('movie');

      expect(dbFake.insertCalls[0].values).toMatchObject({
        id: 'movie',
        guids: '[]',
        itemCount: 0,
        scanInProgress: true,
      });
    });
  });

  describe('checkPlexLibrary', () => {
    it('returns true when the tmdbId is present in the stored guids', async () => {
      dbFake.setSelectResult(makeRow({ guids: JSON.stringify(['111', '222']) }));
      const { checkPlexLibrary } = await freshPlexLibrary();

      await expect(checkPlexLibrary('111', 'movie')).resolves.toBe(true);
      await expect(checkPlexLibrary('999', 'movie')).resolves.toBe(false);
    });

    it('auto-bootstraps a scan only once per process when no row exists', async () => {
      dbFake.setSelectResult(undefined);
      delete process.env.PLEX_SERVER_URL; // short-circuits the background scan quickly
      delete process.env.PLEX_SERVER_TOKEN;
      const { checkPlexLibrary } = await freshPlexLibrary();

      await checkPlexLibrary('111', 'movie');
      await checkPlexLibrary('222', 'movie');
      await flush();

      // One triggered scan == exactly one claim-slot upsert + one finalize upsert.
      expect(dbFake.insertCalls).toHaveLength(2);
    });
  });

  describe('GUID extraction', () => {
    it('extracts both modern and legacy tmdb GUID formats', async () => {
      (fetch as any)
        .mockResolvedValueOnce(sectionsResponse([{ key: '1', title: 'Movies', type: 'movie' }]))
        .mockResolvedValueOnce(
          itemsResponse(
            [itemWithGuid('tmdb://123'), itemWithGuid('com.plexapp.agents.tmdb://456?lang=en')],
            { totalSize: 2 },
          ),
        );
      const { runPlexLibraryScan } = await freshPlexLibrary();

      await runPlexLibraryScan('movie');

      const finalCall = dbFake.insertCalls.at(-1)!;
      const guids = JSON.parse(finalCall.values.guids);
      expect(guids).toEqual(expect.arrayContaining(['123', '456']));
      expect(finalCall.values.lastScanSuccess).toBe(true);
      expect(finalCall.values.itemCount).toBe(2);
    });
  });

  describe('pagination', () => {
    it('regression: does not stop after page 1 when totalSize is missing and the page was full', async () => {
      (fetch as any)
        .mockResolvedValueOnce(sectionsResponse([{ key: '1', title: 'Movies', type: 'movie' }]))
        .mockResolvedValueOnce(itemsResponse(Array.from({ length: 100 }, () => ({})), { size: 100 }))
        .mockResolvedValueOnce(itemsResponse([{}], { size: 1 }));
      const { runPlexLibraryScan } = await freshPlexLibrary();

      await runPlexLibraryScan('movie');

      // sections + page1 + page2 = 3 fetch calls total.
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('stops pagination once totalSize is reached even on a full page', async () => {
      (fetch as any)
        .mockResolvedValueOnce(sectionsResponse([{ key: '1', title: 'Movies', type: 'movie' }]))
        .mockResolvedValueOnce(itemsResponse(Array.from({ length: 100 }, () => ({})), { size: 100, totalSize: 100 }));
      const { runPlexLibraryScan } = await freshPlexLibrary();

      await runPlexLibraryScan('movie');

      // sections + page1 only = 2 fetch calls total (no page2).
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('failure handling', () => {
    it('finalizes as a failure when PLEX_SERVER_URL/TOKEN are not configured', async () => {
      delete process.env.PLEX_SERVER_URL;
      delete process.env.PLEX_SERVER_TOKEN;
      const { runPlexLibraryScan } = await freshPlexLibrary();

      await runPlexLibraryScan('movie');

      expect(fetch).not.toHaveBeenCalled();
      const finalCall = dbFake.insertCalls.at(-1)!;
      expect(finalCall.values.lastScanSuccess).toBe(false);
      expect(finalCall.values.lastScanError).toMatch(/PLEX_SERVER_URL|PLEX_SERVER_TOKEN/);
      expect(finalCall.values.scanInProgress).toBe(false);
    });

    it('finalizes as a failure when the sections request is not OK', async () => {
      (fetch as any).mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Unavailable', json: async () => ({}) });
      const { runPlexLibraryScan } = await freshPlexLibrary();

      await runPlexLibraryScan('movie');

      const finalCall = dbFake.insertCalls.at(-1)!;
      expect(finalCall.values.lastScanSuccess).toBe(false);
      expect(finalCall.values.lastScanError).toMatch(/503/);
    });

    it('finalizes as a success with partial results when a page request mid-scan fails', async () => {
      (fetch as any)
        .mockResolvedValueOnce(sectionsResponse([{ key: '1', title: 'Movies', type: 'movie' }]))
        .mockResolvedValueOnce(itemsResponse([itemWithGuid('tmdb://789')], { size: 1, totalSize: 999 }))
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error', json: async () => ({}) });
      const { runPlexLibraryScan } = await freshPlexLibrary();

      await runPlexLibraryScan('movie');

      const finalCall = dbFake.insertCalls.at(-1)!;
      expect(finalCall.values.lastScanSuccess).toBe(true);
      expect(JSON.parse(finalCall.values.guids)).toEqual(['789']);
    });

    it('finalizes as a failure when fetch throws', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const { runPlexLibraryScan } = await freshPlexLibrary();

      await runPlexLibraryScan('movie');

      const finalCall = dbFake.insertCalls.at(-1)!;
      expect(finalCall.values.lastScanSuccess).toBe(false);
      expect(finalCall.values.lastScanError).toMatch(/ECONNREFUSED/);
    });
  });
});
