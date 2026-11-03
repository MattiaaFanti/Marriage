# Media assets for the four invitation concepts

Three full-resolution images are intentionally referenced as **separate original files**, not recompressed and not embedded as tiny base64 thumbnails.

Upload the following filenames to the `assets/` directory through **Add file → Upload files** on GitHub:

- `mattia-original.png` — childhood portrait of Mattia, original 1200 × 1600 pixels
- `kirsten-original.png` — childhood graduation portrait of Kirsten, original 960 × 1280 pixels
- `restaurant-original.png` — the provided reception photograph of Bahay Baluk-Baluk Restaurant (use the original file, no optimization)

The four HTML templates already reference these exact paths. **Until these three assets exist in the repository, image slots will be blank or broken on GitHub Pages.**

The soundtrack is already in the repository root under `ben-ben-araw-araw-official-music-video_DNkfYn6U.mp3`. Every template loads this exact path and tries audible autoplay at 18% volume. If the browser blocks audible autoplay, playback starts on the first allowed user gesture. No music mute/unmute button is rendered.

Visual face zoom is CSS only (`object-fit: cover; transform:scale(1.1...)`). No original image bytes are changed.

The shared RSVP code is in `shared/wedding.js`. Guest names, invitation HMAC tokens, admin secrets and all RSVP data belong on Cloudflare Workers/D1, never in this public repository.
