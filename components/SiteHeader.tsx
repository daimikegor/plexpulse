'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function SiteHeader({ avatarUrl, isAdmin }: { avatarUrl?: string | null; isAdmin?: boolean }) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}&type=all`);
    }
  };

  return (
    <div className="top-search-bar">
      <div className="search-bar">
        <form onSubmit={handleSearch} className="search-bar__row">
          <div className="search-bar__input-wrapper">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Movies & Series"
              id="search-input"
              className="search-bar__input"
            />
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
    </div>
  );
}
