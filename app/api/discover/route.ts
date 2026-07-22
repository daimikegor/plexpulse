import { getDiscoverPage } from '@/lib/tmdb';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS['discover']);
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
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  if (mediaType !== 'movie' && mediaType !== 'tv') {
    return NextResponse.json({ error: 'Invalid mediaType' }, { status: 400 });
  }

  const data = await getDiscoverPage(mediaType, page);
  return NextResponse.json(data);
}
