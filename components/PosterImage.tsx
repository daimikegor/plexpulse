'use client';

import Image from 'next/image';
import { useState } from 'react';

export function PosterImage({ src, alt }: { src: string; alt: string }) {
  const [imageSrc, setImageSrc] = useState(src);

  const handleError = () => {
    // Simply hide the broken image by setting display to none
    const imgElement = document.querySelector(`img[src="${src}"]`);
    if (imgElement) {
      (imgElement as HTMLImageElement).style.display = 'none';
    }
  };

  return (
    <Image 
      src={imageSrc} 
      alt={alt}
      width={342}
      height={513}
      onError={handleError}
      className="w-full h-auto rounded-lg shadow-lg"
    />
  );
}
