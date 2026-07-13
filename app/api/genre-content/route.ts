import { NextResponse } from 'next/server';
import { getGenreContentPage } from '@/lib/tmdb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mediaType = searchParams.get('mediaType') as 'movie' | 'tv';
  const genreId = searchParams.get('genreId');
  const page = parseInt(searchParams.get('page') || '1', 10);

  if ((mediaType !== 'movie' && mediaType !== 'tv') || !genreId) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const data = await getGenreContentPage(mediaType, genreId, page);
  return NextResponse.json(data);
}
