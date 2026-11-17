'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity, Archive, ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, CircleAlert,
  Clipboard, Eye, FileImage, Flower2, LayoutDashboard, LogOut, MessageSquareQuote,
  Package, Plus, Search, Settings, ShoppingBag, Sparkles, Upload, X,
} from 'lucide-react';

type ProductRow = {
  id: string;
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
  archived_at: string | null;
  updated_at: string;
};
type ProductImage = { url: string; alt: string };
type ProductFormState = Omit<ProductRow, 'id' | 'archived_at' | 'updated_at' | 'images' | 'image_alt' | 'colors' | 'custom_options' | 'tags'> & {
  id?: string;
  images: ProductImage[];
  colorsText: string;
  customText: string;
  tagsText: string;
};
type ReviewRow = {
  id: string;
  display_name: string;
  product_id: string | null;
  rating: number;
  review_text: string;
  submitted_at: string;
  publication_consent: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
};
type CategoryRow = { id: string; name: string; slug: string };
type MediaRow = { url: string; alt: string; productId: string | null; productName: string | null };
type ActivityRow = { id: number; actor_email: string; action: string; entity_type: string; summary: string; created_at: string };
type SiteForm = {
  business_name: string;
  business_email: string;
  announcement: string;
  hero_heading: string;
  hero_subtitle: string;
  about_text: string;
  footer_text: string;
  storefront_visible: boolean;
  seo_title: string;
  seo_description: string;
  featured_product_ids: string[];
  faq: Array<{ question: string; answer: string }>;
};
type Section = 'overview' | 'products' | 'reviews' | 'content' | 'categories' | 'media' | 'activity' | 'settings';

const blankProduct = (): ProductFormState => ({
  name: '',
  slug: '',
  category: 'Keychains',
  description: '',
  tagline: '',
  price: 0,
  compare_at_price: null,
  images: [],
  colorsText: '',
  customText: '',
  tagsText: '',
  order_form_available: false,
  available: true,
  featured: false,
  status: 'draft',
});

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: 'same-origin' });
  let result: { error?: string } & Record<string, unknown>;
  try {
    result = await response.json() as typeof result;
  } catch {
    throw new Error('The server returned an unreadable response.');
  }
  if (!response.ok) throw new Error(result.error ?? `Request failed (${response.status}).`);
  return result as T;
}

function uploadFile<T>(path: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<T>((resolve, reject) => {
    const body = new FormData();
    body.set('file', file);
    const request = new XMLHttpRequest();
    request.open('POST', path);
    request.withCredentials = true;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error('Image upload could not reach the server.'));
    request.onload = () => {
      let result: { error?: string } & Record<string, unknown>;
      try {
        result = JSON.parse(request.responseText) as typeof result;
      } catch {
        reject(new Error('The server returned an unreadable upload response.'));
        return;
      }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(result.error ?? `Image upload failed (${request.status}).`));
        return;
      }
      onProgress(100);
      resolve(result as T);
    };
    request.send(body);
  });
}

function toProductForm(product: ProductRow): ProductFormState {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    description: product.description,
    tagline: product.tagline,
    price: product.price,
    compare_at_price: product.compare_at_price,
    images: product.images.map((url, index) => ({ url, alt: product.image_alt?.[index] ?? '' })),
    colorsText: (product.colors ?? []).join('\n'),
    customText: (product.custom_options ?? []).join('\n'),
    tagsText: (product.tags ?? []).join(', '),
    order_form_available: product.order_form_available,
    available: product.available,
    featured: product.featured,
    status: product.status,
  };
}

function toProductPayload(form: ProductFormState) {
  return {
    ...form,
    images: form.images.map((image) => image.url),
    image_alt: form.images.map((image) => image.alt),
    colors: form.colorsText.split('\n').map((item) => item.trim()).filter(Boolean),
    custom_options: form.customText.split('\n').map((item) => item.trim()).filter(Boolean),
    tags: form.tagsText.split(',').map((item) => item.trim()).filter(Boolean),
  };
}

