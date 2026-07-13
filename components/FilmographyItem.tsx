'use client';
import { PosterImage } from '@/components/PosterImage';
export function FilmographyItem({ 
  item,
  onClick
}: { 
  item: any; 
  onClick?: () => void;
}) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };
  return (
    <div className="ticket-wrap ticket-wrap--compact" onClick={handleClick}>
      <div className="ticket ticket--compact">
        <div className="ticket__poster-wrap">
          <PosterImage 
            src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
            alt={item.title || item.name}
            mediaType={item.media_type}
            title={item.title || item.name}
            year={item.release_date || item.first_air_date ? new
              Date(item.release_date || item.first_air_date).getFullYear() : undefined}
            overview={item.overview}
          />
        </div>
      </div>
    </div>
  );
}
