import { NextResponse } from 'next/server';
import { apiError, authorizeAdmin, parseJson, recordActivity } from '@/lib/server/admin-api';
import { supabaseRequest } from '@/lib/server/supabase';
import { safeString } from '@/lib/server/validation';

export async function GET(request: Request) {
  try {
    await authorizeAdmin(request);
    const { data } = await supabaseRequest('/rest/v1/categories?select=*&order=name.asc');
    return NextResponse.json({ categories: data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await authorizeAdmin(request, true);
    const input = await parseJson(request);
    if (!input || typeof input !== 'object') throw new Error('Category details are required.');
    const name = safeString((input as Record<string, unknown>).name, 'Category name', 80);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) throw new Error('Category name must contain a letter or number.');
    const { data } = await supabaseRequest<Array<Record<string, unknown>>>('/rest/v1/categories', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ name, slug }),
    });
    await recordActivity(admin.email, 'created', 'category', String(data[0].id), `Created category “${name}”.`);
    return NextResponse.json({ category: data[0] }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
