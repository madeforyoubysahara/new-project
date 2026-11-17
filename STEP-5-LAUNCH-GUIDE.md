# Step 5 — Publishing checklist

## Included in this version
- Responsive catalogue, original product photographs, confirmed prices (₹150 / ₹39 / ₹50 / ₹99)
- Product quantity, colour and custom notes prefilled into Google Order Form
- Working feedback form link and manual review approval (no fake testimonials)
- Mobile navigation, focus indicators, skip link, product-modal Escape shortcut and improved SEO metadata

## Required before going live
1. **Business contact:** confirmed public email `madeforyoubysahara@gmail.com` is configured in `.env.example`, `.env.local` and the site fallback. Add `NEXT_PUBLIC_BUSINESS_EMAIL` to hosting environment variables. Instagram and WhatsApp are intentionally blank.
2. **Policies:** review `/privacy` and `/delivery` and replace draft language with final business policy. Decide refund/return policy, privacy contact and retention.
3. **Google Form consent:** the customer order form currently mentions `https://YOUR-SITE.com/privacy` in its checkbox text. After deployment, replace that placeholder with the actual public privacy-policy URL.
4. **Reviews:** only add real reviews after checking explicit consent and chosen public display name. Do not publish private Sheet data.
5. **Production build:** run `npm install` and `npm run build` on a machine with network access; fix any errors before publishing. The sandbox npm install was blocked by registry DNS (`EAI_AGAIN`), so build verification was not possible here.
6. **Mobile/browser QA:** test 360px, 390px, 768px, desktop widths; menu, search, filters, modal, Escape, quantity, prefilled form, feedback form, keyboard navigation and image loading.
7. **Submission QA:** send a new order and a feedback test; verify both private Sheets, then remove test rows.

## Deploy using Vercel (manual steps)
1. Unzip the project and place the folder in a private GitHub repository (or import it using the Vercel CLI). Do not commit `.env.local`.
2. Sign in to Vercel, select **Add New → Project**, import your repository, and choose the Next.js framework preset.
3. Set the environment variables listed in `.env.example`, including the Google Form links and entry IDs.
4. Deploy; inspect build logs. If deployment fails, do not announce the site as live.
5. Open the Vercel deployment URL, test the forms, then set your custom domain if desired.
6. Update the privacy-policy link inside the Google Form consent question to the final URL.

## Security and review notes
- The public Google Forms are intentional; the response Sheets must stay restricted.
- Order totals are estimates only; delivery/custom charges are confirmed separately.
- No checkout/payment gateway is implemented.
- Review publishing is manual by editing `lib/reviews.ts` and redeploying.

## Confirmed customer support email
- `madeforyoubysahara@gmail.com` is configured for the Contact button and cited in the draft privacy and delivery pages.
- Do not publish until the owner finalizes returns/refunds, data retention, and the final Google Form privacy-policy URL.
