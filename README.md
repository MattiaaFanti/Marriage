# Kirsten & Mattia — Wedding invitations

Wedding date: **Monday, 7 December 2026**.

Reception: **Bahay Baluk-Baluk Restaurant**, Villas by Eco Hotels, Lumang Lipa, Mataasnakahoy, Batangas, Philippines.

This repository contains four **independently designed sites**, each based on a different user-supplied video:

| Video | Directory | Design |
|---|---|---|
| `t main.mp4` | [burgundy/](./burgundy/) | Deep burgundy, childhood photos in frames, search-to-RSVP poster, 2.5-second initial monogram reveal |
| `t1.mp4` | [botanical/](./botanical/) | Botanical white-green invitation sheets, floral corners, family and sponsors |
| `t2.mp4` | [editorial/](./editorial/) | Blush editorial journal, photo collage, December calendar and timeline |
| `t3.mp4` | [vintage/](./vintage/) | Ivory and champagne-gold formal invitation, cameo portraits, ceremonial sections |

Use GitHub Pages with branch `main` and `/ (root)` as the publishing source. Home: `https://mattiaafanti.github.io/Marriage/`.

## Image and soundtrack assets

Original images were uploaded directly to the repository root:

- [Kirsten](./ker%20piccola.jpeg) — `ker piccola.jpeg` (960 × 1280)
- [Mattia](./matti%20piccolo.jpeg) — `matti piccolo.jpeg` (1200 × 1600)
- [Reception](./ristorante.jpg) — `ristorante.jpg`

The HTML uses these three images at their native source quality. Framing and face zoom are provided only through CSS. Details: [assets/README.md](./assets/README.md).

The existing root-level MP3 `ben-ben-araw-araw-official-music-video_DNkfYn6U.mp3` is linked in `shared/config.js`. All four templates attempt to play it at 18% volume, with no mute button. Browsers may require a user gesture before audible playback.

## RSVP and Cloudflare

The four sites share one RSVP front-end script, `shared/wedding.js`, and one Cloudflare D1/Worker backend under `cloudflare/`.

- Invitees search their name and choose **Attending / Not attending**; there is **no password field** for invitees.
- Live RSVP validation uses a signed personal link (`?invite=<token>`) supplied to each guest, not a typed password.
- Until the Worker URL is configured in `shared/config.js`, the UI is in clearly labeled **PREVIEW ONLY** mode. Answers are **not sent to Cloudflare D1**.
- The **admin panel remains password protected**, because guest attendance and internal notes are private. It is served by the Cloudflare Worker at `/admin`.
- Private guest data and D1 imports must never be committed to GitHub.

## Pending confirmation

Wedding ceremony time, reception time, RSVP deadline, and transport arrangements are not specified yet and therefore intentionally remain unconfirmed in the templates.
