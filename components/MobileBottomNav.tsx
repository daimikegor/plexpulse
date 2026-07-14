'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, Film, Tv, Clock, LogOut } from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      window.location.href = '/';
    }
  };

  const items = [
    { href: '/dashboard', icon: Compass, label: 'Discover' },
    { href: '/movies', icon: Film, label: 'Movies' },
    { href: '/series', icon: Tv, label: 'Series' },
    { href: '/requests', icon: Clock, label: 'Requests' },
  ];

  return (
    <nav className="mobile-bottom-nav">
      {items.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={`mobile-bottom-nav__item ${pathname === href ? 'is-active' : ''}`}
        >
          <Icon size={22} />
          <span>{label}</span>
        </Link>
      ))}
      <button onClick={handleLogout} className="mobile-bottom-nav__item">
        <LogOut size={22} />
        <span>Log out</span>
      </button>
    </nav>
  );
}
