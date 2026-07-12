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

export async function getTrendingMovies() {
  const cached = await redis.get('tmdb:trending:movies');
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
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    await redis.setex('tmdb:trending:movies', 7200, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error fetching trending movies from TMDB:', error);
    return { results: [] };
  }
}

export async function getTrendingSeries() {
  const cached = await redis.get('tmdb:trending:series');
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
      `https://api.themoviedb.org/3/trending/tv/week?api_key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    await redis.setex('tmdb:trending:series', 7200, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error fetching trending series from TMDB:', error);
    return { results: [] };
  }
}
