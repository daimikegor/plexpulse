'use client';

import Image from 'next/image';
import { useState } from 'react';

export function PosterImage({ src, alt, mediaType }: { src: string; alt: string; mediaType?: 'movie' | 'tv' }) {
  const [imageSrc, setImageSrc] = useState(src);

  const handleError = () => {
    // Simply hide the broken image by setting display to none
    const imgElement = document.querySelector(`img[src="${src}"]`);
    if (imgElement) {
      (imgElement as HTMLImageElement).style.display = 'none';
    }
  };

  return (
    <div className="relative">
      <Image 
        src={imageSrc} 
        alt={alt}
        width={342}
        height={513}
        onError={handleError}
        className="w-full h-auto rounded-lg shadow-lg transition-transform duration-200 ease-in-out hover:scale-105"
      />
      {mediaType && (
        <div className="absolute top-2 left-2 z-10">
          <span className={`text-white text-xs px-2 py-1 rounded-full ${
            mediaType === 'movie' ? 'bg-[#1f4fbc]' : 'bg-[#a329bb]'
          }`}>
            {mediaType === 'movie' ? 'Movie' : 'Series'}
          </span>
        </div>
      )}
    </div>
  );
}
