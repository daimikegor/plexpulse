import { NextResponse } from 'next/server';
import { checkSonarrForShow } from '@/lib/sonarr';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get('tmdbId');
  if (!tmdbId) {
    return NextResponse.json({ error: 'Missing tmdbId parameter' }, { status: 400 });
  }
  const found = await checkSonarrForShow(tmdbId);
  return NextResponse.json({ tmdbId, foundInSonarr: found });
}
