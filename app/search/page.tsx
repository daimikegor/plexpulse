import { requireAuth } from '@/lib/session';
import { LiveSearchResults } from '@/components/LiveSearchResults';

export default async function SearchPage() {
  await requireAuth();
  return (
    <main>
      <h1 className="search-context-heading">Search</h1>
      <LiveSearchResults />
    </main>
  );
}
