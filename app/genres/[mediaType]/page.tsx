import { requireAuth } from '@/lib/session';
import { getMovieGenresWithBackdrops, getTVGenresWithBackdrops } from '@/lib/tmdb';
import { GenreTile } from '@/components/GenreTile';

export default async function GenresPage({
  params
}: {
  params: { mediaType: string };
}) {
  await requireAuth();
  
  let data;
  let heading = "Not Found";
  
  if (params.mediaType === 'movie') {
    data = await getMovieGenresWithBackdrops();
    heading = "Movie Genres";
  } else if (params.mediaType === 'tv') {
    data = await getTVGenresWithBackdrops();
    heading = "Series Genres";
  } else {
    data = { genres: [] };
  }
  
  return (
    <main>
      <h1 className="search-context-heading">{heading}</h1>
      <div className="genre-tile-grid">
        {data.genres.map((genre: any) => (
          <GenreTile key={genre.id} genre={genre} mediaType={params.mediaType as 'movie' | 'tv'} />
        ))}
      </div>
    </main>
  );
}
