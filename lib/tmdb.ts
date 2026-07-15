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

export async function getMovieGenresWithBackdrops() {
  const cached = await redis.get('tmdb:genres:movie');
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) {
      console.error('TMDB_API_KEY is not set in environment variables');
      return { genres: [] };
    }

    // Get the genre list
    const genreResponse = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}`);
    
    if (!genreResponse.ok) {
      throw new Error(`TMDB API error: ${genreResponse.status} ${genreResponse.statusText}`);
    }

    const genreData = await genreResponse.json();
    const genres = genreData.genres || [];

    // Fetch backdrop for each genre in parallel
    const genrePromises = genres.map(async (genre: any) => {
      try {
        const discoverResponse = await fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genre.id}&sort_by=popularity.desc`
        );
        
        if (!discoverResponse.ok) {
          throw new Error(`TMDB API error: ${discoverResponse.status} ${discoverResponse.statusText}`);
        }

        const discoverData = await discoverResponse.json();
        const backdrop_path = discoverData.results && discoverData.results[0] && discoverData.results[0].backdrop_path || null;
        
        return {
          id: genre.id,
          name: genre.name,
          backdrop_path
        };
      } catch (error) {
        // If one genre fails, return it with null backdrop_path
        console.error(`Error fetching backdrop for movie genre ${genre.id}:`, error);
        return {
          id: genre.id,
          name: genre.name,
          backdrop_path: null
        };
      }
    });

    const genresWithBackdrops = await Promise.all(genrePromises);
    
    const data = { genres: genresWithBackdrops };
    await redis.setex('tmdb:genres:movie', 86400, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error fetching movie genres with backdrops from TMDB:', error);
    return { genres: [] };
  }
}

export async function getTVGenresWithBackdrops() {
  const cached = await redis.get('tmdb:genres:tv');
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) {
      console.error('TMDB_API_KEY is not set in environment variables');
      return { genres: [] };
    }

    // Get the genre list
    const genreResponse = await fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${API_KEY}`);
    
    if (!genreResponse.ok) {
      throw new Error(`TMDB API error: ${genreResponse.status} ${genreResponse.statusText}`);
    }

    const genreData = await genreResponse.json();
    const genres = genreData.genres || [];

    // Fetch backdrop for each genre in parallel
    const genrePromises = genres.map(async (genre: any) => {
      try {
        const discoverResponse = await fetch(
          `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&with_genres=${genre.id}&sort_by=popularity.desc`
        );
        
        if (!discoverResponse.ok) {
          throw new Error(`TMDB API error: ${discoverResponse.status} ${discoverResponse.statusText}`);
        }

        const discoverData = await discoverResponse.json();
        const backdrop_path = discoverData.results && discoverData.results[0] && discoverData.results[0].backdrop_path || null;
        
        return {
          id: genre.id,
          name: genre.name,
          backdrop_path
        };
      } catch (error) {
        // If one genre fails, return it with null backdrop_path
        console.error(`Error fetching backdrop for TV genre ${genre.id}:`, error);
        return {
          id: genre.id,
          name: genre.name,
          backdrop_path: null
        };
      }
    });

    const genresWithBackdrops = await Promise.all(genrePromises);
    
    const data = { genres: genresWithBackdrops };
    await redis.setex('tmdb:genres:tv', 86400, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error fetching TV genres with backdrops from TMDB:', error);
    return { genres: [] };
  }
}

export async function getGenreContent(mediaType: 'movie' | 'tv', genreId: string) {
  const cached = await redis.get(`tmdb:genre:${mediaType}:${genreId}`);
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
      `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Add media_type to each result item
    const resultsWithMediaType = data.results.map((item: any) => ({
      ...item,
      media_type: mediaType
    }));

    const finalData = { results: resultsWithMediaType };
    await redis.setex(`tmdb:genre:${mediaType}:${genreId}`, 7200, JSON.stringify(finalData));
    return finalData;
  } catch (error) {
    console.error(`Error fetching ${mediaType} genre content from TMDB:`, error);
    return { results: [] };
  }
}

export async function getDiscoverPage(mediaType: 'movie' | 'tv', page: number) {
  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) {
      console.error('TMDB_API_KEY is not set in environment variables');
      return { results: [], page: 1, total_pages: 1 };
    }
    const response = await fetch(
      `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${API_KEY}&sort_by=popularity.desc&page=${page}`
    );
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const resultsWithMediaType = data.results.map((item: any) => ({
      ...item,
      media_type: mediaType
    }));
    return {
      results: resultsWithMediaType,
      page: data.page,
      total_pages: data.total_pages
    };
  } catch (error) {
    console.error(`Error fetching discover page for ${mediaType}:`, error);
    return { results: [], page: 1, total_pages: 1 };
  }
}

export async function getTrendingPage(page: number) {
  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) return { results: [], page: 1, total_pages: 1 };
    const response = await fetch(
      `https://api.themoviedb.org/3/trending/all/week?api_key=${API_KEY}&page=${page}`
    );
    if (!response.ok) throw new Error(`TMDB API error: ${response.status}`);
    const data = await response.json();
    return { results: data.results, page: data.page, total_pages: data.total_pages };
  } catch (error) {
    console.error('Error fetching trending page:', error);
    return { results: [], page: 1, total_pages: 1 };
  }
}