export default function AdminApp({ email }: { email: string }) {
  const [section, setSection] = useState<Section>('overview');
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [site, setSite] = useState<SiteForm | null>(null);
  const [editing, setEditing] = useState<ProductFormState | null>(null);
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | ReviewRow['status']>('all');
  const [reviewRating, setReviewRating] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError('');
    const [productsResult, reviewsResult, categoriesResult, contentResult, activityResult, mediaResult] = await Promise.all([
      api<{ products: ProductRow[] }>('/api/admin/products'),
      api<{ reviews: ReviewRow[] }>('/api/admin/reviews'),
      api<{ categories: CategoryRow[] }>('/api/admin/categories'),
      api<{ content: SiteForm }>('/api/admin/content'),
      api<{ activity: ActivityRow[] }>('/api/admin/activity'),
      api<{ media: MediaRow[] }>('/api/admin/media'),
    ]);
    setProducts(productsResult.products);
    setReviews(reviewsResult.reviews);
    setCategories(categoriesResult.categories);
    setSite({
      ...contentResult.content,
      faq: contentResult.content.faq ?? [],
      featured_product_ids: contentResult.content.featured_product_ids ?? [],
    });
    setActivity(activityResult.activity);
    setMedia(mediaResult.media);
  }, []);

  useEffect(() => {
    refresh().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load the dashboard.'))
      .finally(() => setLoading(false));
  }, [refresh]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesText = `${product.name} ${product.category} ${product.slug}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = productFilter === 'all'
      || (productFilter === 'archived' ? Boolean(product.archived_at) : !product.archived_at && product.status === productFilter);
    return matchesText && matchesFilter;
  }).sort((a, b) => a.name.localeCompare(b.name)), [products, productFilter, search]);

  function showError(reason: unknown) {
    setError(reason instanceof Error ? reason.message : 'Something went wrong.');
    setNotice('');
  }
  function showSuccess(message: string) {
    setNotice(message);
    setError('');
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const payload = toProductPayload(editing);
      if (editing.id) {
        await api(`/api/admin/products/${encodeURIComponent(editing.id)}`, {
          method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
        });
        showSuccess('Product saved. Published updates are now visible on the storefront.');
      } else {
        await api('/api/admin/products', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
        });
        showSuccess('Product created.');
      }
      setEditing(null);
      await refresh();
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function archiveProduct(product: ProductRow) {
    const action = product.archived_at ? 'restore' : 'archive';
    if (action === 'archive' && !window.confirm(`Archive “${product.name}”? It will disappear from the public catalogue.`)) return;
    setBusy(true);
    try {
      await api(`/api/admin/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }),
      });
      showSuccess(action === 'archive' ? 'Product archived.' : 'Product restored.');
      await refresh();
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file: File, attachToProduct: boolean, onProgress: (progress: number) => void) {
    const result = await uploadFile<{ image: { url: string; alt: string } }>('/api/admin/media', file, onProgress);
    if (attachToProduct) {
      setEditing((current) => current ? { ...current, images: [...current.images, result.image] } : current);
    }
    await refresh();
    showSuccess('Image uploaded to the secure product library.');
  }

  async function saveSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!site) return;
    setBusy(true);
    try {
      await api('/api/admin/content', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...site, faq_json: JSON.stringify(site.faq) }),
      });
      showSuccess('Website content saved and synchronized.');
      await refresh();
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function updateReview(review: ReviewRow, status: ReviewRow['status']) {
    setBusy(true);
    try {
      await api(`/api/admin/reviews/${encodeURIComponent(review.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...review, status }),
      });
      showSuccess(`Review ${status}.`);
      await refresh();
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function saveReview(review: ReviewRow, changes: Pick<ReviewRow, 'display_name' | 'product_id' | 'rating' | 'review_text' | 'publication_consent'>) {
    setBusy(true);
    try {
      await api(`/api/admin/reviews/${encodeURIComponent(review.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...review, ...changes }),
      });
      showSuccess('Review details saved.');
      await refresh();
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function createReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api('/api/admin/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          display_name: form.get('display_name'),
          product_id: form.get('product_id'),
          rating: Number(form.get('rating')),
          review_text: form.get('review_text'),
          publication_consent: form.get('publication_consent') === 'on',
          status: 'pending',
        }),
      });
      event.currentTarget.reset();
      showSuccess('Review added as pending moderation.');
      await refresh();
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api('/api/admin/categories', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: form.get('name') }),
      });
      event.currentTarget.reset();
      showSuccess('Category added.');
      await refresh();
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function deleteMedia(url: string) {
    if (!window.confirm('Delete this unused uploaded image permanently?')) return;
    const parsed = new URL(url);
    const prefix = '/storage/v1/object/public/product-images/';
    if (!parsed.pathname.includes(prefix)) {
      showError(new Error('Only uploaded product-library images can be deleted.'));
      return;
    }
    const path = parsed.pathname.split(prefix)[1];
    setBusy(true);
    try {
      await api(`/api/admin/media?path=${encodeURIComponent(decodeURIComponent(path))}`, { method: 'DELETE' });
      showSuccess('Image deleted.');
      await refresh();
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await api('/api/admin/logout', { method: 'POST' });
      window.location.assign('/admin');
    } catch (reason) {
      showError(reason);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get('current_password') ?? '');
    const newPassword = String(form.get('new_password') ?? '');
    const confirmation = String(form.get('confirm_password') ?? '');
    if (newPassword !== confirmation) {
      showError(new Error('New password and confirmation do not match.'));
      return;
    }
    setBusy(true);
    try {
      await api('/api/admin/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      window.location.assign('/admin');
    } catch (reason) {
      showError(reason);
      setBusy(false);
    }
  }

  const pendingReviews = reviews.filter((review) => review.status === 'pending').length;
  const nav: Array<{ id: Section; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Flower2 },
    { id: 'media', label: 'Media library', icon: FileImage },
    { id: 'reviews', label: 'Reviews', icon: MessageSquareQuote },
    { id: 'content', label: 'Website content', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'activity', label: 'Activity log', icon: Activity },
  ];

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <a href="/" className="admin-brand"><span className="admin-brand-mark">✿</span><span>Made for You<small>by Sahara</small></span></a>
      <p className="admin-side-label">WORKSPACE</p>
      <nav aria-label="Admin dashboard">
        {nav.map(({ id, label, icon: Icon }) => <button key={id} className={section === id ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => { setSection(id); setEditing(null); }}>
          <Icon size={18}/><span>{label}</span>
          {id === 'reviews' && pendingReviews > 0 && <span className="admin-nav-count">{pendingReviews}</span>}
        </button>)}
      </nav>
      <div className="admin-sidebar-bottom">
        <a href="/" target="_blank" rel="noreferrer"><Eye size={17}/> View website</a>
        <button onClick={logout}><LogOut size={17}/> Sign out</button>
      </div>
    </aside>
    <main className="admin-main">
      <header className="admin-topbar"><div><p className="admin-eyebrow">MADE FOR YOU BY SAHARA</p><h1>{editing ? (editing.id ? 'Edit product' : 'Add product') : nav.find((item) => item.id === section)?.label}</h1></div>
        <div className="admin-top-actions"><a className="admin-outline-button" href="/" target="_blank" rel="noreferrer"><Eye size={16}/> Preview site</a><span className="admin-avatar">{email.slice(0, 1).toUpperCase()}</span><span className="admin-user-email">{email}</span></div>
      </header>
      {(notice || error) && <div className={error ? 'admin-flash error' : 'admin-flash'} role={error ? 'alert' : 'status'}>{error ? <CircleAlert size={18}/> : <Check size={18}/>}<span>{error || notice}</span><button aria-label="Dismiss" onClick={() => { setError(''); setNotice(''); }}><X size={17}/></button></div>}
      {loading ? <div className="admin-loading">Loading your workspace…</div> : editing
        ? <ProductEditor
          form={editing}
          categories={categories}
          busy={busy}
          onChange={setEditing}
          onSubmit={saveProduct}
          onCancel={() => setEditing(null)}
          onUpload={(file, onProgress) => uploadImage(file, true, onProgress)}
        />
        : <section className="admin-section">
          {section === 'overview' && <Overview products={products} reviews={reviews} activity={activity} onNavigate={setSection} onAdd={() => setEditing(blankProduct())}/>}
          {section === 'products' && <ProductsSection
            products={visibleProducts}
            allCount={products.length}
            search={search}
            filter={productFilter}
            busy={busy}
            onSearch={setSearch}
            onFilter={setProductFilter}
            onAdd={() => setEditing(blankProduct())}
            onEdit={(product) => setEditing(toProductForm(product))}
            onArchive={archiveProduct}
            onDuplicate={(product) => setEditing({ ...toProductForm(product), id: undefined, name: `${product.name} copy`, slug: `${product.slug}-copy`, status: 'draft', order_form_available: false })}
          />}
          {section === 'reviews' && <ReviewsSection reviews={reviews} products={products} filter={reviewFilter} ratingFilter={reviewRating} busy={busy} onFilter={setReviewFilter} onRatingFilter={setReviewRating} onCreate={createReview} onUpdate={updateReview} onSave={saveReview}/>}
          {section === 'content' && site && <ContentSection site={site} products={products} busy={busy} onChange={setSite} onSubmit={saveSite}/>}
          {section === 'settings' && site && <SettingsSection site={site} busy={busy} onChange={setSite} onSubmit={saveSite} onPasswordChange={changePassword}/>}
          {section === 'categories' && <CategoriesSection categories={categories} products={products} busy={busy} onSubmit={addCategory}/>}
          {section === 'media' && <MediaSection media={media} busy={busy} onUpload={(file, onProgress) => uploadImage(file, false, onProgress)} onDelete={deleteMedia}/>}
          {section === 'activity' && <ActivitySection activity={activity}/>}
        </section>}
    </main>
  </div>;
}

