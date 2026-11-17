import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminCookieOptions, requireSameOrigin } from '@/lib/server/admin-auth';

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, '', { ...adminCookieOptions, maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  }
}