export async function getPopularPage(page: number) {
  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) return { results: [], page: 1, total_pages: 1 };
    const [movieRes, tvRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&page=${page}`),
      fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&page=${page}`)
    ]);
    if (!movieRes.ok || !tvRes.ok) throw new Error('TMDB API error');
    const movieData = await movieRes.json();
    const tvData = await tvRes.json();
    const movies = movieData.results.map((item: any) => ({ ...item, media_type: 'movie' }));
    const tvs = tvData.results.map((item: any) => ({ ...item, media_type: 'tv' }));
    const merged = [...movies, ...tvs].sort((a, b) => b.popularity - a.popularity);
    return {
      results: merged,
      page,
      total_pages: Math.min(movieData.total_pages, tvData.total_pages)
    };
  } catch (error) {
    console.error('Error fetching popular page:', error);
    return { results: [], page: 1, total_pages: 1 };
  }
}

export async function getTopRatedPage(page: number) {
  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) return { results: [], page: 1, total_pages: 1 };
    const [movieRes, tvRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}&page=${page}`),
      fetch(`https://api.themoviedb.org/3/tv/top_rated?api_key=${API_KEY}&page=${page}`)
    ]);
    if (!movieRes.ok || !tvRes.ok) throw new Error('TMDB API error');
    const movieData = await movieRes.json();
    const tvData = await tvRes.json();
    const movies = movieData.results.map((item: any) => ({ ...item, media_type: 'movie' }));
    const tvs = tvData.results.map((item: any) => ({ ...item, media_type: 'tv' }));
    const merged = [...movies, ...tvs].sort((a, b) => b.popularity - a.popularity);
    return {
      results: merged,
      page,
      total_pages: Math.min(movieData.total_pages, tvData.total_pages)
    };
  } catch (error) {
    console.error('Error fetching top rated page:', error);
    return { results: [], page: 1, total_pages: 1 };
  }
}

export async function getUpcomingPage(page: number) {
  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) return { results: [], page: 1, total_pages: 1 };
    const [movieRes, tvRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${API_KEY}&page=${page}`),
      fetch(`https://api.themoviedb.org/3/tv/on_the_air?api_key=${API_KEY}&page=${page}`)
    ]);
    if (!movieRes.ok || !tvRes.ok) throw new Error('TMDB API error');
    const movieData = await movieRes.json();
    const tvData = await tvRes.json();
    const now = new Date();
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
    const ninetyDaysFromNow = new Date(now); ninetyDaysFromNow.setDate(now.getDate() + 90);
    const movies = movieData.results
      .map((item: any) => ({ ...item, media_type: 'movie' }))
      .filter((item: any) => item.release_date && new Date(item.release_date) >= thirtyDaysAgo && new Date(item.release_date) <= ninetyDaysFromNow);
    const tvs = tvData.results
      .map((item: any) => ({ ...item, media_type: 'tv' }))
      .filter((item: any) => item.first_air_date && new Date(item.first_air_date) >= thirtyDaysAgo && new Date(item.first_air_date) <= ninetyDaysFromNow);
    const merged = [...movies, ...tvs].sort((a, b) => {
      const dateA = a.release_date || a.first_air_date;
      const dateB = b.release_date || b.first_air_date;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
    return {
      results: merged,
      page,
      total_pages: Math.min(movieData.total_pages, tvData.total_pages)
    };
  } catch (error) {
    console.error('Error fetching upcoming page:', error);
    return { results: [], page: 1, total_pages: 1 };
  }
}

export async function getGenreContentPage(mediaType: 'movie' | 'tv', genreId: string, page: number) {
  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) return { results: [], page: 1, total_pages: 1 };
    const response = await fetch(
      `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`
    );
    if (!response.ok) throw new Error(`TMDB API error: ${response.status}`);
    const data = await response.json();
    const resultsWithMediaType = data.results.map((item: any) => ({
      ...item,
      media_type: mediaType
    }));
    return { results: resultsWithMediaType, page: data.page, total_pages: data.total_pages };
  } catch (error) {
    console.error('Error fetching genre content page:', error);
    return { results: [], page: 1, total_pages: 1 };
  }
}

export async function getTvdbIdFromTmdb(tmdbId: string): Promise<string | null> {
  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) return null;
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}/external_ids?api_key=${API_KEY}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.tvdb_id ? String(data.tvdb_id) : null;
  } catch (error) {
    console.error('Error fetching TVDB id from TMDB:', error);
    return null;
  }
}

export async function getMediaDetails(mediaType: 'movie' | 'tv', tmdbId: string) {
  const cacheKey = `tmdb:detail:${mediaType}:${tmdbId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const API_KEY = process.env.TMDB_API_KEY;
    if (!API_KEY) {
      console.error('TMDB_API_KEY is not set in environment variables');
      return null;
    }

    const endpoint = mediaType === 'movie'
      ? `https://api.themoviedb.org/3/movie/${tmdbId}?append_to_response=genres,videos,credits`
      : `https://api.themoviedb.org/3/tv/${tmdbId}?append_to_response=genres,videos,credits`;

    const response = await fetch(`${endpoint}&api_key=${API_KEY}`);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    await redis.setex(cacheKey, 7200, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error fetching media details from TMDB:', error);
    return null;
  }
}
