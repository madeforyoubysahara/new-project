import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminCookieOptions } from '@/lib/server/admin-auth';
import { apiError, authorizeAdmin, parseJson, recordActivity } from '@/lib/server/admin-api';
import { verifyPassword, hashPassword } from '@/lib/server/password';
import { supabaseRequest } from '@/lib/server/supabase';

type AdminUser = { id: string; email: string; password_hash: string; active: boolean };

export async function POST(request: Request) {
  try {
    const admin = await authorizeAdmin(request, true);
    const input = await parseJson(request);
    if (!input || typeof input !== 'object') throw new Error('Password details are required.');
    const { currentPassword, newPassword } = input as Record<string, unknown>;
    if (
      typeof currentPassword !== 'string' || typeof newPassword !== 'string' ||
      currentPassword.length > 1024 || newPassword.length < 12 || newPassword.length > 1024
    ) throw new Error('Enter your current password and a new password of at least 12 characters.');

    const query = new URLSearchParams({
      select: 'id,email,password_hash,active',
      id: `eq.${admin.sub}`,
      limit: '1',
    });
    const { data: users } = await supabaseRequest<AdminUser[]>(`/rest/v1/admin_users?${query}`);
    const user = users[0];
    if (!user || !user.active || !await verifyPassword(currentPassword, user.password_hash)) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }
    if (currentPassword === newPassword) throw new Error('Choose a different new password.');

    await supabaseRequest(`/rest/v1/admin_users?id=eq.${encodeURIComponent(admin.sub)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ password_hash: hashPassword(newPassword), updated_at: new Date().toISOString() }),
    });
    await recordActivity(admin.email, 'changed', 'account', admin.sub, 'Changed the owner account password.');
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, '', { ...adminCookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
