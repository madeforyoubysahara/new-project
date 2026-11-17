import { NextResponse } from 'next/server';
import { apiError, authorizeAdmin, parseJson, recordActivity } from '@/lib/server/admin-api';
import { supabaseRequest } from '@/lib/server/supabase';
import { validateReview } from '@/lib/server/validation';

export async function GET(request: Request) {
  try {
    await authorizeAdmin(request);
    const query = new URLSearchParams({ select: '*', order: 'submitted_at.desc', limit: '1000' });
    const { data } = await supabaseRequest(`/rest/v1/reviews?${query}`);
    return NextResponse.json({ reviews: data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await authorizeAdmin(request, true);
    const review = validateReview(await parseJson(request));
    const { data } = await supabaseRequest<Array<Record<string, unknown>>>('/rest/v1/reviews', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(review),
    });
    const created = data[0];
    await recordActivity(admin.email, 'created', 'review', String(created.id), 'Added a manually verified customer review.');
    return NextResponse.json({ review: created }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
