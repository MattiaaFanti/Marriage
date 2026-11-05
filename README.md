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

The first 2.5 seconds show the monogram `K & M` and 07·12·2026, then the cover appears. The first cover contains the Bible verse and no cropped date; the wedding date appears in the subsequent information section.

## Edit the six wedding invitation pages

The live website remains a single scrollable invitation, but its visible content is divided into six independently editable Jekyll includes. Edit the relevant file, commit it on `main`, and GitHub Pages will rebuild the full invitation.

1. [Cover and introduction](_includes/pages/01-cover-and-introduction.html)
2. [Reception and location](_includes/pages/02-reception.html)
3. [Dress code](_includes/pages/03-dress-code.html)
4. [Gifts](_includes/pages/04-gifts.html)
5. [Principal sponsors](_includes/pages/05-sponsors.html)
6. [RSVP section](_includes/pages/06-rsvp.html)

The root `index.html` joins these six pieces. Shared styling stays in `index.html` and `rsvp.css`; RSVP interaction is in `wedding.js`. Do not replace `slide1.webp` or alter the cover's proportions when editing an unrelated page.

## GitHub Pages

In Settings → Pages choose `main` and `/ (root)`. Do not select a subfolder.

## Cloudflare

The backend remains available as root-level `worker.js`, `admin.js`, `schema.sql` and `wrangler.toml`. See [BACKEND.md](./BACKEND.md) for setup. The site operates in **preview-only RSVP mode** until the Worker URL and D1 are configured. Private invitation data is not published to this repository.

The original user-supplied source images remain in GitHub unchanged.
