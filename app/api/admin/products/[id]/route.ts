import { NextResponse } from 'next/server';
import { apiError, authorizeAdmin, parseJson, recordActivity } from '@/lib/server/admin-api';
import { supabaseRequest } from '@/lib/server/supabase';
import { validateProduct } from '@/lib/server/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await authorizeAdmin(request, true);
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw new Error('Product identifier is invalid.');
    const input = await parseJson(request);
    if (!input || typeof input !== 'object') throw new Error('Product update is required.');
    const body = input as Record<string, unknown>;

    if (body.action === 'archive' || body.action === 'restore') {
      const archived = body.action === 'archive';
      const { data } = await supabaseRequest<Array<Record<string, unknown>>>(
        `/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            archived_at: archived ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }),
        },
      );
      if (!data[0]) return NextResponse.json({ error: 'Product was not found.' }, { status: 404 });
      await recordActivity(admin.email, body.action, 'product', id, `${archived ? 'Archived' : 'Restored'} product ${id}.`);
      return NextResponse.json({ product: data[0] });
    }

    const product = validateProduct({ ...body, id });
    const { data } = await supabaseRequest<Array<Record<string, unknown>>>(
      `/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ...product, updated_at: new Date().toISOString() }),
      },
    );
    if (!data[0]) return NextResponse.json({ error: 'Product was not found.' }, { status: 404 });
    await recordActivity(admin.email, 'updated', 'product', id, `Updated product “${product.name}”.`);
    return NextResponse.json({ product: data[0] });
  } catch (error) {
    return apiError(error);
  }
}
