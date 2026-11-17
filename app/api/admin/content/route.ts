import { NextResponse } from 'next/server';
import { apiError, authorizeAdmin, parseJson, recordActivity } from '@/lib/server/admin-api';
import { supabaseRequest } from '@/lib/server/supabase';
import { safeString } from '@/lib/server/validation';

const CONTENT_ID = 'storefront';

function validateContent(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Website content is required.');
  const input = value as Record<string, unknown>;
  if (typeof input.storefront_visible !== 'boolean') throw new Error('Storefront visibility must be selected.');
  let faq: unknown = [];
  try {
    faq = JSON.parse(safeString(input.faq_json, 'FAQ JSON', 12000));
  } catch {
    throw new Error('FAQs must be valid JSON.');
  }
  if (!Array.isArray(faq) || faq.length > 30 || faq.some((item) => {
    if (!item || typeof item !== 'object') return true;
    const entry = item as Record<string, unknown>;
    return typeof entry.question !== 'string' || typeof entry.answer !== 'string' ||
      !entry.question.trim() || !entry.answer.trim() ||
      entry.question.length > 240 || entry.answer.length > 1000;
  })) throw new Error('Each FAQ must have a question (up to 240 characters) and answer (up to 1,000 characters).');
  const businessEmail = safeString(input.business_email, 'Business email', 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) throw new Error('Enter a valid business email address.');

  const featured = input.featured_product_ids;
  if (!Array.isArray(featured) || featured.length > 100 || featured.some((item) => typeof item !== 'string')) {
    throw new Error('Featured product selection is invalid.');
  }
  return {
    business_name: safeString(input.business_name, 'Business name', 120),
    business_email: businessEmail,
    announcement: safeString(input.announcement, 'Announcement', 180),
    hero_heading: safeString(input.hero_heading, 'Homepage heading', 180),
    hero_subtitle: safeString(input.hero_subtitle, 'Homepage subtitle', 500),
    about_text: safeString(input.about_text, 'About the brand', 3000),
    footer_text: safeString(input.footer_text, 'Footer text', 300),
    storefront_visible: input.storefront_visible,
    seo_title: safeString(input.seo_title, 'SEO title', 160),
    seo_description: safeString(input.seo_description, 'SEO description', 320),
    featured_product_ids: featured,
    faq,
  };
}

export async function GET(request: Request) {
  try {
    await authorizeAdmin(request);
    const { data } = await supabaseRequest<Array<Record<string, unknown>>>(
      `/rest/v1/site_settings?id=eq.${CONTENT_ID}&limit=1`,
    );
    return NextResponse.json({ content: data[0] ?? null });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await authorizeAdmin(request, true);
    const content = validateContent(await parseJson(request));
    const { data } = await supabaseRequest<Array<Record<string, unknown>>>(
      `/rest/v1/site_settings?id=eq.${CONTENT_ID}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ...content, updated_at: new Date().toISOString() }),
      },
    );
    await recordActivity(admin.email, 'updated', 'content', CONTENT_ID, 'Updated website content and settings.');
    return NextResponse.json({ content: data[0] });
  } catch (error) {
    return apiError(error);
  }
}
