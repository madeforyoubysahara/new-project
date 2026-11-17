# Step 5 — Returns policy and publishing preparation

## Updated
- `/delivery` now includes order confirmation, custom items, delivery, cancellation requests, damaged/incorrect/missing products, change-of-mind requests, refunds and consumer rights.
- The homepage FAQ links the customer to the contact email and explains the case-by-case policy.
- Business contact: madeforyoubysahara@gmail.com.
- The policy does **not** promise a fixed refund period, delivery service or return window that the owner has not confirmed.

## Owner review before publication
1. Confirm that the case-by-case policy matches how you will actually handle orders.
2. Decide the business's actual dispatch areas, delivery providers and estimated timelines. Do not advertise unconfirmed delivery promises.
3. Decide how payments are taken, and communicate any cancellation-related charges before confirming the order.
4. Review privacy wording and choose a real data-retention practice for private Google Sheets.
5. Replace the `https://YOUR-SITE.com/privacy` placeholder in the Google Order Form consent question after deployment. Update any public links in business profiles.
6. Verify the actual deployed pages and form links on mobile and desktop.

## Vercel launch
1. Unzip the project; in its folder run `npm install` and `npm run build` using a working internet connection.
2. Commit to a private GitHub repository. Never commit `.env.local` or any private customer data.
3. Import the repository into Vercel with the Next.js preset.
4. Add all `NEXT_PUBLIC_...` variables from `.env.example` under Vercel project environment variables.
5. Deploy and confirm a successful production build. Visit `/privacy`, `/delivery`, and the catalogue.
6. Submit test order and feedback responses from the live site and verify both private Sheets.
7. Update the Google Form privacy consent placeholder with the final site URL, then test again.

## Important
- A working production build and a public deployment have **not** been verified in this workspace.
- Review publishing remains manual, and the site does not accept direct online payments.
- The policy is a business draft, not a legal opinion. Indian consumer protections may require remedies regardless of a shop's change-of-mind policy.
