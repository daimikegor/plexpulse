'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { SiteHeader } from '@/components/SiteHeader';

export function AppShell({ username, children }: { username: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  
  // If we're on the login page, don't wrap with sidebar
  if (pathname === '/') {
    return <>{children}</>;
  }
  
  return (
    <div className="app-shell">
      <Sidebar username={username ?? ''} />
      <div className="app-shell__content">
        <SiteHeader />
        {children}
      </div>
    </div>
  );
}
