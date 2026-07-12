import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en">
      <body className={`${inter.className} bg-[#0E1015] text-white antialiased`}>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
