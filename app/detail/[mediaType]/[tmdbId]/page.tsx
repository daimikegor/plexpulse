import { getMediaDetails } from '@/lib/tmdb';
import { CastSection } from '@/components/CastSection';

/** @type { import('next').Metadata } */
const metadata = {
  title: 'Media Details | PlexPulse'
};

export default async function MediaDetailPage({ params }: { params: { mediaType: string, tmdbId: string } }) {
  const { mediaType, tmdbId } = params;

  if (mediaType !== 'movie' && mediaType !== 'tv') return <div>Invalid media type</div>;
  if (!tmdbId) return <div>No media ID provided</div>;

  // Fetch media details
  const details = await getMediaDetails(mediaType as 'movie' | 'tv', tmdbId);

  if (!details) {
    return <div>Loading...</div>;
  }

  // Extract year from release date or first air date
  const itemYear = details.release_date ? new Date(details.release_date).getFullYear() :
                  details.first_air_date ? new Date(details.first_air_date).getFullYear() : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Poster */}
        <div className="lg:col-span-1">
          {details.poster_path && (
            <img 
              src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
              alt={details.title || details.name}
              className="w-48 rounded-lg mx-auto"
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
                {details.genres.map((g: { name: string }) => g.name).join(', ')}
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

      {/* Cast section using reusable component */}
      {details.credits?.cast && details.credits.cast.length > 0 && (
        <CastSection cast={details.credits.cast} />
      )}
    </div>
  );
}