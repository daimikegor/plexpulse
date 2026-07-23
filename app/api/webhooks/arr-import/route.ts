import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { refreshMediaStatus, markMediaAvailable } from '@/lib/media-status';
import { getTmdbIdFromTvdb } from '@/lib/tmdb';
import { checkPlexLibraryLive } from '@/lib/plex-library';

// Bounded retry for the live Plex check: Radarr/Sonarr reporting an import as
// done doesn't mean Plex has scanned the file in yet. Immediate check, then
// two short backoffs — never blocks the webhook's response. If Plex still
// hasn't picked it up within this window, status stays whatever
// refreshMediaStatus already set (typically 'requested') until the 24h scan
// or a manual rescan catches it.
const LIVE_CHECK_DELAYS_MS = [0, 15_000, 45_000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkAvailableWithRetry(tmdbId: string, mediaType: 'movie' | 'tv'): Promise<void> {
  for (const delay of LIVE_CHECK_DELAYS_MS) {
    if (delay > 0) await sleep(delay);
    try {
      if (await checkPlexLibraryLive(tmdbId, mediaType)) {
        await markMediaAvailable(tmdbId, mediaType);
        return;
      }
    } catch (err) {
      console.error('[arr-import webhook] live Plex check failed:', err);
    }
  }
}

async function handleImport(tmdbId: string, mediaType: 'movie' | 'tv'): Promise<void> {
  await refreshMediaStatus(tmdbId, mediaType).catch((err) =>
    console.error(`[arr-import webhook] refreshMediaStatus (${mediaType}) failed:`, err),
  );
  await checkAvailableWithRetry(tmdbId, mediaType);
}

export async function POST(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS['arr-import']);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  const secret = process.env.ARR_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[arr-import webhook] ARR_WEBHOOK_SECRET is not set — rejecting all deliveries.');
    return NextResponse.json({ error: 'Not configured' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get('token') !== secret) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const eventType = body?.eventType;

  // Only act on import/upgrade completion. Everything else (Grab, Test, Rename,
  // health events, etc.) gets a 200 no-op so Radarr/Sonarr's Connect UI shows the
  // webhook as healthy rather than failing.
  if (eventType !== 'Download') {
    return NextResponse.json({ ok: true, ignored: eventType ?? 'unknown' });
  }

  if (body.movie?.tmdbId != null) {
    const tmdbId = String(body.movie.tmdbId);
    handleImport(tmdbId, 'movie').catch((err) =>
      console.error('[arr-import webhook] handleImport (movie) failed:', err),
    );
  } else if (body.series?.tvdbId != null) {
    const tvdbId = String(body.series.tvdbId);
    getTmdbIdFromTvdb(tvdbId)
      .then((tmdbId) => {
        if (!tmdbId) {
          console.warn(`[arr-import webhook] Could not resolve TMDB id for TVDB id ${tvdbId}`);
          return;
        }
        return handleImport(tmdbId, 'tv');
      })
      .catch((err) => console.error('[arr-import webhook] handleImport (tv) failed:', err));
  } else {
    console.warn('[arr-import webhook] Download event with neither movie nor series field:', body);
  }

  return NextResponse.json({ ok: true });
}
