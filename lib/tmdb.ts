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

export async function getPopularContent() {
  const cached = await redis.get('tmdb:popular');
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) {
      console.error('TMDB_API_KEY is not set in environment variables');
      return { results: [] };
    }

    const [movieResponse, tvResponse] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}`),
      fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}`)
    ]);

    if (!movieResponse.ok || !tvResponse.ok) {
      throw new Error(`TMDB API error: ${movieResponse.status} ${tvResponse.status}`);
    }

    const movieData = await movieResponse.json();
    const tvData = await tvResponse.json();

    // Add media_type to each item
    const moviesWithMediaType = movieData.results.map((item: any) => ({
      ...item,
      media_type: 'movie'
    }));

    const tvsWithMediaType = tvData.results.map((item: any) => ({
      ...item,
      media_type: 'tv'
    }));

    // Merge and sort by popularity
    const mergedResults = [...moviesWithMediaType, ...tvsWithMediaType]
      .sort((a: any, b: any) => b.popularity - a.popularity);

    const data = { results: mergedResults };
    await redis.setex('tmdb:popular', 7200, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error fetching popular content from TMDB:', error);
    return { results: [] };
  }
}

export async function getTopRatedContent() {
  const cached = await redis.get('tmdb:top_rated');
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) {
      console.error('TMDB_API_KEY is not set in environment variables');
      return { results: [] };
    }

    const [movieResponse, tvResponse] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}`),
      fetch(`https://api.themoviedb.org/3/tv/top_rated?api_key=${API_KEY}`)
    ]);

    if (!movieResponse.ok || !tvResponse.ok) {
      throw new Error(`TMDB API error: ${movieResponse.status} ${tvResponse.status}`);
    }

    const movieData = await movieResponse.json();
    const tvData = await tvResponse.json();

    // Add media_type to each item
    const moviesWithMediaType = movieData.results.map((item: any) => ({
      ...item,
      media_type: 'movie'
    }));

    const tvsWithMediaType = tvData.results.map((item: any) => ({
      ...item,
      media_type: 'tv'
    }));

    // Merge and sort by rating
    const mergedResults = [...moviesWithMediaType, ...tvsWithMediaType]
      .sort((a: any, b: any) => b.vote_average - a.vote_average);

    const data = { results: mergedResults };
    await redis.setex('tmdb:top_rated', 7200, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error fetching top rated content from TMDB:', error);
    return { results: [] };
  }
}

export async function getUpcomingContent() {
  const cached = await redis.get('tmdb:upcoming');
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) {
      console.error('TMDB_API_KEY is not set in environment variables');
      return { results: [] };
    }

    const [movieResponse, tvResponse] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${API_KEY}`),
      fetch(`https://api.themoviedb.org/3/tv/on_the_air?api_key=${API_KEY}`)
    ]);

    if (!movieResponse.ok || !tvResponse.ok) {
      throw new Error(`TMDB API error: ${movieResponse.status} ${tvResponse.status}`);
    }

    const movieData = await movieResponse.json();
    const tvData = await tvResponse.json();

    // Add media_type to each item
    const moviesWithMediaType = movieData.results.map((item: any) => ({
      ...item,
      media_type: 'movie'
    }));

    const tvsWithMediaType = tvData.results.map((item: any) => ({
      ...item,
      media_type: 'tv'
    }));

    // Filter movies to only include those within the last 30 days through next 90 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const ninetyDaysFromNow = new Date(now);
    ninetyDaysFromNow.setDate(now.getDate() + 90);
    
    const filteredMovies = moviesWithMediaType.filter((item: any) => {
      if (!item.release_date) return false;
      const releaseDate = new Date(item.release_date);
      return releaseDate >= thirtyDaysAgo && releaseDate <= ninetyDaysFromNow;
    });

    // Filter TV shows to only include those within the last 30 days through next 90 days
    const filteredTV = tvsWithMediaType.filter((item: any) => {
      if (!item.first_air_date) return false;
      const firstAirDate = new Date(item.first_air_date);
      return firstAirDate >= thirtyDaysAgo && firstAirDate <= ninetyDaysFromNow;
    });

    // Merge and sort by release date
    const mergedResults = [...filteredMovies, ...filteredTV]
      .sort((a: any, b: any) => {
        const dateA = a.release_date || a.first_air_date;
        const dateB = b.release_date || b.first_air_date;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });

    const data = { results: mergedResults };
    await redis.setex('tmdb:upcoming', 7200, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error fetching upcoming content from TMDB:', error);
    return { results: [] };
  }
}
