# Step 3.5 — Google Sheets order-response test

The customer has confirmed that the sample prefilled Google Form displays product, quantity, and colour correctly. This verifies prefilling **in the Google Form**, not submission or spreadsheet delivery.

## Test safely

1. In the Google Form editor, open **Responses** and ensure **Accepting responses** is enabled.
2. Click the green Sheets icon / **Link to Sheets**. Create or select a **private** spreadsheet named `Made for You by Sahara - Customer Orders`.
3. Open the public form with a sample product prefilled. Complete all required fields with clearly marked **TEST ORDER — DO NOT FULFIL** data. Use your own contact details only if you choose to; never share them back in chat.
4. Submit once. Confirm that Google Forms displays its confirmation message.
5. Open the private linked spreadsheet and verify that a new timestamped row appears, including the product, quantity, colour, customisation, and delivery fields.
6. In the Forms **Responses** three-dot menu, enable **Get email notifications for new responses**, if desired. This sends notification emails, not the full order data necessarily.
7. Delete the test response using the form's Responses controls if you want to remove it from form statistics; separately delete the test row in Sheets if needed. Removing one does not necessarily remove the other.
8. Keep the response spreadsheet restricted to the owner; never share its link publicly.

## Website connection

`NEXT_PUBLIC_ORDER_FORM_URL` in `.env.local` is already set to the supplied public responder URL.

The website's `orderUrl()` function in `lib/catalog.ts` uses these owner-provided Google Forms field IDs:
- Product: `entry.882890060`
- Quantity: `entry.694796155`
- Preferred colour: `entry.1767508639`
- Notes: `entry.129304157`

The customer confirmed a prefilled form works. This does not establish that the website has been deployed or that a Google Sheets row has been received.

## Next phase: customer feedback

Create a separate Google Form for feedback, with customer display name, purchased product, 1–5 rating, review, and explicit consent to publish. Connect its responses to a **separate private** Sheet. Review and approve submissions manually before publication. Do not add invented reviews or expose customer details.

Once its responder URL exists, set `NEXT_PUBLIC_REVIEW_FORM_URL` in `.env.local` and in the Vercel environment settings before deployment.

## Owner inputs still needed

- Confirmation that a test order reached the linked Sheet
- Real feedback-form responder URL
- Business contact details (optional for launch)
- Delivery areas, charges, payment options, and reviewed privacy policy

Do not enter real customer data into chat or public code.
