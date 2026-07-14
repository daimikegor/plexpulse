'use client';

import { useState, useEffect } from 'react';
import { X, Play } from 'lucide-react';

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
  const [requestStatus, setRequestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [liveStatus, setLiveStatus] = useState<'none' | 'requested' | 'available' | null>(null);

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

  useEffect(() => {
    if (!isOpen || !item) return;
    const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
    fetch(`/api/media-status?tmdbId=${item.id}&mediaType=${mediaType}`)
      .then(res => res.json())
      .then(data => setLiveStatus(data.status))
      .catch(() => setLiveStatus(null));
  }, [isOpen, item]);

  const effectiveState = liveStatus === 'available' ? 'available'
    : (liveStatus === 'requested' || requestStatus === 'success') ? 'requested'
    : requestStatus === 'loading' ? 'loading'
    : requestStatus === 'error' ? 'error'
    : 'idle';

  const buttonText = effectiveState === 'available' ? 'Available'
    : effectiveState === 'requested' ? 'Requested'
    : effectiveState === 'loading' ? 'Requesting...'
    : effectiveState === 'error' ? 'Not Found'
    : 'Request';

  if (!isClient || !isOpen) return null;

  const runtime = extendedItem?.runtime || item.runtime;
  const genres = extendedItem?.genres?.map((g: any) => g.name).join(', ') || 
                 item.genres?.map((g: any) => g.name).join(', ') || '';
  
  // Find the first YouTube trailer
  const trailer = extendedItem?.videos?.results?.find(
    (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
  );

  const handleMainClose = () => {
    if (showTrailer) {
      setShowTrailer(false);
    } else {
      onClose();
    }
  };

  // Extract year from release date or first air date
  const itemYear = item.release_date ? new Date(item.release_date).getFullYear() : 
                  item.first_air_date ? new Date(item.first_air_date).getFullYear() : 
                  null;

  return (
    <div className="modal-overlay" onClick={handleMainClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {!showTrailer && (
          <button 
            onClick={handleMainClose}
            className="modal-close"
          >
            <X size={20} />
          </button>
        )}
        
        <div className="relative">
          {showTrailer && trailer ? (
            // Trailer view
            <div className="relative">
              <div className="modal-trailer-header">
                <button 
                  onClick={handleMainClose}
                  className="modal-trailer-close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-trailer-frame">
                <iframe
                  src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`${item.title || item.name} Trailer`}
                ></iframe>
              </div>
            </div>
          ) : (
            // Normal view
            <>
              {/* Backdrop banner */}
              {item.backdrop_path && (
                <div className="modal-backdrop" style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w1280${item.backdrop_path})` }}></div>
              )}
              
              <div className="modal-body">
                <div>
                  <div className="modal-body__poster-col">
                    <div className="modal-body__poster">
                      <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                        alt={item.title || item.name} />
                    </div>
                    {trailer && (
                      <button className="trailer-play-btn" onClick={() => setShowTrailer(true)}>
                        <Play size={16} /> Play Trailer
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="modal-meta">
                    {item.media_type === 'movie' ? 'FILM' : 'SERIES'} · {itemYear} · {runtime ? `${runtime} MIN` : ''} · ★
                    {item.vote_average?.toFixed(1)}/10
                  </p>
                  <h2 className="modal-title">{item.title || item.name}</h2>
                  {(extendedItem?.tagline || item.tagline) && (
                    <p className="modal-tagline">{extendedItem?.tagline || item.tagline}</p>
                  )}
                  {genres && <p className="modal-genres">{genres}</p>}
                  <div className="modal-facts">
                    <span className="fact-chip">NOT IN PLEX</span>
                    <span className="fact-chip">
                      {(item.release_date || item.first_air_date) &&
                      new Date(item.release_date || item.first_air_date) <= new Date()
                        ? 'RELEASED' : 'UPCOMING'}
                    </span>
                    <span className="fact-chip">
                      ORIGINAL LANGUAGE: {(extendedItem?.spoken_languages?.[0]?.english_name ||
                      extendedItem?.original_language?.toUpperCase() || 'UNKNOWN')}
                    </span>
                  </div>
                  <p className="modal-overview">{item.overview}</p>
                  <button
                    onClick={async () => {
                      if (requestStatus !== 'idle') return;
                      setRequestStatus('loading');
                      try {
                        const response = await fetch('/api/watchlist/add', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: item.title || item.name,
                            year: itemYear,
                            mediaType: item.media_type === 'tv' ? 'tv' : 'movie'
                          })
                        });
                        setRequestStatus(response.ok ? 'success' : 'error');
                      } catch (err) {
                        setRequestStatus('error');
                      }
                    }}
                    className={`btn btn--gold modal-request-btn ${effectiveState === 'available' ? 'is-available' : ''} ${effectiveState === 'requested' ? 'is-requested' : ''} ${effectiveState === 'error' ? 'is-error' : ''}`}
                    disabled={effectiveState !== 'idle'}
                  >
                    {buttonText}
                  </button>
                  {extendedItem?.credits?.cast && extendedItem.credits.cast.length > 0 && (
                    <div className="modal-cast">
                      <h3>Cast</h3>
                      <div className="cast-row">
                        {extendedItem.credits.cast.slice(0, 10).map((actor: any) => (
                          <button key={actor.id} className="cast-chip" onClick={() => {
                            window.location.href = `/person/${actor.id}`;
                          }}>
                            {actor.profile_path ? (
                              <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                                alt={actor.name} />
                            ) : (
                              <div className="cast-chip__fallback">{actor.name.charAt(0)}</div>
                            )}
                            <p className="cast-chip__name">{actor.name}</p>
                            <p className="cast-chip__character">{actor.character}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
