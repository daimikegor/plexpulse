'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Compass, Film, Tv, LogOut, ShieldCheck, Clock } from 'lucide-react';
import { PlexPulseIcon } from '@/components/PlexPulseIcon';

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
    <aside className="sidebar scrollbar-hide">
      <div className="sidebar__brand">
        <div className="sidebar__brand-row">
          <PlexPulseIcon size={32} className="sidebar__mark" />
          <h1 className="sidebar__title">PlexPulse</h1>
        </div>
      </div>
      
      <nav className="sidebar__nav scrollbar-hide">
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
        <Link 
          href="/requests" 
          className={`sidebar__nav-item ${pathname === '/requests' ? 'is-active' : ''}`}
        >
          <Clock size={20} />
          <span>Requests</span>
        </Link>
        
        {isAdmin && (
          <Link 
            href="/admin"
            className={`sidebar__nav-item ${pathname.startsWith('/admin') ? 'is-active' : ''}`}
          >
            <ShieldCheck size={20} />
            <span>Admin</span>
          </Link>
        )}
      </nav>

      <button 
        onClick={handleLogout}
        className="btn btn--ghost sidebar__logout-btn"
      >
        <LogOut size={16} />
        Log out
      </button>
    </aside>
  );
}
