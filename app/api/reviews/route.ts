import { NextResponse } from 'next/server';
import { approvedReviews } from '@/lib/reviews';
import { supabaseRequest } from '@/lib/server/supabase';

export async function GET() {
  try {
    const query = new URLSearchParams({
      select: 'id,display_name,product_id,rating,review_text,submitted_at',
      status: 'eq.approved',
      publication_consent: 'eq.true',
      order: 'submitted_at.desc',
    });
    const { data } = await supabaseRequest<Array<{
      id: string; display_name: string; product_id: string | null;
      rating: number; review_text: string; submitted_at: string;
      product: { name: string } | null;
    }>>(`/rest/v1/reviews?${query}&product:products(name)`);
    return NextResponse.json({
      reviews: data.map((review) => ({
        id: review.id,
        displayName: review.display_name,
        product: review.product?.name,
        rating: review.rating,
        quote: review.review_text,
        month: new Date(review.submitted_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        permissionConfirmed: true,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Published reviews could not be loaded.', error);
    return NextResponse.json(
      { reviews: approvedReviews },
      { headers: { 'Cache-Control': 'no-store', 'X-Reviews-Source': 'local-fallback' } },
    );
  }
}
