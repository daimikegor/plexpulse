import { requireAuth } from '@/lib/session';
import { db } from '@/lib/db';
import { userRequests, users, mediaStatus, plexLibraryScan } from '@/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { AdminTabs } from '@/components/AdminTabs';
import { AdminRequestsList } from '@/components/AdminRequestsList';
import { AdminSettings } from '@/components/AdminSettings';

const VALID_PAGE_SIZES = new Set([10, 25, 50]);

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireAuth();
  if (!session.isAdmin) {
    redirect('/dashboard');
  }

  const sp = await searchParams;
  const tab = (typeof sp.tab === 'string' ? sp.tab : '') || 'requests';
  const page = Math.max(1, parseInt(typeof sp.page === 'string' ? sp.page : '1', 10) || 1);
  const rawPageSize = parseInt(typeof sp.pageSize === 'string' ? sp.pageSize : '25', 10) || 25;
  const pageSize = VALID_PAGE_SIZES.has(rawPageSize) ? rawPageSize : 25;
  const filter = (typeof sp.filter === 'string' ? sp.filter : '') || 'all';

  if (tab === 'settings') {
    const scanRows = await db.select().from(plexLibraryScan).all();
    const scanData: {
      movie: { lastScanAt: string | null; lastScanSuccess: boolean; lastScanError: string | null; itemCount: number; scanInProgress: boolean } | null;
      tv: { lastScanAt: string | null; lastScanSuccess: boolean; lastScanError: string | null; itemCount: number; scanInProgress: boolean } | null;
    } = { movie: null, tv: null };
    for (const row of scanRows) {
      const entry = {
        lastScanAt: row.lastScanAt?.toISOString() ?? null,
        lastScanSuccess: row.lastScanSuccess,
        lastScanError: row.lastScanError,
        itemCount: row.itemCount,
        scanInProgress: row.scanInProgress,
      };
      if (row.mediaType === 'movie') scanData.movie = entry;
      else if (row.mediaType === 'tv') scanData.tv = entry;
    }

    return (
      <main>
        <h1 className="search-context-heading">Admin</h1>
        <AdminTabs activeTab="settings" />
        <AdminSettings scanData={scanData} />
      </main>
    );
  }

  // Requests tab (default)
  // Build count query with optional media_type filter
  const whereClause = filter === 'movie' || filter === 'tv'
    ? eq(userRequests.mediaType, filter)
    : undefined;

  const [countResult, requestsResult, statusRows] = await Promise.all([
    db
      .select({ total: count() })
      .from(userRequests)
      .where(whereClause)
      .get(),
    db
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
      .where(whereClause)
      .orderBy(desc(userRequests.requestedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select().from(mediaStatus).all(),
  ]);

  const totalCount = countResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const statusMap: Record<string, string> = {};
  for (const s of statusRows) {
    statusMap[s.id] = s.status;
  }

  return (
    <main>
      <h1 className="search-context-heading">Admin</h1>
      <AdminTabs activeTab="requests" />
      <AdminRequestsList
        requests={requestsResult}
        statusMap={statusMap}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
      />
    </main>
  );
}
