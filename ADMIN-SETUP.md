# Owner admin dashboard setup

The dashboard is available at `/admin`. Product changes are stored in Supabase and are read by the public catalogue without a rebuild or redeployment. The existing Google Forms order and feedback links remain in use.

## 1. Create Supabase resources

1. Create a Supabase project and copy its project URL and **service-role** key from Project Settings → API.
2. Apply [`supabase/migrations/202611170001_admin_dashboard.sql`](./supabase/migrations/202611170001_admin_dashboard.sql) using the Supabase SQL Editor, or link the project with the Supabase CLI and run `supabase db push`.
3. The migration creates the product, category, review, admin-user, login-throttling, settings, and activity tables. It seeds the four current products at ₹150, ₹39, ₹50, and ₹99, plus their categories and product-only photographs. The existing bow and garland source photos remain untouched; additional local crops omit the limbs visible at the edges of those source frames.
4. It creates a public-read `product-images` storage bucket with JPG, PNG, and WebP content types and a 4 MB size limit. Public reads are needed for storefront images; only server-side service-role API calls can upload or delete objects. Never upload private customer or order files to this bucket.

All application tables have row-level security enabled. The application uses `SUPABASE_SERVICE_ROLE_KEY` only in server routes; do not add it to a `NEXT_PUBLIC_` variable, client component, browser request, or committed file.

## 2. Configure server and public environment

Copy `.env.example` to `.env.local` for local development and set:

- `SUPABASE_URL` — the project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — the server-only service-role key.
- `ADMIN_SESSION_SECRET` — at least 32 random bytes. Generate a value with `openssl rand -base64 48`.

Keep the existing public Google Forms variables and form-entry IDs configured as before, including `NEXT_PUBLIC_FORM_CUSTOMIZATION_ENTRY`. Add the same variables to Vercel Project Settings → Environment Variables for Production (and Preview only if you intend to use the admin there). Do not commit `.env.local`; use Vercel's encrypted environment-variable settings for deployment.

If Supabase is not configured, public pages keep the current local catalogue as a fallback, while admin API calls return a setup error. Product changes cannot be persisted until Supabase is configured.

## 3. Create the first owner account

From a trusted machine, run the setup script with the Supabase URL and service-role key available in the process environment:

```sh
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-server-only-service-role-key"
npm run admin:setup
unset SUPABASE_SERVICE_ROLE_KEY
```

The script prompts for the owner email and display name, then asks for the password without echoing it in an interactive terminal. Use a unique password with at least 12 characters. It stores a salted scrypt password hash, does not create a public registration route, and refuses duplicate email addresses. Never put the password or service-role key in source control, a `NEXT_PUBLIC_` variable, or a command-line argument.

Run the setup script in an interactive terminal; it refuses non-interactive input so the password cannot be echoed.

To reset the password for an existing owner, make the production Supabase URL and service-role key available in a trusted local terminal, then run:

```sh
npm run admin:reset-password
```

Enter the existing owner's email and a new password of at least 12 characters when prompted. The password is not echoed. This updates only the matching account in the Supabase project supplied to the command. Do not set an `ADMIN_PASSWORD` variable in Vercel: the app does not read one, and owner password hashes are stored in Supabase.

## 4. Sign in and operate the dashboard

Start locally with `npm run dev` and open `http://localhost:3000/admin`, or use `https://your-domain/admin` after deployment.

- Product editing supports drafts, publishing, price and description changes, stock/featured flags, categories, tags, colours, customisation, multiple images, alt text, image ordering, duplication, archive, and restore.
- Newly created products default to **not confirmed** as Google Form choices. Add the exact product name to the Google Form, test its option/prefill, and only then mark that product as an available form option in the dashboard. Otherwise, the order link avoids pre-filling an unknown dropdown value and adds a note where the configured notes field is available. Opening the form is not an order confirmation.
- Review moderation is manual. No Google Sheets response is imported. A review cannot be approved without explicit publication consent; do not add private contact or order details to review text.
- Website content fields are plain text. The editor supports the announcement, homepage heading and subtitle, about copy, FAQs, featured products, footer, store visibility, business name/email, and SEO metadata.
- Uploaded product photographs are persisted in Supabase Storage. Only JPG, PNG, and WebP up to 4 MB are accepted; the server checks the file signature as well as the declared MIME type.

Every admin mutation checks the signed session and same-origin request. Sessions use an HttpOnly, SameSite=Strict cookie, expire after eight hours, and are signed with `ADMIN_SESSION_SECRET`. Login attempts are throttled in the database (eight attempts per IP fingerprint per 15 minutes); only an HMAC fingerprint is stored. Changing `ADMIN_SESSION_SECRET` invalidates existing sessions. Rotate it in Vercel and redeploy to force sign-out.

## 5. Deploy and verify on Vercel

1. Push the project to the existing GitHub repository and import that repository into Vercel.
2. Set the server-only and public environment variables above in Vercel.
3. Deploy. The database and storage bucket are managed independently of Vercel deployments.
4. Sign in at `/admin`, change a draft product, publish it, and verify it appears at the public catalogue. Test archive/restore and an image upload before opening the store.
5. Test the order and review links from a public product page. Verify product dropdown options in Google Forms manually.

## Current limitations to understand

- External sign-in, storage upload, and publish behavior require a configured Supabase project and owner account; those cloud operations cannot be exercised without the project credentials.
- A `503` message saying sign-in is unavailable indicates a server configuration, database schema, or Supabase connectivity failure, not a rejected password. Check Vercel function logs for the `Admin login failed.` entry. Ensure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_SESSION_SECRET` (at least 32 bytes) are set for the Production environment, apply the migration to that same Supabase project, and redeploy after environment changes. Never share the service-role key or full environment values.
- Existing checked-in product photographs remain in `public/products`; new uploads go to Supabase Storage. Existing model/worn photographs remain in the repository but are intentionally excluded from the public product catalogue and About section. The admin upload guidance restricts newly managed imagery to product-only photographs; image-content screening is a human review, not automated image recognition.
- Reviews in private Google Forms/Sheets remain private and are never synchronized automatically.
- Orders still use Google Forms; there are no sales or revenue analytics.
- This single-owner setup uses a signed stateless session. Logging out clears the current browser cookie; changing the session secret invalidates all sessions. Changing the password signs out the current browser, while other existing sessions expire within eight hours. There is no separate per-device session-revocation screen.
- Product and audit rows are written as separate PostgREST operations. If the audit write fails after a product mutation, the API reports an error, but the product change may already have persisted; refresh the dashboard before retrying.
- Product-management search and status filtering run over the first 1,000 records returned by the admin API. The public catalogue is not limited by this admin screen limit.
