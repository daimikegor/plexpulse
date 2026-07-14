'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';

export function SiteHeader({ avatarUrl, isAdmin }: { avatarUrl?: string | null; isAdmin?: boolean }) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timeout = setTimeout(() => {
      router.replace(`/search?q=${encodeURIComponent(query)}&type=all`);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, router]);

  return (
    <div className="top-search-bar">
      <div className="search-bar">
        <form onSubmit={(e) => e.preventDefault()} className="search-bar__row">
          <div className="search-bar__input-wrapper">
            <Search size={18} className="search-bar__icon" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Movies & Series"
              id="search-input"
              className="search-bar__input"
              autoComplete="off"
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
