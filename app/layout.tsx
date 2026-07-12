import type { Metadata } from 'next';
import './globals.css';
import { Inter, Fraunces, IBM_Plex_Mono } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const fraunces = Fraunces({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-display' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'PlexPulse',
  description: 'Discover. Request. Watch.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${ibmPlexMono.variable}`}>
      <body className="antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
