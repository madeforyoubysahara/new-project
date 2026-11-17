import { NextResponse } from 'next/server';
import { apiError, authorizeAdmin, parseJson, recordActivity } from '@/lib/server/admin-api';
import { supabaseRequest } from '@/lib/server/supabase';
import { validateReview } from '@/lib/server/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await authorizeAdmin(request, true);
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Review identifier is invalid.');
    const review = validateReview(await parseJson(request));
    const { data } = await supabaseRequest<Array<Record<string, unknown>>>(
      `/rest/v1/reviews?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ...review, updated_at: new Date().toISOString() }),
      },
    );
    if (!data[0]) return NextResponse.json({ error: 'Review was not found.' }, { status: 404 });
    await recordActivity(admin.email, review.status, 'review', id, `Set review status to ${review.status}.`);
    return NextResponse.json({ review: data[0] });
  } catch (error) {
    return apiError(error);
  }
}
