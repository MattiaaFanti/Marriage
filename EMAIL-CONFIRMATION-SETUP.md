# Wedding RSVP email — Gmail + Google Apps Script

The invitation email is sent only with Gmail via Google Apps Script. No paid email service or domain is required.

## Current behavior

- A confirmed RSVP with one or more attending guests offers Send email or Skip.
- The Send button shows an animated spinner while the site prepares and uploads the image.
- Cloudflare validates the RSVP and starts sending the email using **`ctx.waitUntil()`**. The background request is owned by the Worker, so it is not canceled when the guest presses **OK**, closes the browser, or navigates away **after the Worker has accepted the request**.
- **Within approximately 2 seconds** of clicking Send, the modal switches to **“Your email is on its way!”** while the image upload / submission continues independently of the popup. The message means processing is underway, **not** that delivery is already complete. The interface shows **“Email sent successfully!”** only when the server actually reports an already-completed delivery.
- Failed submissions appear inside the modal; the screen does not close on failure. Background Gmail errors are logged in Worker logs and clear the pending attempt so that it can be retried.
- Cloudflare's background work has a **30-second `waitUntil()` window after the response**. Typical Gmail delivery takes only a few seconds; longer failures may need a separate Queue integration.
- The confirmation card is a **lossless PNG**. The middle has chair icons, `X seat/seats reserved for you`, and only attending guests' names, in the site's Cormorant Garamond font.
- The card includes the full reception address: **Bahay Baluk Baluk Restaurant, Maatas Na Kahoy, Lipa City, Batangas**.
- The email subject is **Mattia & Ker Marriage - Your Wedding Confirmation!**
- The recipient sees the inline image in the email body, without a signature or extra text.
- The group-wide Email admin column displays NO for opted-out groups, is blank for Pending, and shows the complete shared email address after sending.

## Source artwork

The original second Thank You artwork from the conversation is now committed at `assets/wedding-thank-you.jpg` (906 × 1280 pixels), with the original JPEG bytes preserved. `confirmation-image.js` loads this exact image, inserts extra burgundy space between the thank-you message and Wedding Details **without resizing the original pixels**, and overlays the reserved chair icons and guest names in the site's Cormorant Garamond typeface. The result is exported as a **lossless PNG**. A missing source image causes a visible send error rather than silently substituting another design.

## Updating the already-live Google Apps Script deployment

**Required whenever `GMAIL-FREE-MAILER.gs` changes:** GitHub does not synchronize your separately hosted Google Apps Script editor.

1. Open your existing Google Apps Script project.
2. Replace the full contents of Code.gs with the full `GMAIL-FREE-MAILER.gs` source from GitHub.
3. Save. Keep the same `WEDDING_MAIL_TOKEN` Script property.
4. Deploy → Manage deployments → Edit (pencil) → Version: **New version** → Deploy.
5. Retain the same `/exec` URL and existing Cloudflare secret values. Run a real test RSVP to confirm the subject and PNG image.

## Initial setup (only if Google Apps Script is not connected yet)

1. At https://script.google.com create a project using the code in `GMAIL-FREE-MAILER.gs`.
2. Add Script property `WEDDING_MAIL_TOKEN` with a random 32+ character string.
3. Run `authorizeWeddingMailer()` once and authorize sending.
4. Deploy as Web app, execute as Me, access Anyone, and copy the `/exec` URL.
5. In Cloudflare Worker `marriage` set encrypted secrets `GMAIL_SCRIPT_URL` (the URL) and `GMAIL_SCRIPT_TOKEN` (the same random token).
6. Deploy the latest worker code from this GitHub repository.

Apps Script documentation: https://developers.google.com/apps-script/reference/mail/mail-app
Apps Script quotas: https://developers.google.com/apps-script/guides/services/quotas

## Updating manual RSVP statuses

- A manual change to one member does **not** clear the group's saved confirmation address as long as another member is still Attending.
- A Pending member displays a blank Email column, while the rest of the group retains its shared address.
- When everyone has been changed to Not Attending, the group Email value becomes **NO**.
- When nobody attends but some members are still Pending, the previous email choice is cleared. Previously deleted email addresses cannot be recovered from the rate-limit hash.
