# RSVP confirmation e-mail (Mattia & Kirsten)

The GitHub Pages RSVP client now offers **Send email - See you soon!** and **Skip - I don't want a confirmation e-mail** after saved RSVPs with at least one guest marked Attending. All-declined invitations retain their original close button.

## What is implemented

- `confirmation-image.js` renders a **1122 × 1402** burgundy/gold personalized invitation using the site's existing childhood portraits in `slide1.webp`. It includes `X seat/seats reserved for you`, the seat icons, and **only attending guests' names**, plus ceremony, reception, and dress-code details.
- The email body contains **only a single inline JPEG image** referenced by Content-ID (`cid:wedding-confirmation`), with subject **Mattia & Kirsten Marriage - 07 December 2026**. The recipient sees the image itself, not a base64 data URI or an additional block of text.
- `POST /api/household/send-confirmation-email` validates the short-lived RSVP group token, the current D1 attending names, the JPEG payload and target e-mail address, and limits repeated sends. Only a recipient hash, never their address, is kept for rate limiting.
- Without a configured provider, the Send button reports an error; no false success is shown. Skip closes the popup without network requests.

## Required sender setup (not configured by committing GitHub code)

You must use an e-mail domain that you control and verify through Resend. A `github.io` subdomain is not a substitute for verifying a sender domain.

1. Verify the sender domain in [Resend](https://resend.com/domains) (including the DNS records provided by Resend).
2. From the configured Cloudflare Worker directory, run:

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM
npm run deploy
```

For `RESEND_FROM` provide a verified sender address with an optional display name, e.g. `Mattia & Kirsten <invites@YOUR-VERIFIED-DOMAIN.example>`. Never place the Resend API key in GitHub, `config.js`, `wrangler.toml` or browser source.

3. If creating a fresh D1 database, use the existing `schema.sql`. Existing databases create the new rate-limit table automatically upon the first valid email attempt.

## Testing

- Open the wedding website, choose any guest, mark at least one person Attending, save all RSVP responses, continue to Thank you.
- Skip must close the popup immediately. Send with an empty/invalid address must show a validation error.
- Send to an allowed test address after the Worker deploy, then verify the Resend delivery log. Only the RSVP-confirmation picture should appear inside the email.
- Check Chrome desktop and Android/iOS: the illustration is generated on the visitor's device with HTML Canvas using same-origin wedding artwork. If the browser cannot render the image, the Send action fails visibly without submitting an incomplete email.

Resend inline-image documentation: https://resend.com/changelog/embed-images-using-cid
