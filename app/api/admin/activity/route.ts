import { NextResponse } from 'next/server';
import { apiError, authorizeAdmin } from '@/lib/server/admin-api';
import { supabaseRequest } from '@/lib/server/supabase';

export async function GET(request: Request) {
  try {
    await authorizeAdmin(request);
    const { data } = await supabaseRequest(
      '/rest/v1/admin_activity?select=id,actor_email,action,entity_type,entity_id,summary,created_at&order=created_at.desc&limit=100',
    );
    return NextResponse.json({ activity: data });
  } catch (error) {
    return apiError(error);
  }
}
