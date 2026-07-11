import type { Metadata } from 'next';
import './globals.css';

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
      <body className="bg-[#0E1015] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
