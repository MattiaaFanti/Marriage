# Kirsten & Mattia — single wedding invitation

**Live site:** https://mattiaafanti.github.io/Marriage/

Only one design remains: the **Burgundy** invitation inspired by the main reference video. The landing page is the repository-root `index.html`. The other three alternative designs and the former `burgundy/` directory have been removed.

## Wedding details

- Couple: Kirsten & Mattia
- Date: Monday, 7 December 2026
- Reception: Bahay Baluk-Baluk Restaurant, Villas by Eco Hotels, Lumang Lipa, Mataasnakahoy, Batangas, Philippines
- Dress code: light brown, caramel, camel and sand
- Music: `ben-ben-araw-araw-official-music-video_DNkfYn6U.mp3` (attempts volume at 18%, no mute button)

## Cover image

`cover-kirsten-mattia.webp` is a **2048 × 3072** composition made from the approved illustrated wedding invitation. The illustrated frames contain the couple's real childhood portraits, sourced from **`matti hd.png`** and **`ker hd.png`**. It is a single static high-resolution background so that the page uses consistent proportions on smartphones, tablets and computers.

The graphic's imitation RSVP field has been removed. Only the overlaid **HTML search input and search button** are interactive. They use the same shared RSVP logic from `wedding.js` and keep their position within the artwork on every device.

The opening animation shows `M & K`, `Mattia & Kirsten`, and `12. 07. 2026`, then the cover appears. The first cover contains the Bible verse and no cropped date; the wedding date appears in the subsequent information section.

## Edit the seven wedding invitation pages

The live invitation scrolls continuously, but each page has its own editable Jekyll template.

1. [Page 1 — Cover](_includes/pages/01-cover.html)
2. [Page 2 — Civil wedding invitation](_includes/pages/02-invitation.html)
3. [Page 3 — Ceremony and reception](_includes/pages/03-ceremony-reception.html)
4. [Page 4 — Parents and principal sponsors](_includes/pages/04-parents-and-sponsors.html)
5. [Page 5 — Dress code](_includes/pages/05-dress-code.html)
6. [Page 6 — Gifts](_includes/pages/06-gifts.html)
7. [Page 7 — RSVP](_includes/pages/07-rsvp.html)

The root `index.html` controls page order and shared styling. The six champagne-gold botanical separators are reusable Jekyll includes in `_includes/ornaments/page-divider.html`. Subtle background foliage comes from `assets/wedding-botanical-corner.svg`. The approved `slide1.webp` cover artwork and its sizing remain unchanged. The Page 1 font adjustment affects the opening HTML title, not lettering baked into the illustration.

## GitHub Pages

In Settings → Pages choose `main` and `/ (root)`. Do not select a subfolder.

## Cloudflare

The backend remains available as root-level `worker.js`, `admin.js`, `schema.sql` and `wrangler.toml`. See [BACKEND.md](./BACKEND.md) for setup. The site operates in **preview-only RSVP mode** until the Worker URL and D1 are configured. Private invitation data is not published to this repository.

The original user-supplied source images remain in GitHub unchanged.
