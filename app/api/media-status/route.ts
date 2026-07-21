import { NextResponse } from 'next/server';
import { getCachedMediaStatus, refreshMediaStatus } from '@/lib/media-status';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS['media-status']);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get('tmdbId');
  const mediaType = searchParams.get('mediaType') as 'movie' | 'tv';
  if (!tmdbId || (mediaType !== 'movie' && mediaType !== 'tv')) {
    return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
  }

  const force = searchParams.get('force');
  let status = force ? null : await getCachedMediaStatus(tmdbId, mediaType);
  if (status === null) {
    status = await refreshMediaStatus(tmdbId, mediaType);
  }
  return NextResponse.json({ tmdbId, mediaType, status });
}
