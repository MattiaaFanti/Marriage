# Wedding RSVP email — Gmail + Google Apps Script

The invitation email is sent only with Gmail via Google Apps Script. No paid email service or domain is required.

## Current behavior

- A confirmed RSVP offers Send email or Skip only when one or more **Attending** guests still need an individual confirmation. A previously confirmed guest is not included in someone else's subsequent email.
- The Send button shows an animated spinner while the site prepares and uploads the image.
- Cloudflare validates the RSVP and starts sending the email using **`ctx.waitUntil()`**. The background request is owned by the Worker, so it is not canceled when the guest presses **OK**, closes the browser, or navigates away **after the Worker has accepted the request**.
- **Within approximately 2 seconds** of clicking Send, the modal switches to **“Your email is on its way!”** while the image upload / submission continues independently of the popup. The message means processing is underway, **not** that delivery is already complete. The interface shows **“Email sent successfully!”** only when the server actually reports an already-completed delivery.
- Failed submissions appear inside the modal; the screen does not close on failure. Background Gmail errors are logged in Worker logs and clear the pending attempt so that it can be retried.
- Cloudflare's background work has a **30-second `waitUntil()` window after the response**. Typical Gmail delivery takes only a few seconds; longer failures may need a separate Queue integration.
- The confirmation card is a **lossless PNG**. The middle has chair icons, `X seat/seats reserved for you`, and only attending guests' names, in the site's Cormorant Garamond font.
- The card includes the full reception address: **Bahay Baluk Baluk Restaurant, Maatas Na Kahoy, Lipa City, Batangas**.
- The email subject is **Save the date! - Your Wedding Confirmation**
- The recipient sees the inline image in the email body, without a signature or extra text.
- The admin Email column shows **each person's own address**. The Worker first records the submitted address in `rsvp_member_email_pending`, so the dashboard displays it with **Sending…** while Gmail processes it. After Gmail confirms acceptance, the Worker transfers it to `rsvp_member_email_choices` and removes the processing indicator. A rejected send clears the provisional address, enabling a retry. Existing addresses on other rows remain untouched. Pending RSVP rows are blank; an explicit Skip displays NO.

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

## Independent member emails and RSVP changes

- The Worker creates the per-member confirmed and in-flight email tables automatically. The first invocation migrates any surviving legacy group email into **each already-Attending member's own record**. Manually cleared addresses are excluded. Any group address already overwritten before this deployment cannot be reconstructed from the old group record.
- **Example:** Person A Attending receives confirmation at `a@example.com`; Person B was Not Attending. When Person B later selects Attending, Person A keeps `a@example.com` and the invitation only asks for Person B's new address (e.g. `b@example.com`).
- The personalized PNG generated for this second send names only the members still awaiting confirmation. Existing confirmations are never sent again simply because another household member changes their mind. The browser prepares the image during the dress-code step, reducing the delay before the request reaches Cloudflare.
- When the admin manually changes a member's RSVP status, only that member's saved email is cleared. The emails of other group members are unaffected and do not reappear in the edited person's row after a subsequent reset and new Attending selection.
- Guest-submitted RSVPs also preserve emails for members whose Attending status did not change. An individual who changes to Not Attending loses only their own previously saved address.
- Skipping the email saves NO only for members still awaiting confirmation; it does not erase prior confirmations.
- **Reset All** clears both old group email choices and the new individual email records.
- The new D1 table `rsvp_member_email_choices` is created automatically without requiring a manual SQL migration. Existing email records are preserved wherever the old database still contains them.

## Diagnose email timing

Cloudflare Worker logs now emit three timing metrics without logging recipient addresses:

- `worker_setup_ms`: receipt of the image request through validation and background handoff.
- `gmail_request_ms`: outbound request to Google Apps Script through its successful response.
- `since_worker_request_ms`: total Worker time to Google acknowledgment.

The elapsed time between Google's acceptance and the message appearing in the recipient's inbox is controlled by email delivery and cannot be measured by the Worker. `ctx.waitUntil()` does not impose a built-in waiting period, but its background work is limited to 30 seconds after the Worker response.
