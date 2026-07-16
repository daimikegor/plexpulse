import { requireAuth } from '@/lib/session';
import { db } from '@/lib/db';
import { userRequests, users, mediaStatus } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { AdminRequestsList } from '@/components/AdminRequestsList';
import { refreshMediaStatus } from '@/lib/media-status';

export default async function AdminRequestsPage() {
  const session = await requireAuth();
  if (!session.isAdmin) {
    redirect('/dashboard');
  }

  const allRequests = await db
    .select({
      id: userRequests.id,
      tmdbId: userRequests.tmdbId,
      mediaType: userRequests.mediaType,
      title: userRequests.title,
      posterPath: userRequests.posterPath,
      requestedAt: userRequests.requestedAt,
      username: users.username,
    })
    .from(userRequests)
    .leftJoin(users, eq(userRequests.plexId, users.plexId))
    .orderBy(desc(userRequests.requestedAt));

  const statusRows = await db.select().from(mediaStatus);
  const statusMap = new Map(statusRows.map((s) => [s.id, s.status]));
  
  // Check for stale or missing entries and refresh them
  const refreshPromises: Promise<void>[] = [];
  const refreshedStatusMap = new Map(statusMap);
  
  for (const request of allRequests) {
    const id = `${request.mediaType}-${request.tmdbId}`;
    const existingStatus = statusMap.get(id);
    
    // If no entry or stale, we need to refresh
    if (!existingStatus) {
      // Entry doesn't exist at all - need to refresh
      refreshPromises.push(
        refreshMediaStatus(request.tmdbId, request.mediaType as 'movie' | 'tv').then(status => {
          refreshedStatusMap.set(id, status);
        })
      );
    } else {
      // Entry exists, check if stale
      const statusRow = statusRows.find(row => row.id === id);
      if (statusRow) {
        const staleThreshold = existingStatus === 'available'
          ? 24 * 60 * 60 * 1000  // 24 hours for available
          : 60 * 1000;            // 1 minute for others
      
        const cutoff = new Date(Date.now() - staleThreshold);
        if (new Date(statusRow.lastChecked) < cutoff) {
          // Entry is stale - need to refresh
          refreshPromises.push(
            refreshMediaStatus(request.tmdbId, request.mediaType as 'movie' | 'tv').then(status => {
              refreshedStatusMap.set(id, status);
            })
          );
        }
      }
    }
  }
  
  // Run all refreshes in parallel
  await Promise.all(refreshPromises);

  return (
    <main>
      <h1 className="search-context-heading">All Requests</h1>
      <AdminRequestsList requests={allRequests} statusMap={Object.fromEntries(refreshedStatusMap)} />
    </main>
  );
}
