import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { getTrendingPage, getPopularPage, getTopRatedPage, getUpcomingPage } from '@/lib/tmdb';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS['category']);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  const sessionToken = (await cookies()).get('session_token')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!(await getSession(sessionToken))) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

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
