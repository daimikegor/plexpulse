import { requireAuth } from '@/lib/session';
import { db } from '@/lib/db';
import { userRequests, users, mediaStatus } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';

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
      {allRequests.length > 0 ? (
        <div className="admin-requests-list">
          {allRequests.map((r) => {
            const status = statusMap.get(`${r.mediaType}-${r.tmdbId}`) || 'requested';
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
      ) : (
        <p className="empty-state">No requests yet.</p>
      )}
    </main>
  );
}
