'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { SiteHeader } from '@/components/SiteHeader';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';

export function AppShell({ username, avatarUrl, children }: { username: string | null; avatarUrl?: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);
  
  // If we're on the login page, don't wrap with sidebar
  if (pathname === '/') {
    return <>{children}</>;
  }
  
  return (
    <div className="app-shell">
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}
      <Sidebar 
        username={username ?? ''} 
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="app-shell__content">
        <SiteHeader avatarUrl={avatarUrl} />
        {children}
      </div>
      <ScrollToTopButton />
    </div>
  );
}
