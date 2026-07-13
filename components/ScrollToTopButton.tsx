'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp } from 'lucide-react';

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!mounted) return null;

  return createPortal(
    <button
      onClick={scrollToTop}
      className={`scroll-to-top-btn ${visible ? 'is-visible' : ''}`}
      aria-label="Scroll to top"
    >
      <ArrowUp size={28} />
    </button>,
    document.body
  );
}
