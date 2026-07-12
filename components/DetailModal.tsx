'use client';

import { useState, useEffect } from 'react';
import { X, Star, Play } from 'lucide-react';

export function DetailModal({ 
  item, 
  isOpen, 
  onClose 
}: { 
  item: any; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [isClient, setIsClient] = useState(false);
  const [extendedItem, setExtendedItem] = useState<any>(null);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    if (isOpen && item) {
      // Fetch extended details when modal opens
      const fetchExtendedDetails = async () => {
        try {
          const response = await fetch(`/api/tmdb/details?id=${item.id}&mediaType=${item.media_type}`);
          if (response.ok) {
            const data = await response.json();
            setExtendedItem(data);
          }
        } catch (error) {
          console.error('Error fetching extended details:', error);
        }
      };
      
      fetchExtendedDetails();
    }
  }, [isOpen, item]);

  if (!isClient || !isOpen) return null;

  const runtime = extendedItem?.runtime || item.runtime;
  const genres = extendedItem?.genres?.map((g: any) => g.name).join(', ') || 
                 item.genres?.map((g: any) => g.name).join(', ') || '';
  
  const runtimeText = runtime ? `${Math.floor(runtime / 60)}h ${runtime % 60}m` : '';
  const displayText = runtimeText && genres ? `${runtimeText} • ${genres}` : 
                     runtimeText || genres || '';

  // Find the first YouTube trailer
  const trailer = extendedItem?.videos?.results?.find(
    (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div 
        className="relative bg-[#0E1015] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-[#1A1D25] rounded-full flex items-center justify-center text-teal-400 hover:bg-[#2A2D35] transition-colors z-10"
        >
          <X size={20} />
        </button>
        
        <div className="relative">
          {showTrailer && trailer ? (
            // Trailer view
            <div className="relative h-[300px] w-full overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`${item.title || item.name} Trailer`}
              ></iframe>
              <button 
                onClick={() => setShowTrailer(false)}
                className="absolute top-4 left-4 w-8 h-8 bg-[#1A1D25] rounded-full flex items-center justify-center text-teal-400 hover:bg-[#2A2D35] transition-colors z-10"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            // Normal view
            <>
              {/* Backdrop banner */}
              {item.backdrop_path && (
                <div className="relative h-[250px] w-full overflow-hidden hidden md:block">
                  <img 
                    src={`https://image.tmdb.org/t/p/w1280${item.backdrop_path}`} 
                    alt={item.title || item.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0E1015] to-transparent"></div>
                </div>
              )}
              
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <img 
                      src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} 
                      alt={item.title || item.name}
                      className="w-full rounded-lg shadow-lg"
                    />
                    {trailer && (
                      <div className="mt-4 flex justify-center">
                        <button 
                          onClick={() => setShowTrailer(true)}
                          className="bg-[#1A1D25] hover:bg-[#2A2D35] text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Play size={16} />
                          Play Trailer
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="md:w-2/3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Available</span>
                      <h2 className="text-2xl font-bold text-teal-300">
                        {item.title || item.name}
                        {item.release_date || item.first_air_date ? (
                          <span className="text-gray-400 text-lg ml-2">
                            ({new Date(item.release_date || item.first_air_date).getFullYear()})
                          </span>
                        ) : null}
                      </h2>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="text-yellow-400 fill-current" size={20} />
                      <span>{item.vote_average?.toFixed(1)}/10</span>
                    </div>
                    
                    {displayText && (
                      <p className="mb-4 text-gray-300">{displayText}</p>
                    )}
                    
                    <p className="mb-6 text-gray-300">{item.overview}</p>
                    
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => console.log('Request clicked for:', item.id)}
                        className="bg-[#E5A00D] hover:bg-[#c98d0b] text-white font-bold py-2 px-6 rounded-lg transition-colors uppercase"
                      >
                        Request
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
