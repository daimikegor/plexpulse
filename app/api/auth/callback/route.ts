import { NextResponse } from 'next/server';

export async function GET() {
  // Plex redirects the popup here after approval. 
  // We close the popup and notify the opener to stop polling.
  return new NextResponse(`
    <!DOCTYPE html>
    <html><head><title>Signing in...</title></head>
    <body style="background:#0E1015;color:#F3F1EA;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
      <p>Signing you in&hellip;</p>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'plex-auth-complete' }, '*');
          setTimeout(() => window.close(), 30000);
        } else {
          document.body.innerHTML = '<p>You can close this window.</p>';
        }
      </script>
    </body></html>
  `, { headers: { 'Content-Type': 'text/html' } });
}
