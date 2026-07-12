import { getTrendingContent } from '@/lib/tmdb';
import { PosterImage } from '@/components/PosterImage';
import { FilmographyItem } from '@/components/FilmographyItem';

export default async function PersonPage({ params }: { params: { id: string } }) {
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
    const filmography = [
      ...(personData.combined_credits?.cast || []),
      ...(personData.combined_credits?.crew || [])
    ].sort((a: any, b: any) => {
      // Sort by release date or first air date (newest first)
      const dateA = a.release_date || a.first_air_date;
      const dateB = b.release_date || b.first_air_date;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    
    return (
      <div className="min-h-screen bg-[#0E1015] text-[#F3F1EA] p-4">
        <div className="max-w-6xl mx-auto">
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
              <h1 className="text-3xl font-bold mb-4 text-teal-300">{personData.name}</h1>
              
              {personData.biography && (
                <p className="mb-4 text-gray-300">{personData.biography}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {personData.birthday && (
                  <div>
                    <p className="text-gray-400">Birthday</p>
                    <p>{new Date(personData.birthday).toLocaleDateString()}</p>
                  </div>
                )}
                
                {personData.place_of_birth && (
                  <div>
                    <p className="text-gray-400">Place of Birth</p>
                    <p>{personData.place_of_birth}</p>
                  </div>
                )}
                
                {personData.known_for_department && (
                  <div>
                    <p className="text-gray-400">Known For</p>
                    <p>{personData.known_for_department}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Filmography */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-teal-300">Filmography</h2>
            
            {filmography.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filmography.map((item: any) => (
                  <FilmographyItem 
                    key={item.id} 
                    item={item}
                    onClick={() => {
                      // This would open the detail modal in a real implementation
                      // For now, we'll just log to console
                      console.log('Opening detail for:', item.id);
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No filmography data available.</p>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching person details:', error);
    return (
      <div className="min-h-screen bg-[#0E1015] text-[#F3F1EA] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-teal-300">Error</h1>
          <p>Failed to load person details. Please try again later.</p>
        </div>
      </div>
    );
  }
}