function Overview({ products, reviews, activity, onNavigate, onAdd }: {
  products: ProductRow[]; reviews: ReviewRow[]; activity: ActivityRow[];
  onNavigate: (section: Section) => void; onAdd: () => void;
}) {
  const active = products.filter((product) => !product.archived_at && product.status === 'published').length;
  const unavailable = products.filter((product) => !product.archived_at && !product.available).length;
  const featured = products.filter((product) => !product.archived_at && product.featured).length;
  return <>
    <div className="admin-welcome"><div><p className="admin-eyebrow">YOUR LITTLE BOUTIQUE, AT A GLANCE</p><h2>Good things are growing <span>♡</span></h2><p>Manage your handmade collection and keep your storefront up to date.</p></div><button className="admin-primary" onClick={onAdd}><Plus size={17}/> Add a product</button></div>
    <div className="admin-stat-grid">
      <Stat icon={Package} label="Total products" value={products.filter((product) => !product.archived_at).length} tone="rose"/>
      <Stat icon={ShoppingBag} label="Published" value={active} tone="green"/>
      <Stat icon={CircleAlert} label="Out of stock" value={unavailable} tone="amber"/>
      <Stat icon={Sparkles} label="Featured" value={featured} tone="lilac"/>
      <Stat icon={MessageSquareQuote} label="Pending reviews" value={reviews.filter((review) => review.status === 'pending').length} tone="blue"/>
    </div>
    <div className="admin-overview-grid">
      <div className="admin-card"><div className="admin-card-title"><div><p className="admin-eyebrow">CATALOGUE</p><h3>Recently updated</h3></div><button className="admin-text-button" onClick={() => onNavigate('products')}>All products <ArrowLeft size={15}/></button></div>
        {products.filter((product) => !product.archived_at).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5).map((product) => <div className="admin-recent-row" key={product.id}><div className="admin-product-thumb">{product.images[0] ? <img src={product.images[0]} alt=""/> : <Flower2 size={20}/>}</div><div><strong>{product.name}</strong><small>₹{product.price} · {product.category}</small></div><span className={`admin-status ${product.status}`}>{product.status}</span></div>)}
        {products.length === 0 && <div className="admin-empty">Your products will appear here after they are loaded.</div>}
      </div>
      <div className="admin-card"><div className="admin-card-title"><div><p className="admin-eyebrow">QUICK ACTIONS</p><h3>What would you like to do?</h3></div></div>
        <div className="admin-quick-actions">
          <button onClick={onAdd}><Plus/><span><strong>Add a product</strong><small>Create a new catalogue listing</small></span></button>
          <button onClick={() => onNavigate('media')}><Upload/><span><strong>Upload a photo</strong><small>Add an original product image</small></span></button>
          <button onClick={() => onNavigate('reviews')}><MessageSquareQuote/><span><strong>Review feedback</strong><small>{reviews.filter((review) => review.status === 'pending').length} pending for moderation</small></span></button>
          <button onClick={() => onNavigate('content')}><Sparkles/><span><strong>Edit website content</strong><small>Update homepage copy and FAQs</small></span></button>
        </div>
        <div className="admin-form-note"><CircleAlert size={16}/> We do not display sales or revenue metrics because orders are received through Google Forms.</div>
      </div>
    </div>
    <div className="admin-card admin-activity-preview"><div className="admin-card-title"><div><p className="admin-eyebrow">OWNER ACTIONS</p><h3>Recent activity</h3></div><button className="admin-text-button" onClick={() => onNavigate('activity')}>View log <ArrowLeft size={15}/></button></div>
      {activity.slice(0, 4).map((item) => <div className="admin-activity-row" key={item.id}><span className="admin-activity-dot"/><span>{item.summary}</span><time>{new Date(item.created_at).toLocaleString('en-IN')}</time></div>)}
      {!activity.length && <p className="admin-muted">Important changes will be recorded here.</p>}
    </div>
  </>;
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Package; label: string; value: number; tone: string }) {
  return <div className="admin-stat-card"><span className={`admin-stat-icon ${tone}`}><Icon size={19}/></span><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function ProductsSection({ products, allCount, search, filter, busy, onSearch, onFilter, onAdd, onEdit, onArchive, onDuplicate }: {
  products: ProductRow[]; allCount: number; search: string; filter: 'all' | 'published' | 'draft' | 'archived'; busy: boolean;
  onSearch: (value: string) => void; onFilter: (value: 'all' | 'published' | 'draft' | 'archived') => void;
  onAdd: () => void; onEdit: (product: ProductRow) => void; onArchive: (product: ProductRow) => void; onDuplicate: (product: ProductRow) => void;
}) {
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc' | 'updated'>('name');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  useEffect(() => { setPage(1); }, [search, filter]);
  const sorted = [...products].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'updated') return b.updated_at.localeCompare(a.updated_at);
    return a.name.localeCompare(b.name);
  });
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageProducts = sorted.slice((page - 1) * pageSize, page * pageSize);
  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">YOUR COLLECTION</p><h2>Products <span className="admin-count">{allCount}</span></h2><p>Manage prices, photos, availability and what customers can see.</p></div><button className="admin-primary" onClick={onAdd}><Plus size={17}/> Add product</button></div>
    <div className="admin-toolbar"><label className="admin-search"><Search size={17}/><input aria-label="Search products" placeholder="Search products…" value={search} onChange={(event) => onSearch(event.target.value)}/></label>
      <label className="admin-select-label">Show <select value={filter} onChange={(event) => onFilter(event.target.value as typeof filter)}><option value="all">All products</option><option value="published">Published</option><option value="draft">Drafts</option><option value="archived">Archived</option></select></label>
      <label className="admin-select-label">Sort <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="name">Name</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="updated">Recently updated</option></select></label>
    </div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
      {pageProducts.map((product) => <tr key={product.id}><td><div className="admin-table-product"><div className="admin-product-thumb">{product.images[0] ? <img src={product.images[0]} alt=""/> : <Flower2 size={20}/>}</div><div><strong>{product.name}</strong><small>{product.slug}</small></div></div></td><td>{product.category}</td><td>₹{product.price}</td>
        <td><span className={`admin-status ${product.archived_at ? 'archived' : product.status}`}>{product.archived_at ? 'Archived' : product.status}</span>{!product.available && !product.archived_at && <small className="admin-stock-note">Out of stock</small>}</td>
        <td>{new Date(product.updated_at).toLocaleDateString('en-IN')}</td>
        <td><div className="admin-row-actions"><button title="Edit product" aria-label={`Edit ${product.name}`} onClick={() => onEdit(product)}><Settings size={16}/></button><button title="Duplicate product" aria-label={`Duplicate ${product.name}`} onClick={() => onDuplicate(product)}><Clipboard size={16}/></button><button title={product.archived_at ? 'Restore product' : 'Archive product'} aria-label={`${product.archived_at ? 'Restore' : 'Archive'} ${product.name}`} disabled={busy} onClick={() => onArchive(product)}>{product.archived_at ? <ArrowDown size={16}/> : <Archive size={16}/>}</button></div></td>
      </tr>)}
      {!products.length && <tr><td colSpan={6}><div className="admin-empty">{allCount ? 'No products match these filters.' : 'No products have been loaded.'}</div></td></tr>}
    </tbody></table></div>
    <div className="admin-pagination"><span>Showing {sorted.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}</span><div><button className="admin-outline-button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button className="admin-outline-button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
    <p className="admin-caption">Showing filtered products from up to 1,000 loaded records. Google Forms option matching must be confirmed before new listings can be selected in that form.</p>
  </>;
}

