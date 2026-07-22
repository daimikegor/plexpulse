import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/session';

export default async function AdminRequestsRedirect() {
  await requireAuth();
  redirect('/admin');
}
