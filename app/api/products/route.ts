import { NextResponse } from 'next/server';
import { products as fallbackProducts } from '@/lib/catalog';
import { supabaseRequest } from '@/lib/server/supabase';

type ProductRow = {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  tagline: string;
  images: string[];
  image_alt: string[];
  colors: string[];
  custom_options: string[];
  order_form_available: boolean;
  available: boolean;
  featured: boolean;
  slug: string;
};

export async function GET() {
  try {
    const query = new URLSearchParams({
      select: 'id,name,price,category,description,tagline,images,image_alt,colors,custom_options,order_form_available,available,featured,slug',
      status: 'eq.published',
      archived_at: 'is.null',
      order: 'created_at.asc',
    });
    const { data } = await supabaseRequest<ProductRow[]>(`/rest/v1/products?${query}`);
    return NextResponse.json(
      {
        products: data.map((product) => ({
          id: product.id,
          name: product.name,
          price: Number(product.price),
          category: product.category,
          description: product.description,
          tagline: product.tagline,
          images: product.images ?? [],
          imageAlt: product.image_alt ?? [],
          colors: (product.colors ?? []).join(', '),
          custom: (product.custom_options ?? []).length > 0,
          customOptions: product.custom_options ?? [],
          available: product.available,
          featured: product.featured,
          orderFormAvailable: product.order_form_available,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Published product catalog could not be loaded.', error);
    return NextResponse.json(
      { products: fallbackProducts },
      { headers: { 'Cache-Control': 'no-store', 'X-Catalog-Source': 'local-fallback' } },
    );
  }
}
