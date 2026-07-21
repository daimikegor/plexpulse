import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS['search-live']);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) {
      return NextResponse.json({ results: [] });
    }
    const response = await fetch(
      `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=1`
    );
    if (!response.ok) {
      return NextResponse.json({ results: [] });
    }
    const data = await response.json();
    const results = (data.results || [])
      .filter((item: any) => ['movie', 'tv', 'person'].includes(item.media_type))
      .slice(0, 20);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Live search error:', error);
    return NextResponse.json({ results: [] });
  }
}
