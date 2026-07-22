'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface RequestRow {
  id: string;
  tmdbId: string;
  mediaType: string;
  title: string;
  posterPath: string | null;
  requestedAt: string | Date;
  username: string | null;
}

interface AdminRequestsListProps {
  requests: RequestRow[];
  statusMap: Record<string, string>;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function AdminRequestsList({
  requests,
  statusMap,
  totalCount,
  page,
  pageSize,
  totalPages,
}: AdminRequestsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<'all' | 'movie' | 'tv'>(
    () => (searchParams.get('filter') as 'all' | 'movie' | 'tv') || 'all',
  );

  const navigate = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    // Always preserve the tab
    if (!params.has('tab')) params.set('tab', 'requests');
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`/admin?${params.toString()}`);
  };

  const handleFilterChange = (filter: 'all' | 'movie' | 'tv') => {
    setActiveFilter(filter);
    navigate({ filter: filter === 'all' ? undefined : filter, page: '1' });
  };

  const handlePageSizeChange = (newSize: number) => {
    navigate({ pageSize: String(newSize), page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    navigate({ page: String(newPage) });
  };

  // Build visible page numbers with ellipsis
  const pageNumbers: (number | 'ellipsis')[] = [];
  const maxVisible = 5;
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    let start = Math.max(2, page - 1);
    let end = Math.min(totalPages - 1, page + 1);
    // Expand to fill maxVisible
    while (end - start + 1 < maxVisible - 2 && start > 2) start--;
    while (end - start + 1 < maxVisible - 2 && end < totalPages - 1) end++;
    if (start > 2) pageNumbers.push('ellipsis');
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    if (end < totalPages - 1) pageNumbers.push('ellipsis');
    pageNumbers.push(totalPages);
  }

  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  if (requests.length === 0) {
    return (
      <>
        <div className="filter-toggle">
          <button
            onClick={() => handleFilterChange('all')}
            className={`filter-toggle__btn ${activeFilter === 'all' ? 'is-active' : ''}`}
          >
            All
          </button>
          <button
            onClick={() => handleFilterChange('movie')}
            className={`filter-toggle__btn ${activeFilter === 'movie' ? 'is-active' : ''}`}
          >
            Movies
          </button>
          <button
            onClick={() => handleFilterChange('tv')}
            className={`filter-toggle__btn ${activeFilter === 'tv' ? 'is-active' : ''}`}
          >
            Series
          </button>
        </div>
        <p className="empty-state">No requests yet.</p>
      </>
    );
  }

  return (
    <>
      <div className="admin-requests-toolbar">
        <div className="filter-toggle">
          <button
            onClick={() => handleFilterChange('all')}
            className={`filter-toggle__btn ${activeFilter === 'all' ? 'is-active' : ''}`}
          >
            All
          </button>
          <button
            onClick={() => handleFilterChange('movie')}
            className={`filter-toggle__btn ${activeFilter === 'movie' ? 'is-active' : ''}`}
          >
            Movies
          </button>
          <button
            onClick={() => handleFilterChange('tv')}
            className={`filter-toggle__btn ${activeFilter === 'tv' ? 'is-active' : ''}`}
          >
            Series
          </button>
        </div>

        <div className="page-size-select">
          <label htmlFor="pageSize" className="page-size-select__label">
            Per page:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="page-size-select__dropdown"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin-requests-list">
        {requests.map((r) => {
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
                <p className="admin-request-row__title">
                  <Link href={`/detail/${r.mediaType}/${r.tmdbId}`}>
                    {r.title}
                  </Link>
                </p>
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

      {/* Pagination */}
      <div className="pagination">
        <span className="pagination__info">
          {totalCount === 0
            ? 'No requests'
            : `Showing ${startItem}–${endItem} of ${totalCount.toLocaleString()} requests`}
        </span>

        <div className="pagination__controls">
          <button
            className="pagination__btn"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            &lsaquo; Prev
          </button>

          {pageNumbers.map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${i}`} className="pagination__ellipsis">
                &hellip;
              </span>
            ) : (
              <button
                key={p}
                className={`pagination__btn ${p === page ? 'pagination__btn--active' : ''}`}
                onClick={() => handlePageChange(p)}
              >
                {p}
              </button>
            ),
          )}

          <button
            className="pagination__btn"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next &rsaquo;
          </button>
        </div>
      </div>
    </>
  );
}
