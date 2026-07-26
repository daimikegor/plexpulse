// Guard against duplicate signal listener registration in dev mode
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDailyScanScheduler, stopDailyScanScheduler } = await import('@/lib/scan-scheduler');
    initDailyScanScheduler();

    const gracefulShutdown = () => {
      console.log('[instrumentation] Received shutdown signal, cleaning up...');
      stopDailyScanScheduler();
    };

    // Only register if no listeners exist yet (dev mode safety)
    if (process.listenerCount('SIGTERM') === 0) {
      process.on('SIGTERM', gracefulShutdown);
    }
    if (process.listenerCount('SIGINT') === 0) {
      process.on('SIGINT', gracefulShutdown);
    }
  }
}
