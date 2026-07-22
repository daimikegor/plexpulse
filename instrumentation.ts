export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDailyScanScheduler } = await import('@/lib/scan-scheduler');
    initDailyScanScheduler();
  }
}
