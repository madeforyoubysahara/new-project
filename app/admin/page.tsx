import { currentAdminSession } from '@/lib/server/admin-auth';
import AdminApp from '@/components/admin/AdminApp';
import AdminLogin from '@/components/admin/AdminLogin';
import './admin.css';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await currentAdminSession();
  return session
    ? <AdminApp email={session.email} />
    : <AdminLogin />;
}
