import { requireAuth } from '@/lib/session';
import { getTrendingContent } from '@/lib/tmdb';
import { PosterImage } from '@/components/PosterImage';
import { FilmographyGrid } from '@/components/FilmographyGrid';

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  const { id: personId } = await params;
  
  try {
    const API_KEY = process.env.TMDB_API_KEY;
    
    if (!API_KEY) {
      throw new Error('TMDB_API_KEY is not set in environment variables');
    }
    
    // Fetch person details with combined credits
    const personResponse = await fetch(
      `https://api.themoviedb.org/3/person/${personId}?api_key=${API_KEY}&append_to_response=combined_credits`
    );
    
    if (!personResponse.ok) {
      throw new Error(`Failed to fetch person details: ${personResponse.status}`);
    }
    
    const personData = await personResponse.json();
    
    // Extract filmography from combined_credits
    let filmography = [
      ...(personData.combined_credits?.cast || []),
      ...(personData.combined_credits?.crew || [])
    ];
    
    // Deduplicate by ID
    const seenIds = new Set();
    filmography = filmography.filter(item => {
      if (seenIds.has(item.id)) {
        return false;
      }
      seenIds.add(item.id);
      return true;
    }).sort((a: any, b: any) => {
      // Sort by release date or first air date (newest first)
      const dateA = a.release_date || a.first_air_date;
      const dateB = b.release_date || b.first_air_date;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    filmography = filmography.filter((item: any) => {
      const genreIds = item.genre_ids || [];
      return !genreIds.includes(10767) && !genreIds.includes(10763);
    });
    
    return (
      <main>
        {/* Person Header */}
        <div className="person-header">
          {personData.profile_path ? (
            <img 
              src={`https://image.tmdb.org/t/p/w500${personData.profile_path}`} 
              alt={personData.name}
              className="person-header__photo"
            />
          ) : (
            <div className="person-header__photo person-header__photo--fallback">
              {personData.name.charAt(0)}
            </div>
          )}
          <div className="person-header__info">
            <h1 className="search-context-heading">{personData.name}</h1>
            <p className="person-header__meta">
              {personData.birthday && `Born ${new
                Date(personData.birthday).toLocaleDateString('en-US', { year: 'numeric',
                month: 'long', day: 'numeric' })}`}
              {personData.place_of_birth && ` · ${personData.place_of_birth}`}
              {personData.known_for_department && ` · Known for ${personData.known_for_department}`}
            </p>
            {personData.biography && (
              <p className="modal-overview">{personData.biography}</p>
            )}
          </div>
        </div>
        
        {/* Filmography */}
        <div>
          <h2 className="search-context-heading">Filmography</h2>
          
          {filmography.length > 0 ? (
            <FilmographyGrid items={filmography} />
          ) : (
            <p>No filmography data available.</p>
          )}
        </div>
      </main>
    );
  } catch (error) {
    console.error('Error fetching person details:', error);
    return (
      <main>
        <div className="text-center">
          <h1 className="search-context-heading">Error</h1>
          <p>Failed to load person details. Please try again later.</p>
        </div>
      </main>
    );
  }
}
