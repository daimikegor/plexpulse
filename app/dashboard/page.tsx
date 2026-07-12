import { requireAuth } from '@/lib/session';
import { getTrendingContent, getPopularContent, getTopRatedContent, getUpcomingContent, getMovieGenresWithBackdrops, getTVGenresWithBackdrops } from '@/lib/tmdb';
import { TrendingSection } from '@/components/TrendingSection';
import { GenreRow } from '@/components/GenreRow';

export default async function Dashboard() {
  const session = await requireAuth();
  
  const [trendingData, popularData, topRatedData, upcomingData, movieGenres, tvGenres] = await Promise.all([
    getTrendingContent(),
    getPopularContent(),
    getTopRatedContent(),
    getUpcomingContent(),
    getMovieGenresWithBackdrops(),
    getTVGenresWithBackdrops()
  ]);
  
  return (
    <main>
      <TrendingSection trendingData={trendingData} />
      <GenreRow genres={movieGenres.genres} mediaType="movie" heading="Movie Genres" />
      <TrendingSection trendingData={popularData} heading="Popular" rowId="popular-row" />
      <TrendingSection trendingData={topRatedData} heading="Top Rated" rowId="top-rated-row" />
      <GenreRow genres={tvGenres.genres} mediaType="tv" heading="Series Genres" />
      <TrendingSection trendingData={upcomingData} heading="Upcoming & New" rowId="upcoming-row" />
    </main>
  );
}
