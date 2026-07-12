import { redis } from '@/lib/redis';

export async function getTrendingContent() {
  const cached = await redis.get('tmdb:trending');
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) {
      console.error('TMDB_API_KEY is not set in environment variables');
      return { results: [] };
    }

    const response = await fetch(
      `https://api.themoviedb.org/3/trending/all/week?api_key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    await redis.setex('tmdb:trending', 7200, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error fetching trending content from TMDB:', error);
    return { results: [] };
  }
}
