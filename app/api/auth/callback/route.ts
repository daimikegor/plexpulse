import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS['auth-callback']);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  // Plex redirects the popup here after approval.
  // We close the popup and notify the opener to stop polling.
  return new NextResponse(`
    <!DOCTYPE html>
    <html><head><title>Signing in...</title></head>
    <body style="background:#0E1015;color:#F3F1EA;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
      <p>Signing you in&hellip;</p>
      <script>
        var appUrl = '${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}'.replace(/\\/+$/, '');
        if (window.opener) {
          window.opener.postMessage({ type: 'plex-auth-complete' }, appUrl);
          setTimeout(() => window.close(), 500);
        } else {
          document.body.innerHTML = '<p>You can close this window.</p>';
        }
      </script>
    </body></html>
  `, { headers: { 'Content-Type': 'text/html' } });
}
