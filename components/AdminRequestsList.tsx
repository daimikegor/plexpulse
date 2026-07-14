'use client';

import { useState } from 'react';

export function AdminRequestsList({ requests, statusMap }: { requests: any[]; statusMap: Record<string, string> }) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'movie' | 'tv'>('all');

  const filteredRequests = activeFilter === 'all'
    ? requests
    : requests.filter((r) => r.mediaType === activeFilter);

  if (requests.length === 0) {
    return <p className="empty-state">No requests yet.</p>;
  }

  return (
    <>
      <div className="filter-toggle">
        <button onClick={() => setActiveFilter('all')} className={`filter-toggle__btn ${activeFilter === 'all' ? 'is-active' : ''}`}>All</button>
        <button onClick={() => setActiveFilter('movie')} className={`filter-toggle__btn ${activeFilter === 'movie' ? 'is-active' : ''}`}>Movies</button>
        <button onClick={() => setActiveFilter('tv')} className={`filter-toggle__btn ${activeFilter === 'tv' ? 'is-active' : ''}`}>Series</button>
      </div>
      <div className="admin-requests-list">
        {filteredRequests.map((r) => {
          const status = statusMap[`${r.mediaType}-${r.tmdbId}`] || 'requested';
          return (
            <div key={r.id} className="admin-request-row">
              {r.posterPath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${r.posterPath}`}
                  alt={r.title}
                  className="admin-request-row__poster"
                />
              ) : (
                <div className="admin-request-row__poster admin-request-row__poster--fallback" />
              )}
              <div className="admin-request-row__info">
                <p className="admin-request-row__title">{r.title}</p>
                <p className="admin-request-row__meta">
                  Requested by {r.username || 'Unknown'} on{' '}
                  {new Date(r.requestedAt).toLocaleDateString()}
                </p>
              </div>
              <span className={`admin-request-row__status admin-request-row__status--${status}`}>
                {status === 'available' ? 'Available' : status === 'requested' ? 'Requested' : 'Unknown'}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
