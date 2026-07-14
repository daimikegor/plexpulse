import { requireAuth } from '@/lib/session';
import { LiveSearchResults } from '@/components/LiveSearchResults';

export default async function SearchPage() {
  await requireAuth();
  return (
    <main>
      <LiveSearchResults />
    </main>
  );
}
