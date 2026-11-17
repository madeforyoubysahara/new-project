export class SupabaseError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'SupabaseError';
  }
}

function getCredentials() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new SupabaseError('Supabase server credentials are not configured.', 503);
  }
  return { url, key };
}

export async function supabaseRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; response: Response }> {
  const { url, key } = getCredentials();
  const headers = new Headers(init.headers);
  headers.set('apikey', key);
  headers.set('authorization', `Bearer ${key}`);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

  const response = await fetch(`${url}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new SupabaseError(`Supabase request failed (${response.status}): ${detail}`, response.status);
  }

  if (response.status === 204) return { data: undefined as T, response };
  const text = await response.text();
  return { data: text ? (JSON.parse(text) as T) : (undefined as T), response };
}

export function publicStorageUrl(path: string) {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  if (!url) throw new SupabaseError('Supabase URL is not configured.', 503);
  return `${url}/storage/v1/object/public/product-images/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}
