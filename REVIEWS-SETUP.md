# Step 4 — Real customer feedback and moderated reviews

## Status
The website now supports an owner-approved review collection. There are **zero** published reviews until genuine submissions are explicitly approved. The feedback button is now connected to the owner-provided Google Feedback Form. Set the same environment variable in your hosting provider before deployment.

## 1. Create a separate Google Form
At https://forms.google.com, create **Made for You by Sahara | Customer Feedback ♡**.

Description: "Thank you for supporting our handmade crochet creations! Your honest feedback helps us improve. Reviews are published only if you give permission. Never include your address, phone number or other private details in your review."

Add these questions:

| Question | Type | Required? | Options / notes |
|---|---|---|---|
| Your name | Short answer | Yes | For internal verification only |
| Order reference or product purchased | Short answer | Yes | Do not publish order reference |
| Product | Dropdown | Yes | Crochet Flower Keychain; Crochet Bow Keychain; Handmade Crochet Hairband; Crochet Flower Hair Garland |
| Rating | Linear scale 1–5 | Yes | 1 = Poor, 5 = Excellent |
| Your experience | Paragraph | Yes | Ask for specific, honest feedback |
| Display name (optional) | Short answer | No | e.g., first name or initials; don't publish full names by default |
| May we publish your review? | Multiple choice | Yes | Yes, with my chosen display name; No, feedback is private |
| May we contact you to clarify your feedback? | Multiple choice | No | Yes; No |
| Contact email (optional) | Short answer | No | Only for verification; never publish |

Do not require sign-in, and disable the setting that shows response summaries to respondents. Consider a brief privacy statement and a link to the final published Privacy Policy. Set a custom confirmation message: "Thank you for sharing your honest feedback! ♡ We read every message with care."

## 2. Connect the private feedback Sheet
In the Google Form editor: Responses → Link to Sheets → Create spreadsheet named `Made for You by Sahara - Private Customer Feedback`. Keep it restricted. Enable notifications for new responses if desired.

## 3. Connect the website
Copy the **responder** URL (not the editor URL) into `.env.local`:

```
NEXT_PUBLIC_REVIEW_FORM_URL=https://docs.google.com/forms/d/e/1FAIpQLSef226Bhg24ZPqyuRYNZCSFfVfcRnaRDBzsg09kXFejcr1tUg/viewform
```

For Vercel, also set the same environment variable in Project Settings → Environment Variables and redeploy. The **Share Your Experience** button will then become visible on the website.

## 4. Approve reviews manually (no fake testimonials)
1. Read the private feedback spreadsheet.
2. Confirm the feedback is genuine and the response explicitly allows publication.
3. Check the approved display name; remove personal details from the quote. Ask permission again if changing meaning or using a different name.
4. Edit `lib/reviews.ts` and add an entry like the **template** below, replacing every placeholder with real approved content. Do **not** publish this template as a review:

```ts
{
  id: 'unique-internal-review-id',
  displayName: 'Customer-approved display name',
  rating: 5,
  quote: 'Exact customer-approved review text',
  product: 'Crochet Flower Keychain',
  month: 'Nov 2026',
  permissionConfirmed: true
}
```

5. Redeploy the site. To remove a review, delete its entry and redeploy. If permission is withdrawn, remove it promptly.

**Important:** This is a manual, curated publishing workflow, not an automated sync from private Google Sheets. No Google Sheet is exposed to the browser. Review submissions do not automatically become public. Avoid publishing contact details, delivery addresses, full order IDs, or internal spreadsheet URLs.

## 5. Test
- Submit one clearly labelled test feedback response.
- Confirm a new row appears in the private feedback Sheet.
- Verify the website's Share Your Experience button opens the feedback form after configuration.
- Confirm the test review does **not** automatically appear publicly.
- Delete the test row after testing if appropriate.
