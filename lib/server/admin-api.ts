import { NextResponse } from 'next/server';
import { adminSessionFromRequest, requireSameOrigin } from './admin-auth';
import { SupabaseError, supabaseRequest } from './supabase';

export async function authorizeAdmin(request: Request, mutation = false) {
  if (mutation) requireSameOrigin(request);
  const session = adminSessionFromRequest(request);
  if (!session) throw new SupabaseError('Authentication required.', 401);
  return session;
}

export async function recordActivity(
  actor: string,
  action: string,
  entityType: string,
  entityId: string | null,
  summary: string,
) {
  await supabaseRequest('/rest/v1/admin_activity', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      actor_email: actor,
      action,
      entity_type: entityType,
      entity_id: entityId,
      summary,
    }),
  });
}

export function apiError(error: unknown) {
  if (error instanceof SupabaseError) {
    const message = error.status === 401
      ? 'Please sign in to continue.'
      : error.status >= 500
        ? 'The request could not be completed. Check the service configuration and try again.'
        : error.message;
    return NextResponse.json({ error: message }, { status: error.status });
  }
  if (error instanceof Error && error.message === 'Request origin is not allowed.') {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error('Unexpected admin API error.', error);
  return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
}

export async function parseJson(request: Request) {
  try {
    return await request.json() as unknown;
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}
