# Wedding RSVP email — Gmail + Google Apps Script

The invitation email is sent only with Gmail via Google Apps Script. No paid email service or domain is required.

## Current behavior

- A confirmed RSVP with one or more attending guests offers Send email or Skip.
- The Send button shows an animated spinner and the status 'Preparing your wedding invitation…' / 'Sending your confirmation email…'.
- After a successful Gmail response, the modal stays open on 'Email sent successfully!' with a checkmark animation, the recipient address, and a Back to the invitation button.
- Errors appear inside the modal; the screen does not close on failure.
- The confirmation card is a **lossless PNG**. The middle has chair icons, `X seat/seats reserved for you`, and only attending guests' names, in the site's Cormorant Garamond font.
- The card includes the full reception address: **Bahay Baluk Baluk Restaurant, Maatas Na Kahoy, Lipa City, Batangas**.
- The email subject is **Mattia & Ker Marriage - Your Wedding Confirmation!**
- The recipient sees the inline image in the email body, without a signature or extra text.
- The group-wide Email admin column displays NO for opted-out groups, is blank for Pending, and shows the complete shared email address after sending.

## Source artwork

The renderer in `confirmation-image.js` will use `assets/wedding-thank-you.jpg` when the supplied reference artwork is present in that path. It inserts a burgundy space between the original central thank-you text and Wedding Details by separating and rejoining the original pixels rather than stretching or scaling the reference; the guest names and seats are overlaid in the new space. When the asset does not exist, it builds a visually matching alternative from the project's existing `slide1.webp` cover and monogram. The PNG conversion does not introduce additional lossy compression.

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
