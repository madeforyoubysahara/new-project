# Step 4 — Feedback connection and testing

## Connected responder form
https://docs.google.com/forms/d/e/1FAIpQLSef226Bhg24ZPqyuRYNZCSFfVfcRnaRDBzsg09kXFejcr1tUg/viewform

The website's **Share Your Experience** button links to the form above, opens in a new tab, and does not expose the private feedback spreadsheet.

## Test procedure
1. On the website, scroll to Customer Love and click **Share Your Experience**. Confirm the correct Google Form opens.
2. Submit one response clearly marked `TEST — PLEASE IGNORE` using non-sensitive test information. Choose a rating and publication permission.
3. In Google Forms → Responses, verify the response count increases.
4. In Responses → Link to Sheets, verify the new row appears in the **private** feedback spreadsheet. If no Sheet is linked, create one there.
5. Return to the website and confirm the test review **does not** appear publicly. Publishing is intentionally manual.
6. Delete the test response and/or Sheet row if desired.

## Approval process
1. Review a genuine customer response in your private Sheet.
2. Confirm the customer selected **Yes** to publication. If consent is unclear, do not publish.
3. Use only their permitted display name and the approved review text; remove contact or address details.
4. Add a review object to `lib/reviews.ts` with `permissionConfirmed: true`, a unique `id`, `rating` 1–5, and the consented quote.
5. Rebuild/redeploy the site and inspect the Customer Love section.
6. For withdrawal of permission, remove the entry and redeploy promptly.

No public read access to the Sheet, automatic sync, or customer account is needed.

## Deployment note
Set `NEXT_PUBLIC_REVIEW_FORM_URL` to the URL above in your host's environment variables and redeploy. The repository's `.env.local` is a local development file; avoid publishing personal secrets there.
