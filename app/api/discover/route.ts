import { getDiscoverPage } from '@/lib/tmdb';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mediaType = searchParams.get('mediaType') as 'movie' | 'tv';
  const page = parseInt(searchParams.get('page') || '1', 10);

  if (mediaType !== 'movie' && mediaType !== 'tv') {
    return NextResponse.json({ error: 'Invalid mediaType' }, { status: 400 });
  }

  const data = await getDiscoverPage(mediaType, page);
  return NextResponse.json(data);
}
