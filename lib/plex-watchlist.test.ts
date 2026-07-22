import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findPlexRatingKey, addToPlexWatchlist } from '@/lib/plex-watchlist';

function discoverResponse(results: Array<{ title: string; year?: number; guid?: string }>) {
  return {
    MediaContainer: {
      SearchResults: [
        {
          id: 'external',
          SearchResult: results.map((r) => ({
            Metadata: { title: r.title, year: r.year, guid: r.guid ?? 'plex://movie/defaultkey' },
          })),
        },
      ],
    },
  };
}

function mockFetchOnce(body: any, ok = true) {
  (fetch as any).mockResolvedValueOnce({ ok, status: ok ? 200 : 500, statusText: 'Error', json: async () => body });
}

describe('findPlexRatingKey', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('matches titles differing only by ellipsis rendering', async () => {
    mockFetchOnce(
      discoverResponse([{ title: 'Once Upon a Time... in Hollywood', year: 2019, guid: 'plex://movie/abc' }]),
    );

    const key = await findPlexRatingKey('Once Upon a Time… in Hollywood', 2019, 'movie', 'token');
    expect(key).toBe('abc');
  });

  it('matches titles differing only by smart vs straight quotes', async () => {
    mockFetchOnce(discoverResponse([{ title: "Ocean's Eleven", year: 2001, guid: 'plex://movie/quote' }]));

    const key = await findPlexRatingKey('Ocean’s Eleven', 2001, 'movie', 'token');
    expect(key).toBe('quote');
  });

  it('matches titles differing only by en/em dash vs hyphen', async () => {
    mockFetchOnce(discoverResponse([{ title: 'Spider-Man - Far From Home', year: 2019, guid: 'plex://movie/dash' }]));

    const key = await findPlexRatingKey('Spider-Man – Far From Home', 2019, 'movie', 'token');
    expect(key).toBe('dash');
  });

  it('matches titles differing only by colon presence/placement', async () => {
    mockFetchOnce(discoverResponse([{ title: 'Once Upon a Time A Story', year: 2020, guid: 'plex://movie/colon' }]));

    const key = await findPlexRatingKey('Once Upon a Time: A Story', 2020, 'movie', 'token');
    expect(key).toBe('colon');
  });

  it('requires the year to match when a year is provided', async () => {
    mockFetchOnce(discoverResponse([{ title: 'Dune', year: 2021, guid: 'plex://movie/wrongyear' }]));

    const key = await findPlexRatingKey('Dune', 1984, 'movie', 'token');
    expect(key).toBeNull();
  });

  it('matches regardless of year when no year is provided', async () => {
    mockFetchOnce(discoverResponse([{ title: 'Dune', year: 2021, guid: 'plex://movie/anyyear' }]));

    const key = await findPlexRatingKey('Dune', undefined, 'movie', 'token');
    expect(key).toBe('anyyear');
  });

  it('returns null when no candidate matches title + year', async () => {
    mockFetchOnce(discoverResponse([{ title: 'Something Else Entirely', year: 1999, guid: 'plex://movie/nope' }]));

    const key = await findPlexRatingKey('Dune', 2021, 'movie', 'token');
    expect(key).toBeNull();
  });

  it('extracts the ratingKey as the final path segment of the guid', async () => {
    mockFetchOnce(
      discoverResponse([{ title: 'Dune', year: 2021, guid: 'plex://movie/5d776824abcdef00123456' }]),
    );

    const key = await findPlexRatingKey('Dune', 2021, 'movie', 'token');
    expect(key).toBe('5d776824abcdef00123456');
  });

  it('returns null on a non-OK HTTP response', async () => {
    mockFetchOnce({}, false);
    const key = await findPlexRatingKey('Dune', 2021, 'movie', 'token');
    expect(key).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('network down'));
    const key = await findPlexRatingKey('Dune', 2021, 'movie', 'token');
    expect(key).toBeNull();
  });
});

describe('addToPlexWatchlist', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true on an OK response', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true });
    await expect(addToPlexWatchlist('ratingkey123', 'token')).resolves.toBe(true);
  });

  it('returns false on a non-OK response', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false });
    await expect(addToPlexWatchlist('ratingkey123', 'token')).resolves.toBe(false);
  });

  it('returns false when fetch throws', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('network down'));
    await expect(addToPlexWatchlist('ratingkey123', 'token')).resolves.toBe(false);
  });
});
