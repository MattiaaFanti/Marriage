# Cloudflare Worker + D1 — deployment

The public GitHub Pages site is only the visual frontend. D1 stores the actual guest list and RSVP data. No real responses are recorded while `shared/config.js` has an empty `apiBase`.

## First deployment

1. Create a free Cloudflare account and select a Workers subdomain.
2. On a local computer with Node.js installed, open this directory in a terminal.
3. Run `npm install`.
4. Run `npx wrangler login`.
5. Run `npx wrangler d1 create mattia-kirsten-wedding`.
6. Copy the returned `database_id` into `wrangler.toml`.
7. Run `npx wrangler d1 execute DB --remote --file=schema.sql`.
8. Run `npx wrangler secret put INVITE_SECRET` and enter a random secret of at least 32 bytes. Do not commit it.
9. Run `npx wrangler secret put ADMIN_PASSWORD` and enter a long unique password known only to the couple.
10. Run `npm run deploy`.
11. Copy the returned Worker origin into `../shared/config.js` as `apiBase`.
12. Set `PUBLIC_SITE_URL` in `wrangler.toml` to the chosen design, e.g. `https://mattiaafanti.github.io/Marriage/burgundy/`.
13. The GitHub Pages origin `https://mattiaafanti.github.io` is already listed in `ALLOWED_ORIGINS`.

## Private guest import

The guest list supplied by the couple includes private notes, proxies, predicted absences and a photographer. It is deliberately absent from the PUBLIC GitHub repository.

Use the separately provided private `seed-private.sql` file on a trusted machine:

`npx wrangler d1 execute DB --remote --file=seed-private.sql`

**Run the seed only once**, against an empty guest table. If you repeat it, you will duplicate people. Import only after you inspect the names and seat allocations. People marked as *expected absent* remain with an RSVP state of **pending** unless they actually respond.

## Admin

Open `https://YOUR-WORKER.workers.dev/admin` and log in with `ADMIN_PASSWORD`.

The dashboard shows confirmed attendance, refusals, pending replies, confirmed seats, expected absences, and the planned 24-person buffer. It can add guests, modify statuses and reserved seats, record internal notes, delete guests, export CSV, and copy a guest-specific invitation URL.

A signed link looks like:

`https://mattiaafanti.github.io/Marriage/burgundy/?invite=<HMAC-SIGNED-GUEST-TOKEN>`

The token is generated only by the Worker. Never use a guest's name as the authorization token.

## Important limits

- GitHub Pages cannot run a Worker or write to D1. The Worker must be deployed separately.
- There is no automatic email sending service in this starter; email addresses are optional information fields.
- A browser must receive a user gesture before the background music starts.
- The commercial Ben&Ben recording is not included in the PUBLIC repository. Upload an appropriately licensed copy as `assets/music.mp3` only if you have the rights.
- Schedule, venue, transport and RSVP deadline are placeholders until verified.
- Keep secrets in Wrangler secrets, never in the GitHub repository.
- Cloudflare rate limits, backups and authentication should be revisited before widespread public distribution.
