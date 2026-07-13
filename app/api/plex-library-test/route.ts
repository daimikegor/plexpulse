import { NextResponse } from 'next/server';
import { checkPlexLibrary } from '@/lib/plex-library';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get('tmdbId');
  const mediaType = searchParams.get('mediaType') as 'movie' | 'tv';
  if (!tmdbId || (mediaType !== 'movie' && mediaType !== 'tv')) {
    return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
  }
  const found = await checkPlexLibrary(tmdbId, mediaType);
  return NextResponse.json({ tmdbId, mediaType, foundInPlexLibrary: found });
}
