import { requireRole } from '@/lib/auth';
import { ManajemenAkunClientPage } from '@/components/manajemen-akun/ManajemenAkunClientPage';
import type { UserWithEmail } from '@/types/database';
import { honoFetch } from '@/lib/honoClient';

export const dynamic = 'force-dynamic';

export default async function ManajemenAkunPage() {
  await requireRole(['ADMIN'], '/');

  let users: UserWithEmail[] = [];
  let requests: UserWithEmail[] = [];
  let archivedUsers: UserWithEmail[] = [];

  try {
    const [usersRes, archivedRes] = await Promise.all([
      honoFetch<UserWithEmail[]>('/api/admin/users'),
      honoFetch<UserWithEmail[]>('/api/admin/users/archived'),
    ]);

    if (usersRes.ok && usersRes.data) {
      users = usersRes.data.filter((u) => !u.deleted_at && (u.status === 'ACTIVE' || !u.status));
      requests = usersRes.data.filter((u) => !u.deleted_at && (u.status === 'PENDING' || u.status === 'REJECTED'));
    }

    if (archivedRes.ok && archivedRes.data) {
      archivedUsers = archivedRes.data;
    }
  } catch (error) {
    console.error('Failed to fetch admin users:', error);
  }

  return <ManajemenAkunClientPage users={users} requests={requests} archivedUsers={archivedUsers} />;
}
