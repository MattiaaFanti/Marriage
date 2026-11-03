# Mattia & Kirsten — Wedding Invitation

Four mobile-first wedding invitation concepts inspired by the uploaded video **t main.mp4** and three reference clips. The primary design reproduces the childhood-photo opening and the RSVP journey: open invite → verify individual invitation → attend / not attend → number of guests → optional email → confirmation → dress-code reminder.

## Preview routes
- [01 — Childhood Story (burgundy)](./burgundy/)
- [02 — Botanical Garden (olive and ivory)](./botanical/)
- [03 — Caramel Editorial (camel and sand)](./editorial/)
- [04 — Vintage Romance (warm parchment)](./vintage/)

## Updated requirements (3 November 2026)
- Opening title card shows **Kirsten & Mattia — 07.12.2026**, automatically fades after **2.5 seconds**.
- The next screen follows the **t main** childhood-photos concept with a subtle face crop/zoom.
- RSVP does **not** prompt for a password or a typed code. In live mode, a personalized link contains an unguessable invitation token, so the guest need only select attendance.
- Reception: Mataas Na Kahoy, Lipa, Batangas. The map link points to the location supplied by the couple.
- Principal sponsor correction: **Mario Buccola**.
- All four designs share one RSVP backend and music path: `assets/music.mp3`.

## Required assets for the published website
The GitHub connector used for this commit supports UTF-8 source files but not the uploaded binary photos or MP3. To avoid serving poor-quality embedded previews, extract the supplied `Marriage_assets_HD_and_music.zip` and upload these files to an `assets/` directory **at the repository root**:
`kirsten.webp`, `mattia.webp`, `restaurant.webp`, `music.mp3`.
Their filenames must be exact. Without these uploads, a low-resolution photo fallback appears and browser audio cannot load. Publishing commercial music requires applicable distribution rights.

Enable GitHub Pages on `main` at the repository root, then use:
`https://mattiaafanti.github.io/Marriage/burgundy/`
(and the other directories).

## Architecture
- Static HTML/CSS/JS on GitHub Pages (four styles, shared code).
- Cloudflare Worker HTTP API + Cloudflare D1 for private guest roster and RSVP status.
- Password-protected admin at the Worker /admin route, not on the static site.
- HMAC-signed invitation tokens generated only on the Worker.
- A single D1 database shared by all four design variants.
- Initial guest list and private notes must NEVER be committed to this public repository.

## Setup
1. Choose the visual theme.
2. Edit `shared/config.js` with the real date/venue and deployed Worker origin. Until then RSVP is visibly marked **DEMO** and only saved in the browser.
3. Create D1, apply `cloudflare/schema.sql`, deploy `cloudflare/worker.js` through Wrangler or the Cloudflare dashboard. Configure Worker bindings and secrets.
4. Import the roster into D1 privately (not to GitHub).
5. Create personal invitation links from the Worker admin panel.
6. Set Worker `ALLOWED_ORIGINS=https://mattiaafanti.github.io`.

## Music
The supplied song is Ben&Ben's `Araw-Araw`. The website supports softly playing audio (18% volume) after a visitor taps **Open invitation**. The commercial recording is intentionally NOT stored in this public repository. If licensed to publish, place an appropriately authorized `music.mp3` in `assets/`.

## Unconfirmed event details
Venue, schedule, address, route, RSVP deadline, and one tentative sponsor entry still need confirmation. The site deliberately displays placeholders rather than inventing details.

## Privacy
Only selected principal sponsors appear on the invitation itself. Individual guest names, attendance expectations, household allocations, private notes, and RSVP data live exclusively in D1. GitHub Pages hosts no guest list.

Developer note: source videos are for design reference; no source TikTok media is re-hosted.
