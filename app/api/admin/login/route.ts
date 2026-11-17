import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminCookieOptions, createAdminSession, requireSameOrigin } from '@/lib/server/admin-auth';
import { verifyPassword } from '@/lib/server/password';
import { SupabaseError, supabaseRequest } from '@/lib/server/supabase';

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

type AdminUser = { id: string; email: string; password_hash: string; active: boolean };
const dummyPasswordHash = `scrypt$${Buffer.alloc(16).toString('base64url')}$${Buffer.alloc(64).toString('base64url')}`;

function getClientFingerprint(request: Request) {
  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('Admin session security is not configured.');
  return createHmac('sha256', secret).update(address).digest('hex');
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Use a JSON request body.' }, { status: 415 });
    }

    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    if (!input || typeof input !== 'object') {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    const { email, password } = input as Record<string, unknown>;
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 1024) {
      return NextResponse.json({ error: 'Enter a valid email address and password.' }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !password) {
      return NextResponse.json({ error: 'Enter a valid email address and password.' }, { status: 400 });
    }

    const fingerprint = getClientFingerprint(request);
    const cleanupBefore = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const cleanupQuery = new URLSearchParams({ attempted_at: `lt.${cleanupBefore}` });
    await supabaseRequest(`/rest/v1/admin_login_attempts?${cleanupQuery}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const attemptQuery = new URLSearchParams({
      select: 'id',
      ip_fingerprint: `eq.${fingerprint}`,
      attempted_at: `gte.${since}`,
    });
    const { response: attemptsResponse } = await supabaseRequest(
      `/rest/v1/admin_login_attempts?${attemptQuery}`,
      { headers: { Prefer: 'count=exact', Range: '0-0' } },
    );
    const attempts = Number(attemptsResponse.headers.get('content-range')?.split('/')[1] ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' }, { status: 429 });
    }
    await supabaseRequest('/rest/v1/admin_login_attempts', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ip_fingerprint: fingerprint }),
    });

    const userQuery = new URLSearchParams({
      select: 'id,email,password_hash,active',
      email: `eq.${normalizedEmail}`,
      limit: '1',
    });
    const { data: users } = await supabaseRequest<AdminUser[]>(
      `/rest/v1/admin_users?${userQuery}`,
    );
    const user = users[0];
    const valid = user
      ? await verifyPassword(password, user.password_hash)
      : await verifyPassword(password, dummyPasswordHash);
    if (!user || !user.active || !valid) {
      return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, createAdminSession({ sub: user.id, email: user.email }), adminCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof SupabaseError && error.status === 401) {
      return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Request origin is not allowed.') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Admin login failed.', error);
    return NextResponse.json({ error: 'Sign-in is unavailable. Check the admin service configuration.' }, { status: 503 });
  }
}
