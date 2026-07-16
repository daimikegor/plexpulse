'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { SiteHeader } from '@/components/SiteHeader';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { MobileBottomNav } from '@/components/MobileBottomNav';

export function AppShell({ username, avatarUrl, isAdmin, children }: { username: string | null; avatarUrl?: string | null; isAdmin?: boolean; children: React.ReactNode }) {
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
    <div className="app-shell scrollbar-hide">
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}
      <Sidebar 
        username={username ?? ''} 
        isAdmin={isAdmin}
      />
      <div className="app-shell__content scrollbar-hide">
        <SiteHeader avatarUrl={avatarUrl} isAdmin={isAdmin} />
        <div className="app-shell__page scrollbar-hide">
          {children}
        </div>
      </div>
      <ScrollToTopButton />
      <MobileBottomNav />
    </div>
  );
}
