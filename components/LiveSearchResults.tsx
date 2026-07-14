'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchResultsGrid } from '@/components/SearchResultsGrid';

export function LiveSearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    fetch(`/api/search/live?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => setResults(data.results || []))
      .catch(() => setResults([]))
      .finally(() => setIsLoading(false));
  }, [query]);

  return (
    <>
      <h1 className="search-context-heading">Search Results</h1>
      {query && (
        <p style={{ marginBottom: '1.25rem' }}>
          Showing results for: <span className="text-white">{query}</span>
        </p>
      )}
      {isLoading ? (
        <p className="empty-state">Searching...</p>
      ) : results.length > 0 ? (
        <SearchResultsGrid items={results} />
      ) : query ? (
        <p className="empty-state">No results found.</p>
      ) : (
        <p className="empty-state">Enter a search term to begin.</p>
      )}
    </>
  );
}