function ProductEditor({ form, categories, busy, onChange, onSubmit, onCancel, onUpload }: {
  form: ProductFormState; categories: CategoryRow[]; busy: boolean; onChange: (value: ProductFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void;
  onUpload: (file: File, onProgress: (progress: number) => void) => Promise<void>;
}) {
  const update = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => onChange({ ...form, [key]: value });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [preview, setPreview] = useState(false);
  async function handleUpload(file?: File) {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadError('');
    try { await onUpload(file, setUploadProgress); }
    catch (reason) { setUploadError(reason instanceof Error ? reason.message : 'Image upload failed.'); }
    finally { setUploading(false); }
  }
  return <form className="admin-product-editor" onSubmit={onSubmit}>
    <div className="admin-editor-toolbar"><button type="button" className="admin-back-button" onClick={onCancel}><ArrowLeft size={17}/> Back to products</button><div><button type="button" className="admin-outline-button" onClick={() => setPreview(!preview)}><Eye size={15}/>{preview ? 'Hide preview' : 'Preview'}</button><button type="button" className="admin-outline-button" onClick={onCancel}>Cancel</button><button className="admin-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></div></div>
    {preview && <div className="admin-product-preview"><div className="admin-preview-photo">{form.images[0]?.url ? <img src={form.images[0].url} alt={form.images[0].alt}/> : <Flower2 size={30}/>}</div><div><span className="product-category">{form.category || 'Category'}</span><h2>{form.name || 'Product name'}</h2><p>{form.tagline || 'Short description preview'}</p><strong>₹{form.price}</strong><p>{form.description || 'Product description preview'}</p><span className={`admin-status ${form.status}`}>{form.status}</span></div></div>}
    <div className="admin-editor-grid">
      <div className="admin-editor-primary">
        <div className="admin-card"><h3>Product details</h3><div className="admin-form-grid">
          <label className="wide">Product name<input required maxLength={120} value={form.name} onChange={(event) => update('name', event.target.value)} onBlur={() => !form.id && !form.slug && update('slug', form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}/></label>
          <label>Product slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={100} value={form.slug} onChange={(event) => update('slug', event.target.value.toLowerCase())}/></label>
          <label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}{!categories.some((category) => category.name === form.category) && <option value={form.category}>{form.category}</option>}</select></label>
          <label>Price (INR)<input type="number" min="0" max="1000000" step="0.01" required value={form.price} onChange={(event) => update('price', Number(event.target.value))}/></label>
          <label>Compare-at price (optional)<input type="number" min="0" max="1000000" step="0.01" value={form.compare_at_price ?? ''} onChange={(event) => update('compare_at_price', event.target.value ? Number(event.target.value) : null)}/></label>
          <label className="wide">Short description<input maxLength={240} required value={form.tagline} onChange={(event) => update('tagline', event.target.value)}/></label>
          <label className="wide">Product description<textarea rows={5} maxLength={3000} required value={form.description} onChange={(event) => update('description', event.target.value)}/></label>
        </div></div>
        <div className="admin-card"><div className="admin-card-title"><div><h3>Product photography</h3><p>Use your own product-only photographs. JPG, PNG or WebP up to 4 MB.</p></div><label className="admin-upload-button"><Upload size={16}/>{uploading ? 'Uploading…' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { void handleUpload(event.target.files?.[0]); event.currentTarget.value = ''; }}/></label></div>
          {uploadError && <p className="admin-error" role="alert">{uploadError}</p>}
          {uploading && <div className="admin-upload-progress" role="status"><span>Uploading {uploadProgress}%</span><progress max="100" value={uploadProgress}/></div>}
          <div className="admin-image-list">{form.images.map((image, index) => <div className="admin-image-row" key={`${image.url}-${index}`}><div className="admin-image-preview"><img src={image.url} alt={image.alt}/></div><div className="admin-image-fields"><small>Image {index + 1}{index === 0 ? ' · Main photo' : ''}</small><input aria-label={`Image ${index + 1} URL`} value={image.url} onChange={(event) => update('images', form.images.map((item, current) => current === index ? { ...item, url: event.target.value } : item))}/><input aria-label={`Image ${index + 1} alt text`} placeholder="Describe this product photo" maxLength={250} value={image.alt} onChange={(event) => update('images', form.images.map((item, current) => current === index ? { ...item, alt: event.target.value } : item))}/></div><div className="admin-image-actions"><button type="button" title="Move image up" aria-label="Move image up" disabled={index === 0} onClick={() => { const images = [...form.images]; [images[index - 1], images[index]] = [images[index], images[index - 1]]; update('images', images); }}><ArrowUp size={16}/></button><button type="button" title="Move image down" aria-label="Move image down" disabled={index === form.images.length - 1} onClick={() => { const images = [...form.images]; [images[index + 1], images[index]] = [images[index], images[index + 1]]; update('images', images); }}><ArrowDown size={16}/></button><button type="button" title="Remove image" aria-label="Remove image" onClick={() => update('images', form.images.filter((_, current) => current !== index))}><X size={16}/></button></div></div>)}
            {!form.images.length && <p className="admin-empty">Upload or add a photo. At least one product image is required.</p>}
          </div>
        </div>
        <div className="admin-card"><h3>Options and tags</h3><div className="admin-form-grid"><label>Available colours <small>One per line</small><textarea rows={3} value={form.colorsText} onChange={(event) => update('colorsText', event.target.value)}/></label><label>Customisation options <small>One per line</small><textarea rows={3} value={form.customText} onChange={(event) => update('customText', event.target.value)}/></label><label className="wide">Tags <small>Comma separated</small><input value={form.tagsText} onChange={(event) => update('tagsText', event.target.value)}/></label></div></div>
      </div>
      <aside className="admin-editor-aside">
        <div className="admin-card"><h3>Publishing</h3><label className="admin-check-row"><input type="checkbox" checked={form.status === 'published'} onChange={(event) => update('status', event.target.checked ? 'published' : 'draft')}/><span><strong>Published</strong><small>Published changes appear on the public catalogue.</small></span></label><label className="admin-check-row"><input type="checkbox" checked={form.available} onChange={(event) => update('available', event.target.checked)}/><span><strong>In stock</strong><small>Out-of-stock products stay visible but cannot be ordered.</small></span></label><label className="admin-check-row"><input type="checkbox" checked={form.featured} onChange={(event) => update('featured', event.target.checked)}/><span><strong>Featured</strong><small>Mark this product as featured.</small></span></label></div>
        <div className="admin-card"><h3>Google Order Form</h3><p className="admin-form-note"><CircleAlert size={16}/> Google Forms dropdowns may reject unknown product values. New products stay unchecked until their option is added and tested in the form.</p><label className="admin-check-row"><input type="checkbox" checked={form.order_form_available} onChange={(event) => update('order_form_available', event.target.checked)}/><span><strong>Product is an exact form option</strong><small>Only check after confirming the product name matches the Google Form choice.</small></span></label></div>
      </aside>
    </div>
    <div className="admin-editor-footer"><button type="button" className="admin-outline-button" onClick={onCancel}>Cancel</button><button className="admin-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></div>
  </form>;
}

function ReviewsSection({ reviews, products, filter, ratingFilter, busy, onFilter, onRatingFilter, onCreate, onUpdate, onSave }: {
  reviews: ReviewRow[]; products: ProductRow[]; filter: 'all' | ReviewRow['status'];
  ratingFilter: 'all' | '1' | '2' | '3' | '4' | '5'; busy: boolean;
  onFilter: (value: 'all' | ReviewRow['status']) => void;
  onRatingFilter: (value: 'all' | '1' | '2' | '3' | '4' | '5') => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: (review: ReviewRow, status: ReviewRow['status']) => void;
  onSave: (review: ReviewRow, changes: Pick<ReviewRow, 'display_name' | 'product_id' | 'rating' | 'review_text' | 'publication_consent'>) => void;
}) {
  const filtered = reviews.filter((review) =>
    (filter === 'all' || review.status === filter) &&
    (ratingFilter === 'all' || review.rating === Number(ratingFilter)),
  );
  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">REAL CUSTOMER WORDS</p><h2>Reviews</h2><p>Only publish genuine customer feedback with explicit permission. Private Google Sheets are not imported.</p></div></div>
    <form className="admin-card admin-inline-review-form" onSubmit={onCreate}><h3>Add a verified review</h3><div className="admin-form-grid"><label>Approved display name<input name="display_name" required maxLength={80}/></label><label>Product<select name="product_id"><option value="">General review</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label>Rating<select name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}</select></label><label className="wide">Review text<textarea name="review_text" required maxLength={1200} rows={3}/></label><label className="admin-check-row wide"><input name="publication_consent" type="checkbox"/><span><strong>Customer gave explicit permission to publish this review</strong><small>Review remains pending until approved.</small></span></label></div><button className="admin-primary" disabled={busy}><Plus size={16}/> Add as pending</button></form>
    <div className="admin-toolbar"><p>{reviews.length} genuine review record{reviews.length === 1 ? '' : 's'}</p><div className="admin-toolbar-filters"><label className="admin-select-label">Status <select value={filter} onChange={(event) => onFilter(event.target.value as typeof filter)}><option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="hidden">Hidden</option></select></label><label className="admin-select-label">Rating <select value={ratingFilter} onChange={(event) => onRatingFilter(event.target.value as typeof ratingFilter)}><option value="all">All ratings</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}</select></label></div></div>
    <div className="admin-review-list">{filtered.map((review) => <ReviewCard key={review.id} review={review} products={products} busy={busy} onUpdate={onUpdate} onSave={onSave}/>)}
      {!filtered.length && <div className="admin-empty admin-card">No reviews in this filter. No private form responses have been fetched.</div>}
    </div>
  </>;
}

