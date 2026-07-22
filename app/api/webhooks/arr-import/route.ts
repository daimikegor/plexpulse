import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { refreshMediaStatus } from '@/lib/media-status';
import { getTmdbIdFromTvdb } from '@/lib/tmdb';

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
    refreshMediaStatus(tmdbId, 'movie').catch((err) =>
      console.error('[arr-import webhook] refreshMediaStatus (movie) failed:', err),
    );
  } else if (body.series?.tvdbId != null) {
    const tvdbId = String(body.series.tvdbId);
    getTmdbIdFromTvdb(tvdbId)
      .then((tmdbId) => {
        if (!tmdbId) {
          console.warn(`[arr-import webhook] Could not resolve TMDB id for TVDB id ${tvdbId}`);
          return;
        }
        return refreshMediaStatus(tmdbId, 'tv');
      })
      .catch((err) => console.error('[arr-import webhook] refreshMediaStatus (tv) failed:', err));
  } else {
    console.warn('[arr-import webhook] Download event with neither movie nor series field:', body);
  }

  return NextResponse.json({ ok: true });
}
