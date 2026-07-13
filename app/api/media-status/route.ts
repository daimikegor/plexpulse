import { NextResponse } from 'next/server';
import { getCachedMediaStatus, refreshMediaStatus } from '@/lib/media-status';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get('tmdbId');
  const mediaType = searchParams.get('mediaType') as 'movie' | 'tv';
  if (!tmdbId || (mediaType !== 'movie' && mediaType !== 'tv')) {
    return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
  }

  let status = await getCachedMediaStatus(tmdbId, mediaType);
  if (status === null) {
    status = await refreshMediaStatus(tmdbId, mediaType);
  }
  return NextResponse.json({ tmdbId, mediaType, status });
}
