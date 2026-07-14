import { requireAuth } from '@/lib/session';
import { db } from '@/lib/db';
import { userRequests } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { SearchResultsGrid } from '@/components/SearchResultsGrid';

export default async function RequestsPage() {
  const session = await requireAuth();

  const myRequests = await db
    .select()
    .from(userRequests)
    .where(eq(userRequests.plexId, String(session.plexId)))
    .orderBy(desc(userRequests.requestedAt));

  // Reshape into the same item format SearchResultsGrid/PosterImage already expect
  const items = myRequests.map((r) => ({
    id: r.tmdbId,
    title: r.mediaType === 'movie' ? r.title : undefined,
    name: r.mediaType === 'tv' ? r.title : undefined,
    media_type: r.mediaType,
    poster_path: r.posterPath,
  }));

  return (
    <main>
      <h1 className="search-context-heading">My Requests</h1>
      {items.length > 0 ? (
        <SearchResultsGrid items={items} hideFilters={true} />
      ) : (
        <p className="empty-state">You haven't requested anything yet.</p>
      )}
    </main>
  );
}
