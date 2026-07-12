import type { Metadata } from 'next';
import './globals.css';
import { Inter, Fraunces, IBM_Plex_Mono } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';

const inter = Inter({ subsets: ['latin'] });
const fraunces = Fraunces({ subsets: ['latin'], weight: ['400', '700'] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500'] });

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
    <html lang="en" className={`${inter.className} ${fraunces.className} ${ibmPlexMono.className}`}>
      <body className="bg-[#0E1015] text-white antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
