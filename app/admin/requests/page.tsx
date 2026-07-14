import { requireAuth } from '@/lib/session';
import { db } from '@/lib/db';
import { userRequests, users, mediaStatus } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { AdminRequestsList } from '@/components/AdminRequestsList';

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

  return (
    <main>
      <h1 className="search-context-heading">All Requests</h1>
      <AdminRequestsList requests={allRequests} statusMap={Object.fromEntries(statusMap)} />
    </main>
  );
}
