create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_login_attempts (
  id bigint generated always as identity primary key,
  ip_fingerprint text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists admin_login_attempts_window_idx
  on public.admin_login_attempts (ip_fingerprint, attempted_at desc);
create index if not exists admin_login_attempts_cleanup_idx
  on public.admin_login_attempts (attempted_at);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  slug text not null unique,
  category text not null,
  description text not null default '',
  tagline text not null default '',
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price >= price),
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  image_alt jsonb not null default '[]'::jsonb check (jsonb_typeof(image_alt) = 'array'),
  colors text[] not null default '{}',
  custom_options text[] not null default '{}',
  order_form_available boolean not null default false,
  available boolean not null default true,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  tags text[] not null default '{}',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_public_catalog_idx
  on public.products (status, available, archived_at, created_at);
create index if not exists products_category_idx on public.products (category);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  product_id text references public.products(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  review_text text not null,
  submitted_at timestamptz not null default now(),
  publication_consent boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approved_review_has_consent check (status <> 'approved' or publication_consent)
);
create index if not exists reviews_moderation_idx on public.reviews (status, submitted_at desc);

create table if not exists public.site_settings (
  id text primary key default 'storefront' check (id = 'storefront'),
  business_name text not null default 'Made for You by Sahara',
  business_email text not null default 'madeforyoubysahara@gmail.com',
  announcement text not null default 'A little handmade love, just for you',
  hero_heading text not null default 'Handmade with Love, Made Just for You.',
  hero_subtitle text not null default 'Discover charming crochet flowers, adorable accessories and personalised little treasures — thoughtfully crafted by Sahara.',
  about_text text not null default 'Welcome to Made for You by Sahara, a little creative space dedicated to handmade crochet creations.',
  featured_product_ids text[] not null default '{}',
  faq jsonb not null default '[]'::jsonb check (jsonb_typeof(faq) = 'array'),
  footer_text text not null default 'Handmade with Love',
  storefront_visible boolean not null default true,
  seo_title text not null default 'Made for You by Sahara | Handmade Crochet Gifts',
  seo_description text not null default 'Shop handmade crochet flower keychains, bows, hairbands and flower garlands.',
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values ('storefront') on conflict (id) do nothing;
update public.site_settings
set faq = '[
  {"question":"Are your products handmade?","answer":"Yes! Our crochet creations are handmade with love."},
  {"question":"Can I choose different colours?","answer":"Yes, you can share your preferred colour. Availability is confirmed when we review your request."},
  {"question":"Do you accept custom orders?","answer":"Customisation is available for selected products, subject to confirmation."},
  {"question":"How do I place an order?","answer":"Choose a product and complete our Google Form. Sahara will contact you to confirm the details."},
  {"question":"How long will delivery take?","answer":"Delivery timing and charges are confirmed after reviewing your order and location."},
  {"question":"What payment methods do you accept?","answer":"Payment options are discussed when your order request is confirmed."},
  {"question":"What if my item arrives damaged or incorrect?","answer":"Email madeforyoubysahara@gmail.com promptly with your order details. We review concerns fairly and provide remedies in line with applicable consumer law."},
  {"question":"Can I cancel or return an order?","answer":"Requests are considered case by case, especially for personalised items. See our Ordering, Delivery, Cancellations & Returns policy for details."}
]'::jsonb
where id = 'storefront' and faq = '[]'::jsonb;

create table if not exists public.admin_activity (
  id bigint generated always as identity primary key,
  actor_email text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_activity_created_idx on public.admin_activity (created_at desc);

insert into public.categories (name, slug) values
  ('Keychains', 'keychains'),
  ('Hair Accessories', 'hair-accessories')
on conflict (slug) do nothing;

insert into public.products (
  id, name, slug, category, description, tagline, price, images, image_alt,
  colors, custom_options, order_form_available, available, featured, status, tags
) values
  (
    'flower-keychain', 'Crochet Flower Keychain', 'crochet-flower-keychain', 'Keychains',
    'Carry a little flower wherever you go! Charming handmade crochet flowers for keys, handbags and thoughtful gifts.',
    'Small gift, big love!', 150, '["/products/flower-keychain.jpeg"]'::jsonb,
    '["Handmade crochet flower keychain"]'::jsonb, array['Different colours on request'], array['Personalised colour'],
    true,
    true, false, 'published', array['flower', 'keychain']
  ),
  (
    'bow-keychain', 'Crochet Bow Keychain', 'crochet-bow-keychain', 'Keychains',
    'Small accessory, big charm! Add a cute handmade bow to your everyday essentials.',
    'A little bow, a lot of handmade love!', 39, '["/products/bow-keychain-product-only.png"]'::jsonb,
    '["Handmade crochet bow keychain"]'::jsonb, array['Different colours on request'], '{}', true,
    true, false, 'published', array['bow', 'keychain']
  ),
  (
    'hairband', 'Handmade Crochet Hairband', 'handmade-crochet-hairband', 'Hair Accessories',
    'Add a touch of handmade charm to your everyday hairstyle. Flower customisation option available; additional cost to be confirmed.',
    'Stay stylish, stay handmade!', 50, '["/products/hairband-flat.png"]'::jsonb,
    '["Handmade green crochet hairband photographed on a flat surface"]'::jsonb, array['Different colours on request'],
    array['Flower customisation; additional cost to be confirmed'], true, true, false, 'published', array['hairband']
  ),
  (
    'hair-garland', 'Crochet Flower Hair Garland', 'crochet-flower-hair-garland', 'Hair Accessories',
    'Make your hair bloom with handmade charm! A delicate floral touch with personalised flower colour combinations.',
    'Make your hair bloom with handmade charm!', 99, '["/products/garland-flat-product-only.png"]'::jsonb,
    '["Handmade crochet flower hair garland photographed on a flat surface"]'::jsonb,
    array['Different flower combinations on request'], array['Personalised flower colour combinations'], true,
    true, false, 'published', array['flowers', 'garland']
  )
on conflict (id) do nothing;

alter table public.admin_users enable row level security;
alter table public.admin_login_attempts enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_activity enable row level security;

drop policy if exists "Public can read approved reviews" on public.reviews;
create policy "Public can read approved reviews"
  on public.reviews for select to anon, authenticated
  using (status = 'approved' and publication_consent = true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
