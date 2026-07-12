'use client';

import Link from 'next/link';

export function GenreRow({ 
  genres, 
  mediaType, 
  heading 
}: { 
  genres: any[]; 
  mediaType: 'movie' | 'tv'; 
  heading: string; 
}) {
  return (
    <div className="shelf">
      <div className="shelf__head">
        <h2 className="shelf__heading">{heading}</h2>
      </div>
      <div className="shelf__row shelf__row--genre-tiles">
        {genres.map((genre) => (
          <Link 
            key={genre.id} 
            href={`/genre/${mediaType}/${genre.id}?name=${encodeURIComponent(genre.name)}`}
            className="genre-tile"
          >
            <div 
              className="genre-tile__image"
              style={{
                backgroundImage: genre.backdrop_path 
                  ? `url(https://image.tmdb.org/t/p/w500${genre.backdrop_path})` 
                  : undefined
              }}
            >
              <div className="genre-tile__label">{genre.name}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
