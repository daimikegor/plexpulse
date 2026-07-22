/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Strip console.* from client-side bundles in production so error objects
  // with potential internal details don't leak to the browser console.
  // Server-side console calls (API routes, server components) are unaffected.
  compiler: {
    removeConsole: true,
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
