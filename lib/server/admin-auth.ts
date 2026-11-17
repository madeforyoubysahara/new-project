import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'sahara_admin';
const SESSION_SECONDS = 60 * 60 * 8;

export type AdminSession = { sub: string; email: string; exp: number };

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('ADMIN_SESSION_SECRET must contain at least 32 bytes.');
  }
  return secret;
}

function signature(value: string) {
  return createHmac('sha256', sessionSecret()).update(value).digest('base64url');
}

export function createAdminSession(user: Omit<AdminSession, 'exp'>) {
  const payload = Buffer.from(
    JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }),
  ).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function readAdminSession(token?: string): AdminSession | null {
  if (!token) return null;
  const [payload, suppliedSignature, extra] = token.split('.');
  if (!payload || !suppliedSignature || extra) return null;

  let expected: string;
  try {
    expected = signature(payload);
  } catch {
    return null;
  }
  const supplied = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) return null;

  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminSession;
    if (
      typeof value.sub !== 'string' ||
      typeof value.email !== 'string' ||
      typeof value.exp !== 'number' ||
      value.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return value;
  } catch {
    return null;
  }
}

export async function currentAdminSession() {
  const jar = await cookies();
  return readAdminSession(jar.get(ADMIN_COOKIE)?.value);
}

export function adminSessionFromRequest(request: Request) {
  const cookie = request.headers.get('cookie')?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`));
  return readAdminSession(cookie?.slice(ADMIN_COOKIE.length + 1));
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  let matches = false;
  try {
    matches = Boolean(origin && new URL(origin).origin === new URL(request.url).origin);
  } catch {
    matches = false;
  }
  if (!matches) {
    throw new Error('Request origin is not allowed.');
  }
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: SESSION_SECONDS,
};
