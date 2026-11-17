import { NextResponse } from 'next/server';
import { apiError, authorizeAdmin, parseJson, recordActivity } from '@/lib/server/admin-api';
import { supabaseRequest } from '@/lib/server/supabase';
import { validateProduct } from '@/lib/server/validation';

export async function GET(request: Request) {
  try {
    await authorizeAdmin(request);
    const query = new URLSearchParams({ select: '*', order: 'updated_at.desc', limit: '1000' });
    const { data } = await supabaseRequest(`/rest/v1/products?${query}`);
    return NextResponse.json({ products: data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await authorizeAdmin(request, true);
    const product = validateProduct(await parseJson(request));
    const { data } = await supabaseRequest<Array<Record<string, unknown>>>('/rest/v1/products', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        ...product,
        id: undefined,
        archived_at: null,
        updated_at: new Date().toISOString(),
      }),
    });
    const created = data[0];
    await recordActivity(admin.email, 'created', 'product', String(created.id), `Created product “${product.name}”.`);
    return NextResponse.json({ product: created }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
