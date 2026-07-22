'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ScanRow {
  lastScanAt: string | null;
  lastScanSuccess: boolean;
  lastScanError: string | null;
  itemCount: number;
  scanInProgress: boolean;
}

function defaultScanRow(): ScanRow {
  return {
    lastScanAt: null,
    lastScanSuccess: false,
    lastScanError: null,
    itemCount: 0,
    scanInProgress: false,
  };
}

interface AdminSettingsProps {
  scanData: {
    movie: ScanRow | null;
    tv: ScanRow | null;
  };
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ScanCard({
  label,
  scanRow,
  mediaType,
  onRescan,
}: {
  label: string;
  scanRow: ScanRow | null;
  mediaType: 'movie' | 'tv';
  onRescan: (mt: 'movie' | 'tv') => void;
}) {
  const neverScanned = !scanRow || !scanRow.lastScanAt;
  const isScanning = scanRow?.scanInProgress ?? false;
  const isSuccess = scanRow?.lastScanSuccess ?? false;
  const itemCount = scanRow?.itemCount ?? 0;
  const error = scanRow?.lastScanError ?? null;

  return (
    <div className="settings-card">
      <div className="settings-card__header">
        <h2 className="settings-card__title">{label}</h2>
        {neverScanned ? (
          <span className="scan-status scan-status--never">Never scanned</span>
        ) : isScanning ? (
          <span className="scan-status scan-status--scanning">
            <Loader2 size={14} className="scan-status__spinner" /> Scanning&hellip;
          </span>
        ) : isSuccess ? (
          <span className="scan-status scan-status--success">
            <CheckCircle size={14} /> Scan OK
          </span>
        ) : (
          <span className="scan-status scan-status--error">
            <XCircle size={14} /> Scan failed
          </span>
        )}
      </div>

      <div className="settings-card__stats">
        <div className="settings-card__stat">
          <span className="settings-card__stat-label">Items in Plex</span>
          <span className="settings-card__stat-value">
            {neverScanned && !isScanning ? '—' : itemCount.toLocaleString()}
          </span>
        </div>
        <div className="settings-card__stat">
          <span className="settings-card__stat-label">Last scan</span>
          <span className="settings-card__stat-value">
            {isScanning ? 'In progress&hellip;' : formatTimestamp(scanRow?.lastScanAt ?? null)}
          </span>
        </div>
      </div>

      {error && !isScanning && (
        <div className="error-box">
          <strong>Error:</strong> {error}
        </div>
      )}

      <button
        className="btn btn--primary settings-card__scan-btn"
        onClick={() => onRescan(mediaType)}
        disabled={isScanning}
      >
        {isScanning ? (
          <>
            <Loader2 size={14} className="scan-status__spinner" /> Scanning&hellip;
          </>
        ) : (
          <>
            <RefreshCw size={14} /> Rescan {label}
          </>
        )}
      </button>
    </div>
  );
}

export function AdminSettings({ scanData }: AdminSettingsProps) {
  const [scanState, setScanState] = useState(scanData);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTargetRef = useRef<Set<string>>(new Set());

  const pollStatus = useCallback(() => {
    fetch('/api/admin/plex-scan/status')
      .then((r) => r.json())
      .then((data) => {
        setScanState(data);
        // Stop polling if no scan is in progress for the targets we care about
        const stillScanning = Array.from(pollTargetRef.current).some(
          (mt) => data[mt]?.scanInProgress,
        );
        if (!stillScanning) {
          stopPolling();
          pollTargetRef.current.clear();
        }
      })
      .catch(() => {
        // If the status endpoint fails, stop polling to avoid hammering
        stopPolling();
        pollTargetRef.current.clear();
      });
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return stopPolling;
  }, []);

  const handleRescan = async (mediaType: 'movie' | 'tv') => {
    pollTargetRef.current.add(mediaType);

    // Optimistically mark as scanning
    setScanState((prev) => ({
      ...prev,
      [mediaType]: { ...(prev[mediaType] ?? defaultScanRow()), scanInProgress: true, lastScanError: null } as ScanRow,
    }));

    try {
      await fetch('/api/admin/plex-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaType }),
      });
    } catch {
      // If the trigger fails, stop waiting
      pollTargetRef.current.delete(mediaType);
      return;
    }

    // Start polling for completion
    if (!pollRef.current) {
      pollRef.current = setInterval(pollStatus, 2000);
    }
    // Fire an immediate poll to catch quick scans
    pollStatus();
  };

  const handleRescanAll = async () => {
    pollTargetRef.current.add('movie');
    pollTargetRef.current.add('tv');

    setScanState((prev) => ({
      movie: { ...(prev.movie ?? defaultScanRow()), scanInProgress: true, lastScanError: null } as ScanRow,
      tv: { ...(prev.tv ?? defaultScanRow()), scanInProgress: true, lastScanError: null } as ScanRow,
    }));

    try {
      await fetch('/api/admin/plex-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch {
      pollTargetRef.current.clear();
      return;
    }

    if (!pollRef.current) {
      pollRef.current = setInterval(pollStatus, 2000);
    }
    pollStatus();
  };

  const hasAnyData = scanState.movie?.lastScanAt || scanState.tv?.lastScanAt;
  const anyScanning = scanState.movie?.scanInProgress || scanState.tv?.scanInProgress;

  return (
    <div className="admin-settings">
      {!hasAnyData && !anyScanning && (
        <div className="error-box error-box--info">
          No scan data yet. Run an initial scan to populate the Plex library cache.
        </div>
      )}

      <div className="settings-grid">
        <ScanCard
          label="Movies"
          scanRow={scanState.movie}
          mediaType="movie"
          onRescan={handleRescan}
        />
        <ScanCard
          label="TV Series"
          scanRow={scanState.tv}
          mediaType="tv"
          onRescan={handleRescan}
        />
      </div>

      <button
        className="btn btn--primary settings-card__scan-all-btn"
        onClick={handleRescanAll}
        disabled={anyScanning}
      >
        {anyScanning ? (
          <>
            <Loader2 size={14} className="scan-status__spinner" /> Scanning&hellip;
          </>
        ) : (
          <>
            <RefreshCw size={14} /> Rescan All
          </>
        )}
      </button>
    </div>
  );
}
