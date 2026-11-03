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

## Assets — important

**Photos have not yet been uploaded to the repository.** All four site designs point to the original full-resolution files under `assets/`. Follow the instructions in [assets/README.md](./assets/README.md). Do not use low-quality `shared/photos.js`; the previous embedded thumbnail implementation has been removed.

The MP3 `ben-ben-araw-araw-official-music-video_DNkfYn6U.mp3` is **already stored at the repository root**. The shared script attempts playback at 18% volume with no mute toggle. Browsers that forbid audible autoplay require the user's first gesture.

## RSVP and Cloudflare

The four sites share one RSVP front-end script, `shared/wedding.js`, and one Cloudflare D1/Worker backend under `cloudflare/`.

- Invitees search their name and choose **Attending / Not attending**; there is **no password field** for invitees.
- Live RSVP validation uses a signed personal link (`?invite=<token>`) supplied to each guest, not a typed password.
- Until the Worker URL is configured in `shared/config.js`, the UI is in clearly labeled **PREVIEW ONLY** mode. Answers are **not sent to Cloudflare D1**.
- The **admin panel remains password protected**, because guest attendance and internal notes are private. It is served by the Cloudflare Worker at `/admin`.
- Private guest data and D1 imports must never be committed to GitHub.

## Pending confirmation

Wedding ceremony time, reception time, RSVP deadline, and transport arrangements are not specified yet and therefore intentionally remain unconfirmed in the templates.
