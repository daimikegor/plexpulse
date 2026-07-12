'use client';

import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';

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
          {/* Backdrop banner */}
          {item.backdrop_path && (
            <div className="relative h-64 md:h-80 w-full overflow-hidden">
              <img 
                src={`https://image.tmdb.org/t/p/w1280${item.backdrop_path}`} 
                alt={item.title || item.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0E1015] to-transparent"></div>
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
              </div>
              
              <div className="md:w-2/3">
                <h2 className="text-2xl font-bold mb-2 text-teal-300">{item.title || item.name}</h2>
                
                <div className="flex items-center gap-2 mb-4">
                  <Star className="text-yellow-400 fill-current" size={20} />
                  <span>{item.vote_average?.toFixed(1)}/10</span>
                </div>
                
                {displayText && (
                  <p className="mb-4 text-gray-300">{displayText}</p>
                )}
                
                <p className="mb-6 text-gray-300">{item.overview}</p>
                
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
      </div>
    </div>
  );
}
