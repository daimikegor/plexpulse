'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Compass, Film, Tv, Ticket, LogOut } from 'lucide-react';

export function Sidebar({ username, isAdmin }: { username: string; isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback to redirect if fetch fails
      window.location.href = '/';
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__bulbs"></div>
        <Ticket size={32} className="marquee__mark" />
        <h1 className="sidebar__title">PlexPulse</h1>
        <p className="sidebar__tagline">Discover. Request. Watch.</p>
      </div>
      
      <nav className="sidebar__nav">
        <Link 
          href="/dashboard" 
          className={`sidebar__nav-item ${pathname === '/dashboard' ? 'is-active' : ''}`}
        >
          <Compass size={20} />
          <span>Discover</span>
        </Link>
        <Link 
          href="/movies" 
          className={`sidebar__nav-item ${pathname === '/movies' ? 'is-active' : ''}`}
        >
          <Film size={20} />
          <span>Movies</span>
        </Link>
        <Link 
          href="/series" 
          className={`sidebar__nav-item ${pathname === '/series' ? 'is-active' : ''}`}
        >
          <Tv size={20} />
          <span>Series</span>
        </Link>
      </nav>
      
      <div className="sidebar__user">
        <p className="sidebar__username">Signed in as {username}</p>
        <button 
          onClick={handleLogout}
          className="btn btn--ghost sidebar__logout-btn"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </aside>
  );
}
