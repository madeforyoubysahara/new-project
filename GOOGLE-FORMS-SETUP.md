# Google Forms integration — Made for You by Sahara

## Connected responder URL
https://docs.google.com/forms/d/e/1FAIpQLSdNj3kOocAoaQbGmkCGWs1fblndDvpymkbxLff22hJeydhlJg/viewform

All Order Now buttons now open this real form. The site does not submit orders directly; customers submit in Google Forms.

## Enable product prefilling
1. Open the form in **edit mode** using the account that owns it.
2. In the form editor, choose the three-dot menu > **Get pre-filled link** (wording can vary).
3. Fill the product question with **Crochet Flower Keychain**, quantity with **1**, preferred colour with **Pink**, and customisation details with **Test note**. Leave unrelated fields blank.
4. Click **Get link**, then copy the resulting URL. Do not submit a real order.
5. Find URL parameters named `entry.123456789=...`. Match each numeric ID to its sample value.
6. Set `NEXT_PUBLIC_FORM_PRODUCT_ENTRY`, `NEXT_PUBLIC_FORM_QUANTITY_ENTRY`, `NEXT_PUBLIC_FORM_COLOR_ENTRY`, and `NEXT_PUBLIC_FORM_NOTES_ENTRY` in `.env.local` to the corresponding digits (without `entry.`).
7. Restart the development server. The site will now append the selected product, quantity, colour and notes.

**Important:** The product dropdown choice in Google Forms must match the text in the website exactly. If the form uses `Crochet Flower Keychain — ₹150` instead of `Crochet Flower Keychain`, edit the form choice or adjust the website mapping. Prefilling may not work for a mismatch.

## Google Sheets
Open the form's Responses tab, link to a private Google Sheet, and turn on email notifications for new responses. Never publish customer details.

## Testing (do not use real customer details)
1. Open the website product detail and choose quantity 2, colour Pink.
2. Click Order Now; verify the Google Form opens.
3. After configuring IDs, verify the product/quantity/colour fields are prefilled.
4. Complete a test submission with non-sensitive test data.
5. Confirm the test row appears in the linked private Google Sheet.
6. Delete the test response/row afterward as appropriate.

A successful form submission is an **order request**, not an automatically confirmed or paid order.


## Verified prefill field IDs (November 2026)

The owner supplied a Google Forms prefilled URL. Only field IDs were extracted; the sample customer name, phone, email, and delivery address are deliberately not stored in this project.

- Product: `entry.882890060`
- Quantity: `entry.694796155`
- Preferred colour: `entry.1767508639`
- Additional instructions: `entry.129304157`
- Customisation required (not yet wired): `entry.1600718475`

The website's optional customisation notes are currently mapped to the form's **additional instructions** field. If the Google Form has a separate customisation-details field, obtain its entry ID before mapping it.

To test: run the site, open each product, select a quantity and colour, click Order Now, and check that Google Forms displays the correct prefilled product, quantity, colour and notes. Do not submit real customer information during testing. Submit a clearly labelled test order only if you own the form, and remove it from your private response sheet afterwards.

**Privacy note:** The owner-supplied prefill URL contained real-looking contact and delivery information. Do not paste that full sample URL into public code or documentation. The website constructs new URLs containing only product preferences.
