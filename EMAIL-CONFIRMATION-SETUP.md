# Wedding RSVP email — Gmail + Google Apps Script

The invitation email is sent only with Gmail via Google Apps Script. No paid email service or domain is required.

## Current behavior

- A confirmed RSVP with one or more attending guests offers Send email or Skip.
- The Send button shows an animated spinner while the site prepares and uploads the image.
- Cloudflare validates the RSVP and starts sending the email using **`ctx.waitUntil()`**. The background request is owned by the Worker, so it is not canceled when the guest presses **OK**, closes the browser, or navigates away **after the Worker has accepted the request**.
- The **“Your email is on its way!”** popup appears **as soon as Cloudflare returns a successful acknowledgement of the submitted PNG and email request**. No fixed two-second delay is used. Before acknowledgement, the modal keeps showing a processing spinner and remains open. After acknowledgement, the browser can be closed without aborting an upload: the Worker owns the Gmail request through `ctx.waitUntil()`. This is **not** proof of Gmail delivery; background errors or service interruptions remain possible. A rejected request shows an error instead of a success popup.
- Failed submissions appear inside the modal; the screen does not close on failure. Background Gmail errors are logged in Worker logs and clear the pending attempt so that it can be retried.
- Cloudflare's background work has a **30-second `waitUntil()` window after the response**. Typical Gmail delivery takes only a few seconds; longer failures may need a separate Queue integration.
- The confirmation card is a **lossless PNG**. Its middle shows chair icons and `X seat/seats reserved for you`, plus the new confirmation recipients' names, in the site's Cormorant Garamond font. **Only when** an already-Attending person stays Attending and another person changes from Not Attending to Attending and requests an additional email, the new email's card shows the total currently reserved group seats **and all names currently Attending in that group**; the message is still sent only to the new recipient. In other cases, the image uses the usual recipient names and seat count. All other confirmations retain the usual seat count based on the recipients.
- The card includes the full reception address: **Bahay Baluk Baluk Restaurant, Maatas Na Kahoy, Lipa City, Batangas**.
- The email subject is **Save the date! - Your Wedding Confirmation**
- The recipient sees the inline image in the email body, without a signature or extra text.
- The admin Email column now shows the individual guest's confirmation address. Pending delivery displays **Sending…**, successful delivery shows the address normally, and no confirmation leaves the cell blank.

## Source artwork

The original second Thank You artwork from the conversation is now committed at `assets/wedding-thank-you.jpg` (906 × 1280 pixels), with the original JPEG bytes preserved. `confirmation-image.js` loads this exact image, inserts extra burgundy space between the thank-you message and Wedding Details **without resizing the original pixels**, and overlays the reserved chair icons and guest names in the site's Cormorant Garamond typeface. The result is exported as a **lossless PNG**. A missing source image causes a visible send error rather than silently substituting another design.

## Updating the already-live Google Apps Script deployment

**Only required if you want to update the separately hosted Apps Script code itself:** GitHub does not synchronize your Google Apps Script editor. The current Worker passes the requested subject explicitly, so changing this subject in the Worker does **not** require redeploying Google Apps Script; the updated Apps Script file contains the same text as its fallback.

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

## Real-time RSVP dashboard

The `/admin` dashboard opens a hibernatable WebSocket through Cloudflare's SQLite-backed `RSVPUpdates` Durable Object. Whenever a guest submits an RSVP, an admin edits a response, the email choice changes, or the history resets, the Worker broadcasts a lightweight event and the open dashboard fetches fresh data **immediately** through the existing AJAX endpoints. The notification contains no guest names or email addresses. No five-second waiting period is used while the WebSocket is connected. If disconnected, the dashboard reconnects automatically and falls back to AJAX checks every five seconds. The WebSocket closes while the browser tab is hidden and reconnects when visible. Existing manual edits, filters, and status selectors remain protected against redraws.

Cloudflare deployment uses the `RSVP_LIVE` Durable Object binding and the `rsvp-live-sqlite-v1` SQLite migration already declared in `wrangler.toml`. No extra secrets are required. The selected configuration is available on Cloudflare Workers Free and Paid plans.

## Independent confirmation emails for household members

- Cloudflare creates `rsvp_member_email_choices` for confirmed addresses and `rsvp_member_email_requests` for messages currently being delivered. These are per-member, not per-group tables; no manual D1 command is needed.
- When a group member changes from **Not Attending** to **Attending**, the website offers confirmation only for attendees without an existing sent email. Their names and IDs are checked by the Worker against the current RSVP states.
- Example: person A has `first@example.com` and person B changes their mind. Person A keeps their original address. Person B receives their confirmation at `second@example.com`, without overwriting A.
- The new address becomes visible in the dashboard as **Sending…** once Cloudflare accepts the image and recipient; after Gmail confirms it, the address is saved as **sent**.
- A failed Gmail delivery clears only its provisional request, allowing another attempt. A member who explicitly selected Skip remains opted out of email when another person in the group changes their RSVP. A subsequent manual or guest RSVP status change clears only that member's confirmation and queued request.
- The one-time migration recovers surviving legacy group emails for guests who were already Attending **before** the legacy email was recorded. It deliberately avoids copying that email to someone who changed to Attending later. Previously overwritten emails cannot be reconstructed from the old group record.
- **Reset All** clears the old group records, individual confirmed addresses and pending send records.

## Diagnose email timing

Cloudflare Worker logs now emit three timing metrics without logging recipient addresses:

- `worker_setup_ms`: receipt of the image request through validation and background handoff.
- `gmail_request_ms`: outbound request to Google Apps Script through its successful response.
- `since_worker_request_ms`: total Worker time to Google acknowledgment.

The elapsed time between Google's acceptance and the message appearing in the recipient's inbox is controlled by email delivery and cannot be measured by the Worker. `ctx.waitUntil()` does not impose a built-in waiting period, but its background work is limited to 30 seconds after the Worker response.
