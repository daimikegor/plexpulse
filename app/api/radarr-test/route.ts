import { NextResponse } from 'next/server';
import { checkRadarrForMovie } from '@/lib/radarr';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get('tmdbId');
  if (!tmdbId) {
    return NextResponse.json({ error: 'Missing tmdbId parameter' }, { status: 400 });
  }
  const found = await checkRadarrForMovie(tmdbId);
  return NextResponse.json({ tmdbId, foundInRadarr: found });
}
