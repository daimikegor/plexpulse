import { NextResponse } from 'next/server';
import { getTrendingPage, getPopularPage, getTopRatedPage, getUpcomingPage } from '@/lib/tmdb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const page = parseInt(searchParams.get('page') || '1', 10);

  let data;
  switch (type) {
    case 'trending': data = await getTrendingPage(page); break;
    case 'popular': data = await getPopularPage(page); break;
    case 'top-rated': data = await getTopRatedPage(page); break;
    case 'upcoming': data = await getUpcomingPage(page); break;
    default: return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  return NextResponse.json(data);
}
