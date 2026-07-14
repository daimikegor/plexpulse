'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DetailModal } from '@/components/DetailModal';

export function SiteHeader({ avatarUrl, isAdmin }: { avatarUrl?: string | null; isAdmin?: boolean }) {
  const [query, setQuery] = useState('');
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setLiveResults([]);
      setShowDropdown(false);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/live?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setLiveResults(data.results || []);
        setShowDropdown(true);
      } catch (err) {
        setLiveResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowDropdown(false);
      router.push(`/search?q=${encodeURIComponent(query)}&type=all`);
    }
  };

  const handleResultClick = (item: any) => {
    setShowDropdown(false);
    if (item.media_type === 'person') {
      router.push(`/person/${item.id}`);
    } else {
      setSelectedItem(item);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="top-search-bar">
      <div className="search-bar" ref={containerRef}>
        <form onSubmit={handleSearch} className="search-bar__row">
          <div className="search-bar__input-wrapper">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Movies & Series"
              id="search-input"
              className="search-bar__input"
              autoComplete="off"
            />
            {showDropdown && liveResults.length > 0 && (
              <div className="search-dropdown">
                {liveResults.map((item: any) => (
                  <div
                    key={`${item.media_type}-${item.id}`}
                    className="search-dropdown__item"
                    onClick={() => handleResultClick(item)}
                  >
                    {item.media_type === 'person' ? (
                      item.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${item.profile_path}`}
                          alt={item.name}
                          className="search-dropdown__thumb search-dropdown__thumb--round"
                        />
                      ) : (
                        <div className="search-dropdown__thumb search-dropdown__thumb--round search-dropdown__thumb--fallback">
                          {item.name?.charAt(0)}
                        </div>
                      )
                    ) : item.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                        alt={item.title || item.name}
                        className="search-dropdown__thumb"
                      />
                    ) : (
                      <div className="search-dropdown__thumb search-dropdown__thumb--fallback" />
                    )}
                    <div className="search-dropdown__info">
                      <p className="search-dropdown__title">{item.title || item.name}</p>
                      <p className="search-dropdown__meta">
                        {item.media_type === 'person'
                          ? 'Person'
                          : item.media_type === 'movie'
                          ? (item.release_date ? new Date(item.release_date).getFullYear() : 'Movie')
                          : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'Series')}
                      </p>
                    </div>
                  </div>
                ))}
                <div
                  className="search-dropdown__seeall"
                  onClick={() => {
                    setShowDropdown(false);
                    router.push(`/search?q=${encodeURIComponent(query)}&type=all`);
                  }}
                >
                  See all results for "{query}"
                </div>
              </div>
            )}
          </div>
          {isAdmin ? (
            <Link href="/admin/requests" className="header-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="header-avatar__img" />
              ) : (
                <div className="header-avatar__img header-avatar__img--fallback" />
              )}
            </Link>
          ) : (
            <div className="header-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="header-avatar__img" />
              ) : (
                <div className="header-avatar__img header-avatar__img--fallback" />
              )}
            </div>
          )}
        </form>
      </div>
      {isModalOpen && selectedItem && (
        <DetailModal
          item={selectedItem}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
