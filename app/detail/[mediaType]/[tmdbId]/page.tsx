/** @type { import('next').Metadata } */
const metadata = {
  title: 'Media Details | PlexPulse'
};
type Genre = { id: number; name: string; };  
type CastMember = { id: string; name: string; character: string; profile_path?: string; };   
interface MediaDetails {
  id: number;
  title?: string;
  name?: string;
  backdrop_path?: string;
  poster_path?: string;
  runtime?: number;
  episode_run_time?: number[];
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  tagline?: string;
  overview?: string;
  original_language: string;
  genres?: Genre[];
  credits?: { cast: CastMember[]; };
}

import { getMediaDetails } from '@/lib/tmdb';

export default async function MediaDetailPage({ params }: { params: { mediaType: string, tmdbId: string } }) {
  const { mediaType, tmdbId } = params;

  if (mediaType !== 'movie' && mediaType !== 'tv') return <div>Invalid media type</div>;
  if (!tmdbId) return <div>No media ID provided</div>;

  // Fetch media details
  const details = await getMediaDetails(mediaType as 'movie' | 'tv', tmdbId);
  
  if (!details) {
    return <div>Media not found</div>;
  }

  // Extract year from release date or first air date
  const itemYear = details.release_date ? new Date(details.release_date).getFullYear() :
                  details.first_air_date ? new Date(details.first_air_date).getFullYear() : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Backdrop banner */}
      {details.backdrop_path && (
        <div className="relative h-64 mb-4 rounded-lg overflow-hidden">
          <img 
            src={`https://image.tmdb.org/t/p/w1280${details.backdrop_path}`}
            alt={`${details.title || details.name} backdrop`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Poster */}
        <div className="lg:col-span-1">
          {details.poster_path && (
            <img 
              src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
              alt={details.title || details.name}
              className="w-full rounded-lg"
            />
          )}
        </div>

        {/* Main content */}
        <div className="lg:col-span-2">
          <p className="text-sm text-gray-400 mb-2">
            {mediaType === 'movie' ? 'FILM' : 'SERIES'} · {itemYear} · {details.runtime || details.episode_run_time?.[0]} MIN · ★
            {details.vote_average?.toFixed(1)}/10
          </p>
          
          <h1 className="text-3xl font-bold text-white mb-2">{details.title || details.name}</h1>
          
          {details.tagline && (
            <p className="text-lg text-gray-300 italic mb-4">"{details.tagline}"</p>
          )}

          {/* Genres */}
          {details.genres && details.genres.length > 0 && (
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-white mb-2">GENRES</h2>
              <p className="text-blue-400">
                {details.genres.map((g: Genre) => g.name).join(', ')}
              </p>
            </div>
          )}

          {/* Overview */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white mb-2">OVERVIEW</h2>
            <p className="text-gray-300 leading-relaxed">{details.overview}</p>
          </div>

          {/* Meta facts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <span className="inline-block bg-gray-800 px-3 py-1 rounded text-xs font-mono tracking-wider">
                {(details.release_date || details.first_air_date) && 
                new Date(details.release_date || details.first_air_date) <= new Date() 
                  ? 'RELEASED' : 'UPCOMING'}
              </span>
            </div>
            <div>
              <span className="inline-block bg-gray-800 px-3 py-1 rounded text-xs font-mono tracking-wider">
                ORIGINAL LANGUAGE: {details.original_language.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Placeholder for trailer button */}
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 mb-6">
            ▶️ Play Trailer
          </button>

          {/* Placeholder for request button */}
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-400 font-semibold mb-6">
            ✓ Request
          </button>
        </div>
      </div>

      {/* Cast section */}
      {details.credits?.cast && details.credits.cast.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">CAST</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {details.credits.cast.slice(0, 10).map((actor: CastMember) => (
              <button key={actor.id} className="text-left hover-opacity">
                <div className="bg-gray-800 rounded-lg p-3 aspect-square mb-2 flex items-center justify-center">
                  {actor.profile_path ? (
                    <img 
                      src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                      alt={actor.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-600 rounded flex items-center justify-center text-white font-bold">
                      {actor.name.charAt(0)}
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-white truncate" title={actor.name}>{actor.name}</h3>
                <p className="text-sm text-gray-400 truncate" title={actor.character}>{actor.character}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}