/**
 * Validate that a request originates from the configured app URL.
 *
 * Compares the `Origin` or `Referer` header against `NEXT_PUBLIC_APP_URL`.
 * Fails **closed**: if the env var is not set, all requests are rejected
 * because we cannot determine what a trusted origin is.
 */
export function isTrustedOrigin(request: Request): boolean {
  const expected = process.env.NEXT_PUBLIC_APP_URL;
  if (!expected) {
    console.warn(
      'NEXT_PUBLIC_APP_URL is not set — rejecting all cross-origin requests. ' +
        'Set this to your app URL (e.g. http://localhost:3000 or https://plexpulse.example.com).',
    );
    return false; // refuse: without a configured origin we cannot validate
  }

  // Strip trailing slash (Origin/Referer can include query strings or paths).
  const trusted = expected.replace(/\/+$/, '');
  const candidateRaw =
    request.headers.get('origin') || request.headers.get('referer');
  if (!candidateRaw) return false;
  const candidate = candidateRaw.split('?')[0].replace(/\/+$/, '');
  return candidate === trusted;
}
