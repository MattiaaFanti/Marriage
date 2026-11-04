# Cloudflare Workers + D1 — single-site RSVP backend

The only wedding website is **https://mattiaafanti.github.io/Marriage/**. It is served from the GitHub repository root, not a theme subfolder.

The guest list, RSVP records, internal notes and admin credentials must stay in Cloudflare D1 and Worker secrets, never in public GitHub files.

## First deployment

1. Install Node.js.
2. At the **root** of this repository, run `npm install` and `npx wrangler login`.
3. Run `npx wrangler d1 create mattia-kirsten-wedding`.
4. Set the returned `database_id` in `wrangler.toml`.
5. Run `npm run migrate:remote`.
6. Set `INVITE_SECRET` with `npx wrangler secret put INVITE_SECRET` and enter a unique long random secret.
7. Set `ADMIN_PASSWORD` with `npx wrangler secret put ADMIN_PASSWORD` and enter a unique long private password.
8. Run `npm run deploy`.
9. In the root `config.js`, set `apiBase` to your deployed Worker origin.
10. Open the Worker's **/admin** page to manage invitees, issue links, and monitor RSVP.

Without steps 1–9 the website's RSVP is explicitly **preview-only** and does not store real responses. An invitation's guest-facing page has **no password**; live name verification uses a personal signed URL. The admin login remains protected.

The MP3 is already present in the root and all music is played from there (subject to each browser's audible autoplay policy).

D1 schema: `schema.sql`; API: `worker.js`; private dashboard: `admin.js`.