function ReviewCard({ review, products, busy, onUpdate, onSave }: {
  review: ReviewRow; products: ProductRow[]; busy: boolean;
  onUpdate: (review: ReviewRow, status: ReviewRow['status']) => void;
  onSave: (review: ReviewRow, changes: Pick<ReviewRow, 'display_name' | 'product_id' | 'rating' | 'review_text' | 'publication_consent'>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(review.display_name);
  const [productId, setProductId] = useState(review.product_id ?? '');
  const [rating, setRating] = useState(review.rating);
  const [reviewText, setReviewText] = useState(review.review_text);
  const [consent, setConsent] = useState(review.publication_consent);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(review, {
      display_name: displayName,
      product_id: productId || null,
      rating,
      review_text: reviewText,
      publication_consent: consent,
    });
    setEditing(false);
  }

  return <article className="admin-card admin-review-card">
    <div className="admin-review-heading"><div><span className={`admin-status ${review.status}`}>{review.status}</span><strong>{review.display_name}</strong><small>{new Date(review.submitted_at).toLocaleDateString('en-IN')} · {products.find((product) => product.id === review.product_id)?.name ?? 'General review'}</small></div><div className="admin-review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div></div>
    {editing ? <form className="admin-review-edit" onSubmit={submit}><label>Display name<input required maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)}/></label><label>Product<select value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">General review</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label>Rating<select value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label><label>Review text<textarea required maxLength={1200} rows={3} value={reviewText} onChange={(event) => setReviewText(event.target.value)}/></label><label className="admin-check-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)}/><span><strong>Explicit publication consent</strong></span></label><div className="admin-review-actions"><button className="admin-primary small" disabled={busy}>Save review</button><button type="button" className="admin-outline-button" onClick={() => setEditing(false)}>Cancel</button></div></form> : <><blockquote>{review.review_text}</blockquote><p className={review.publication_consent ? 'admin-consent approved' : 'admin-consent'}>{review.publication_consent ? 'Explicit publication consent confirmed' : 'No publication consent — cannot approve'}</p><div className="admin-review-actions"><button className="admin-outline-button" onClick={() => setEditing(true)}>Edit</button>{review.status !== 'approved' && <button className="admin-primary small" disabled={busy || !review.publication_consent} onClick={() => onUpdate(review, 'approved')}><Check size={15}/> Approve</button>}{review.status !== 'rejected' && <button className="admin-outline-button" disabled={busy} onClick={() => onUpdate(review, 'rejected')}>Reject</button>}{review.status !== 'hidden' && <button className="admin-outline-button" disabled={busy} onClick={() => onUpdate(review, 'hidden')}>Hide</button>}</div></>}
  </article>;
}

