import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { getGenreContentPage } from '@/lib/tmdb';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS['genre-content']);
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
  const mediaType = searchParams.get('mediaType') as 'movie' | 'tv';
  const genreId = searchParams.get('genreId');
  const page = parseInt(searchParams.get('page') || '1', 10);

  if ((mediaType !== 'movie' && mediaType !== 'tv') || !genreId) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const data = await getGenreContentPage(mediaType, genreId, page);
  return NextResponse.json(data);
}
