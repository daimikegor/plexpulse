import { db } from '@/lib/db';
import { plexLibraryScan } from '@/db/schema';
import { runPlexLibraryScan } from '@/lib/plex-library';

const INITIAL_DELAY_MS = 5 * 60 * 1000; // 5 min — let container settle before first scan

let timeoutId: ReturnType<typeof setTimeout> | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;

async function scheduleNextScan(): Promise<void> {
  const hours = parseInt(process.env.SCAN_SCHEDULE_HOURS || '24', 10);
  if (hours <= 0 || !Number.isFinite(hours)) return;

  const intervalMs = hours * 60 * 60 * 1000;

  // Determine how long until the next scan by checking the most recent
  // lastScanAt across both media types.  This survives container restarts
  // — frequent deploys won't reset the clock.
  let delayMs = INITIAL_DELAY_MS; // default: never scanned yet

  try {
    const rows = await db.select().from(plexLibraryScan).all();
    const timestamps = rows
      .map((r) => r.lastScanAt?.getTime())
      .filter(Boolean) as number[];
    if (timestamps.length > 0) {
      const mostRecent = Math.max(...timestamps);
      const elapsed = Date.now() - mostRecent;
      delayMs = Math.max(0, intervalMs - elapsed);
      // Clamp to a minimum so we don't fire immediately on every restart
      // when the interval has already elapsed.
      if (delayMs < INITIAL_DELAY_MS) delayMs = INITIAL_DELAY_MS;
    }
  } catch (err) {
    console.warn(
      '[scan-scheduler] Could not read lastScanAt, using default delay:',
      err,
    );
  }

  const delayMin = Math.round(delayMs / 60000);
  console.log(
    `[scan-scheduler] Next scan in ~${delayMin}min (interval: ${hours}h)`,
  );

  timeoutId = setTimeout(() => {
    console.log('[scan-scheduler] Triggering scheduled scan');
    runPlexLibraryScan().catch((err) => {
      console.error('[scan-scheduler] Scheduled scan failed:', err);
    });
    // After the first fire, settle into a regular interval
    intervalId = setInterval(() => {
      console.log('[scan-scheduler] Triggering scheduled scan');
      runPlexLibraryScan().catch((err) => {
        console.error('[scan-scheduler] Scheduled scan failed:', err);
      });
    }, intervalMs);
    intervalId.unref();
  }, delayMs);
  timeoutId.unref();
}

export function initDailyScanScheduler(): void {
  const hours = parseInt(process.env.SCAN_SCHEDULE_HOURS || '24', 10);
  if (hours <= 0 || !Number.isFinite(hours)) {
    console.log('[scan-scheduler] Disabled (SCAN_SCHEDULE_HOURS=0 or unset)');
    return;
  }
  scheduleNextScan();
}

export function stopDailyScanScheduler(): void {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.log('[scan-scheduler] Stopped');
}
