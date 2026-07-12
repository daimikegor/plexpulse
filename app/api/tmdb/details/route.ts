import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const mediaType = searchParams.get('mediaType');

  if (!id || !mediaType) {
    return NextResponse.json({ error: 'Missing id or mediaType parameter' }, { status: 400 });
  }

  try {
    const API_KEY = process.env.TMDB_API_KEY;
    
    if (!API_KEY) {
      return NextResponse.json({ error: 'TMDB_API_KEY is not set' }, { status: 500 });
    }
    
    const endpoint = mediaType === 'movie' 
      ? `https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&append_to_response=genres`
      : `https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&append_to_response=genres`;
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching TMDB details:', error);
    return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 });
  }
}
