import { NextResponse } from 'next/server';
import { supabaseRequest } from '@/lib/server/supabase';

const defaultContent = {
  announcement: 'A little handmade love, just for you',
  hero_heading: 'Handmade with Love, Made Just for You.',
  hero_subtitle: 'Discover charming crochet flowers, adorable accessories and personalised little treasures — thoughtfully crafted by Sahara.',
  about_text: 'Welcome to Made for You by Sahara, a little creative space dedicated to handmade crochet creations.',
  footer_text: 'Handmade with Love',
  storefront_visible: true,
  featured_product_ids: [] as string[],
  faq: [
    { question: 'Are your products handmade?', answer: 'Yes! Our crochet creations are handmade with love.' },
    { question: 'Can I choose different colours?', answer: 'Yes, you can share your preferred colour. Availability is confirmed when we review your request.' },
    { question: 'Do you accept custom orders?', answer: 'Customisation is available for selected products, subject to confirmation.' },
    { question: 'How do I place an order?', answer: 'Choose a product and complete our Google Form. Sahara will contact you to confirm the details.' },
    { question: 'How long will delivery take?', answer: 'Delivery timing and charges are confirmed after reviewing your order and location.' },
    { question: 'What payment methods do you accept?', answer: 'Payment options are discussed when your order request is confirmed.' },
    { question: 'What if my item arrives damaged or incorrect?', answer: 'Email madeforyoubysahara@gmail.com promptly with your order details. We review concerns fairly and provide remedies in line with applicable consumer law.' },
    { question: 'Can I cancel or return an order?', answer: 'Requests are considered case by case, especially for personalised items. See our Ordering, Delivery, Cancellations & Returns policy for details.' },
  ],
  business_name: 'Made for You by Sahara',
  business_email: 'madeforyoubysahara@gmail.com',
  seo_title: 'Made for You by Sahara | Handmade Crochet Gifts',
  seo_description: 'Shop handmade crochet flower keychains, bows, hairbands and flower garlands.',
};

export async function GET() {
  try {
    const query = new URLSearchParams({
      select: 'announcement,hero_heading,hero_subtitle,about_text,footer_text,storefront_visible,featured_product_ids,faq,business_name,business_email,seo_title,seo_description',
      id: 'eq.storefront',
      limit: '1',
    });
    const { data } = await supabaseRequest<Array<typeof defaultContent>>(`/rest/v1/site_settings?${query}`);
    return NextResponse.json({ content: data[0] ?? defaultContent }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Public website content could not be loaded.', error);
    return NextResponse.json(
      { content: defaultContent },
      { headers: { 'Cache-Control': 'no-store', 'X-Site-Content-Source': 'local-fallback' } },
    );
  }
}