function ContentSection({ site, products, busy, onChange, onSubmit }: {
  site: SiteForm; products: ProductRow[]; busy: boolean; onChange: (value: SiteForm) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return <form className="admin-content-form" onSubmit={onSubmit}>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">YOUR PUBLIC STOREFRONT</p><h2>Website content</h2><p>Plain text only; scripts and untrusted HTML are never rendered.</p></div><button className="admin-primary" disabled={busy}>{busy ? 'Publishing…' : 'Save and publish'}</button></div>
    <div className="admin-card"><h3>Homepage introduction</h3><div className="admin-form-grid"><label>Announcement banner<input maxLength={180} required value={site.announcement} onChange={(event) => onChange({ ...site, announcement: event.target.value })}/></label><label>Hero heading<input maxLength={180} required value={site.hero_heading} onChange={(event) => onChange({ ...site, hero_heading: event.target.value })}/></label><label className="wide">Hero subtitle<textarea rows={3} maxLength={500} required value={site.hero_subtitle} onChange={(event) => onChange({ ...site, hero_subtitle: event.target.value })}/></label><label className="wide">About the brand<textarea rows={5} maxLength={3000} required value={site.about_text} onChange={(event) => onChange({ ...site, about_text: event.target.value })}/></label><label className="wide">Footer text<input maxLength={300} required value={site.footer_text} onChange={(event) => onChange({ ...site, footer_text: event.target.value })}/></label></div></div>
    <div className="admin-card"><h3>Featured products</h3><p className="admin-muted">Choose items to mark for featured placement on the storefront.</p><div className="admin-featured-list">{products.filter((product) => !product.archived_at).map((product) => <label key={product.id}><input type="checkbox" checked={site.featured_product_ids.includes(product.id)} onChange={(event) => onChange({ ...site, featured_product_ids: event.target.checked ? [...site.featured_product_ids, product.id] : site.featured_product_ids.filter((id) => id !== product.id) })}/>{product.name}</label>)}</div></div>
    <div className="admin-card"><div className="admin-card-title"><div><h3>Frequently asked questions</h3><p>Keep to 30 questions; each answer can contain up to 1,000 characters.</p></div><button type="button" className="admin-outline-button" onClick={() => onChange({ ...site, faq: [...site.faq, { question: '', answer: '' }] })}><Plus size={15}/> Add FAQ</button></div>{site.faq.map((item, index) => <div className="admin-faq-row" key={index}><label>Question<input maxLength={240} value={item.question} onChange={(event) => onChange({ ...site, faq: site.faq.map((faq, current) => current === index ? { ...faq, question: event.target.value } : faq) })}/></label><label>Answer<textarea rows={2} maxLength={1000} value={item.answer} onChange={(event) => onChange({ ...site, faq: site.faq.map((faq, current) => current === index ? { ...faq, answer: event.target.value } : faq) })}/></label><button type="button" className="admin-icon-button" aria-label="Remove FAQ" onClick={() => onChange({ ...site, faq: site.faq.filter((_, current) => current !== index) })}><X size={17}/></button></div>)}</div>
    <div className="admin-card"><h3>Publishing status</h3><label className="admin-check-row"><input type="checkbox" checked={site.storefront_visible} onChange={(event) => onChange({ ...site, storefront_visible: event.target.checked })}/><span><strong>Storefront visible</strong><small>Turn off to show a temporary unavailable page to visitors.</small></span></label></div>
    <div className="admin-editor-footer"><button className="admin-primary" disabled={busy}>{busy ? 'Publishing…' : 'Save and publish'}</button></div>
  </form>;
}

function SettingsSection({ site, busy, onChange, onSubmit, onPasswordChange }: {
  site: SiteForm; busy: boolean; onChange: (value: SiteForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; onPasswordChange: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return <div className="admin-content-form">
    <form onSubmit={onSubmit}>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">STORE PREFERENCES</p><h2>Settings</h2><p>Business identity and search metadata for the public website.</p></div><button className="admin-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div>
    <div className="admin-card"><h3>Business details</h3><div className="admin-form-grid"><label>Business name<input required maxLength={120} value={site.business_name} onChange={(event) => onChange({ ...site, business_name: event.target.value })}/></label><label>Business email<input type="email" required maxLength={254} value={site.business_email} onChange={(event) => onChange({ ...site, business_email: event.target.value })}/></label><label>Default currency<input value="INR (₹)" readOnly/></label></div></div>
    <div className="admin-card"><h3>Search engine preview</h3><div className="admin-form-grid"><label className="wide">SEO title<input required maxLength={160} value={site.seo_title} onChange={(event) => onChange({ ...site, seo_title: event.target.value })}/></label><label className="wide">SEO description<textarea required rows={3} maxLength={320} value={site.seo_description} onChange={(event) => onChange({ ...site, seo_description: event.target.value })}/></label></div></div>
    <div className="admin-editor-footer"><button className="admin-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div>
    </form>
    <div className="admin-card"><h3>Change owner password</h3><p className="admin-muted">Use a unique password with at least 12 characters. This browser will be signed out after the change.</p><form className="admin-password-form" onSubmit={onPasswordChange}><label>Current password<input name="current_password" type="password" autoComplete="current-password" required maxLength={1024}/></label><label>New password<input name="new_password" type="password" autoComplete="new-password" required minLength={12} maxLength={1024}/></label><label>Confirm new password<input name="confirm_password" type="password" autoComplete="new-password" required minLength={12} maxLength={1024}/></label><button className="admin-primary" disabled={busy}>{busy ? 'Updating…' : 'Change password'}</button></form></div>
  </div>;
}

function CategoriesSection({ categories, products, busy, onSubmit }: {
  categories: CategoryRow[]; products: ProductRow[]; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">ORGANIZE THE COLLECTION</p><h2>Categories</h2><p>Create a category, then select it while editing a product.</p></div></div>
    <form className="admin-card admin-category-form" onSubmit={onSubmit}><label>New category name<input name="name" required maxLength={80} placeholder="e.g. Crochet Gifts"/></label><button className="admin-primary" disabled={busy}><Plus size={16}/> Add category</button></form>
    <div className="admin-category-grid">{categories.map((category) => <article className="admin-card admin-category-card" key={category.id}><span className="admin-category-icon"><Flower2/></span><div><h3>{category.name}</h3><p>{products.filter((product) => product.category === category.name && !product.archived_at).length} products</p></div><small>{category.slug}</small></article>)}</div>
  </>;
}

function MediaSection({ media, busy, onUpload, onDelete }: {
  media: MediaRow[]; busy: boolean; onUpload: (file: File, onProgress: (progress: number) => void) => Promise<void>; onDelete: (url: string) => void;
}) {
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadError('');
    try { await onUpload(file, setUploadProgress); }
    catch (reason) { setUploadError(reason instanceof Error ? reason.message : 'Image upload failed.'); }
    finally { setUploading(false); }
  }
  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); }
    catch { setUploadError('Clipboard access is unavailable. Copy the image URL from its details.'); }
  }
  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">ORIGINAL PRODUCT PHOTOGRAPHY</p><h2>Media library</h2><p>Only product-only images belong in the catalogue. Existing people/model photos are not used in the public product sections.</p></div><label className="admin-primary admin-upload-button"><Upload size={16}/>{uploading ? `Uploading ${uploadProgress}%…` : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || uploading} onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ''; }}/></label></div>
    {uploading && <div className="admin-upload-progress" role="status"><span>Uploading {uploadProgress}%</span><progress max="100" value={uploadProgress}/></div>}
    {uploadError && <p className="admin-error" role="alert">{uploadError}</p>}
    <div className="admin-media-grid">{media.map((image) => <article className="admin-media-card" key={image.url}><div className="admin-media-photo"><img src={image.url} alt={image.alt}/></div><div className="admin-media-meta"><strong>{image.productName ?? 'Unassigned product image'}</strong><small>{image.alt || 'Alt text not set on product'}</small><div><button className="admin-outline-button" onClick={() => void copy(image.url)}><Clipboard size={14}/> Copy URL</button>{!image.productId && <button className="admin-icon-button" disabled={busy} aria-label="Delete unused image" title="Delete unused image" onClick={() => onDelete(image.url)}><X size={16}/></button>}</div></div></article>)}</div>
    {!media.length && <div className="admin-empty admin-card">No cloud images yet. Upload an original product-only photo to start a media library.</div>}
    <p className="admin-caption">Images already attached to products cannot be deleted here. Remove them from the product first; unused uploaded files can be deleted from this library.</p>
  </>;
}

function ActivitySection({ activity }: { activity: ActivityRow[] }) {
  return <>
    <div className="admin-page-heading"><div><p className="admin-eyebrow">ACCOUNTABILITY</p><h2>Activity log</h2><p>Recent product, review, content and media changes.</p></div></div>
    <div className="admin-card admin-activity-list">{activity.map((item) => <div className="admin-activity-row" key={item.id}><span className="admin-activity-dot"/><div><strong>{item.summary}</strong><small>{item.actor_email} · {item.entity_type} · {item.action}</small></div><time>{new Date(item.created_at).toLocaleString('en-IN')}</time></div>)}{!activity.length && <div className="admin-empty">No activity recorded yet.</div>}</div>
  </>;
}
