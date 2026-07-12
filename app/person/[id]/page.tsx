import { requireAuth } from '@/lib/session';
import { getTrendingContent } from '@/lib/tmdb';
import { PosterImage } from '@/components/PosterImage';
import { FilmographyGrid } from '@/components/FilmographyGrid';

export default async function PersonPage({ params }: { params: { id: string } }) {
  await requireAuth();
  
  const personId = params.id;
  
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
    
    return (
      <main>
        {/* Person Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="md:w-1/3">
            {personData.profile_path ? (
              <img 
                src={`https://image.tmdb.org/t/p/w500${personData.profile_path}`} 
                alt={personData.name}
                className="w-full rounded-lg shadow-lg"
              />
            ) : (
              <div className="bg-gray-700 rounded-lg w-full h-96 flex items-center justify-center">
                <span className="text-gray-400">No Image</span>
              </div>
            )}
          </div>
          
          <div className="md:w-2/3">
            <h1 className="search-context-heading">{personData.name}</h1>
            
            {personData.biography && (
              <p>{personData.biography}</p>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              {personData.birthday && (
                <div>
                  <p>Birthday</p>
                  <p>{new Date(personData.birthday).toLocaleDateString()}</p>
                </div>
              )}
              
              {personData.place_of_birth && (
                <div>
                  <p>Place of Birth</p>
                  <p>{personData.place_of_birth}</p>
                </div>
              )}
              
              {personData.known_for_department && (
                <div>
                  <p>Known For</p>
                  <p>{personData.known_for_department}</p>
                </div>
              )}
            </div>
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
