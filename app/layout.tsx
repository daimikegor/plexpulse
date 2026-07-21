import type { Metadata } from 'next';
import './globals.css';
import { Inter, Fraunces, IBM_Plex_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { AppShell } from '@/components/AppShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const fraunces = Fraunces({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-display' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'PlexPulse',
  description: 'Discover. Request. Watch.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionToken = (await cookies()).get('session_token')?.value;
  const session = sessionToken ? await getSession(sessionToken) : null;

  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${ibmPlexMono.variable} scrollbar-hide`}>
      <body className="antialiased scrollbar-hide">
        <AppShell username={session?.username ?? null} avatarUrl={session?.avatarUrl ?? null} isAdmin={session?.isAdmin ?? false}>{children}</AppShell>
      </body>
    </html>
  );
}
