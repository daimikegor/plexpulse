import { NextResponse } from 'next/server';

export async function GET(request: Request) {
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
      .slice(0, 8);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Live search error:', error);
    return NextResponse.json({ results: [] });
  }
}
