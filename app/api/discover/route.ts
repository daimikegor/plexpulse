import { getDiscoverPage } from '@/lib/tmdb';
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

  const { searchParams } = new URL(request.url);
  const mediaType = searchParams.get('mediaType') as 'movie' | 'tv';
  const page = parseInt(searchParams.get('page') || '1', 10);

  if (mediaType !== 'movie' && mediaType !== 'tv') {
    return NextResponse.json({ error: 'Invalid mediaType' }, { status: 400 });
  }

  const data = await getDiscoverPage(mediaType, page);
  return NextResponse.json(data);
}
