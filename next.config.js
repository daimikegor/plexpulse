/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Turbopack's removeConsole strips console.* from BOTH client and server
  // bundles (unlike webpack which only stripped client).  We keep console
  // output enabled — server logs are essential for diagnosing the app in
  // production, and this is a self-hosted container with no public audience
  // that would benefit from hiding console output.
  compiler: {
    removeConsole: false,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
  },

  // Security headers applied to every response.
  // CSP: only allows resources from origins the app actually uses.
  // See SECURITY_TODO.md for the external-domain audit that produced these.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              'img-src \'self\' https://image.tmdb.org https://plex.tv https://*.plex.tv data:',
              'frame-src https://www.youtube.com',
              "connect-src 'self'",
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
