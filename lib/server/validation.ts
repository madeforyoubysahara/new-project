export type ManagedProduct = {
  id?: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  tagline: string;
  price: number;
  compare_at_price: number | null;
  images: string[];
  image_alt: string[];
  colors: string[];
  custom_options: string[];
  order_form_available: boolean;
  available: boolean;
  featured: boolean;
  status: 'draft' | 'published';
  tags: string[];
};

function text(value: unknown, label: string, maxLength: number, optional = false) {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  const normalized = value.trim();
  if (!optional && !normalized) throw new Error(`${label} is required.`);
  if (normalized.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return normalized;
}

function list(value: unknown, label: string, maxItems: number, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${label} is invalid.`);
  return value.map((item) => text(item, label, maxLength));
}

export function validateProduct(value: unknown): ManagedProduct {
  if (!value || typeof value !== 'object') throw new Error('Product details are required.');
  const input = value as Record<string, unknown>;
  const price = Number(input.price);
  const compareAt = input.compare_at_price === '' || input.compare_at_price == null
    ? null
    : Number(input.compare_at_price);
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) throw new Error('Enter a valid product price.');
  if (compareAt !== null && (!Number.isFinite(compareAt) || compareAt < price || compareAt > 1_000_000)) {
    throw new Error('Compare-at price must be greater than or equal to the product price.');
  }
  if (
    typeof input.available !== 'boolean' ||
    typeof input.featured !== 'boolean' ||
    typeof input.order_form_available !== 'boolean'
  ) {
    throw new Error('Availability, featured status, and order form option status must be selected.');
  }
  if (input.status !== 'draft' && input.status !== 'published') throw new Error('Choose draft or published status.');

  const slug = text(input.slug, 'Product slug', 100).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Product slug may contain lowercase letters, numbers, and single hyphens only.');
  }
  const images = list(input.images, 'Product images', 10, 2048);
  if (images.length === 0) throw new Error('Add at least one product image.');
  const imageAlt = list(input.image_alt ?? [], 'Image alt text', 10, 250);
  if (imageAlt.length !== images.length || imageAlt.some((alt) => !alt.trim())) {
    throw new Error('Add a short, descriptive alt text for every product image.');
  }
  for (const image of images) {
    let trustedStorageImage = false;
    try {
      const base = process.env.SUPABASE_URL;
      const parsed = new URL(image);
      trustedStorageImage = Boolean(
        base &&
        parsed.origin === new URL(base).origin &&
        parsed.pathname.startsWith('/storage/v1/object/public/product-images/'),
      );
    } catch {
      trustedStorageImage = false;
    }
    if (!/^\/products\/[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp)$/i.test(image) && !trustedStorageImage) {
      throw new Error('Product images must use an existing product image or the configured product storage.');
    }
    if (image.includes('..')) throw new Error('Product image paths cannot contain traversal segments.');
  }

  return {
    id: typeof input.id === 'string' ? input.id : undefined,
    name: text(input.name, 'Product name', 120),
    slug,
    category: text(input.category, 'Category', 80),
    description: text(input.description, 'Description', 3000),
    tagline: text(input.tagline, 'Short description', 240),
    price,
    compare_at_price: compareAt,
    images,
    image_alt: images.map((_, index) => imageAlt[index]?.trim() ?? ''),
    colors: list(input.colors, 'Colours', 20, 60),
    custom_options: list(input.custom_options, 'Customisation options', 20, 120),
    order_form_available: input.order_form_available,
    available: input.available,
    featured: input.featured,
    status: input.status,
    tags: list(input.tags ?? [], 'Tags', 20, 40),
  };
}

export function validateReview(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Review details are required.');
  const input = value as Record<string, unknown>;
  const displayName = text(input.display_name, 'Display name', 80);
  const quote = text(input.review_text, 'Review text', 1200);
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5.');
  if (typeof input.publication_consent !== 'boolean') throw new Error('Publication consent must be confirmed.');
  const status = input.status;
  if (status !== 'pending' && status !== 'approved' && status !== 'rejected' && status !== 'hidden') {
    throw new Error('Review status is invalid.');
  }
  if (status === 'approved' && !input.publication_consent) {
    throw new Error('A review requires explicit publication consent before approval.');
  }
  return {
    display_name: displayName,
    product_id: typeof input.product_id === 'string' && input.product_id ? input.product_id : null,
    rating,
    review_text: quote,
    submitted_at: typeof input.submitted_at === 'string' && input.submitted_at
      ? input.submitted_at
      : new Date().toISOString(),
    publication_consent: input.publication_consent,
    status,
  };
}

export function safeString(value: unknown, label: string, maxLength: number) {
  return text(value, label, maxLength);
}
