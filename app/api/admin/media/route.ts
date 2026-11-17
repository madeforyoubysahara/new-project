import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { apiError, authorizeAdmin, recordActivity } from '@/lib/server/admin-api';
import { publicStorageUrl, supabaseRequest } from '@/lib/server/supabase';

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const allowedTypes = new Map([
  ['image/jpeg', { extension: 'jpg', matches: (bytes: Buffer) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff }],
  ['image/png', { extension: 'png', matches: (bytes: Buffer) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) }],
  ['image/webp', { extension: 'webp', matches: (bytes: Buffer) => bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' }],
]);

export async function GET(request: Request) {
  try {
    await authorizeAdmin(request);
    const { data } = await supabaseRequest<Array<{ id: string; name: string; images: string[]; image_alt: string[] }>>(
      '/rest/v1/products?select=id,name,images,image_alt&order=updated_at.desc&limit=1000',
    );
    const attached = new Map<string, { alt: string; productId: string; productName: string }>();
    for (const product of data) {
      (product.images ?? []).forEach((url, index) => attached.set(url, {
        alt: product.image_alt?.[index] ?? '',
        productId: product.id,
        productName: product.name,
      }));
    }

    const { data: objects } = await supabaseRequest<Array<{ name: string }>>(
      '/storage/v1/object/list/product-images',
      {
        method: 'POST',
        body: JSON.stringify({ prefix: 'products', limit: 500, sortBy: { column: 'created_at', order: 'desc' } }),
      },
    );
    const stored = objects.filter((object) => !object.name.includes('/')).map((object) => {
      const path = `products/${object.name}`;
      const url = publicStorageUrl(path);
      const product = attached.get(url);
      return {
        url,
        alt: product?.alt ?? '',
        productId: product?.productId ?? null,
        productName: product?.productName ?? null,
      };
    });
    const media: Array<{ url: string; alt: string; productId: string | null; productName: string | null }> =
      Array.from(attached, ([url, product]) => ({
      url,
      alt: product.alt,
      productId: product.productId,
      productName: product.productName,
    }));
    const listed = new Set(media.map((image) => image.url));
    media.push(...stored.filter((image) => !listed.has(image.url)));
    return NextResponse.json({ media });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await authorizeAdmin(request, true);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new Error('Choose a product image to upload.');
    if (file.size < 1 || file.size > MAX_FILE_SIZE) throw new Error('Images must be 4 MB or smaller.');
    const type = allowedTypes.get(file.type);
    if (!type) throw new Error('Use a JPG, PNG, or WebP product image.');
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!type.matches(bytes)) throw new Error('The image content does not match its file type.');

    const path = `products/${randomUUID()}.${type.extension}`;
    await supabaseRequest(`/storage/v1/object/product-images/${path}`, {
      method: 'POST',
      headers: { 'content-type': file.type, 'x-upsert': 'false' },
      body: bytes,
    });
    const url = publicStorageUrl(path);
    await recordActivity(admin.email, 'uploaded', 'image', path, `Uploaded product image “${file.name.slice(0, 120)}”.`);
    return NextResponse.json({ image: { url, path, alt: '' } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await authorizeAdmin(request, true);
    const path = new URL(request.url).searchParams.get('path') ?? '';
    if (!/^products\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(path)) {
      throw new Error('Only uploaded product-library images can be deleted.');
    }

    const { data: products } = await supabaseRequest<Array<{ images: string[] }>>(
      '/rest/v1/products?select=images&limit=1000',
    );
    const url = publicStorageUrl(path);
    if (products.some((product) => (product.images ?? []).includes(url))) {
      return NextResponse.json({ error: 'Remove this image from its product before deleting it.' }, { status: 409 });
    }

    await supabaseRequest('/storage/v1/object/product-images', {
      method: 'DELETE',
      body: JSON.stringify({ prefixes: [path] }),
    });
    await recordActivity(admin.email, 'deleted', 'image', path, 'Deleted an unused product-library image.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
