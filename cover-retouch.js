/* Cover-only cleanup: remove baked-in 'M & K' and 'OUR E-INVITE' from slide1.webp.
 * Keep original image bytes, portraits and approved 2:3/stretch sizing untouched.
 * A transparent, pixel-aligned canvas replaces only the center lettering area
 * with locally sampled burgundy. */
(() => {
  'use strict';
  function cleanCover() {
    const cover = document.querySelector('#top .cover-art');
    const stage = document.querySelector('#top .cover-stage');
    if (!cover || !stage || !cover.complete || !cover.naturalWidth) return;
    // Crop coordinates are measured against the original approved slide1.webp.
    if (cover.naturalWidth !== 2048 || cover.naturalHeight !== 3072) return;
    if (stage.querySelector('.cover-lettering-cleanup')) return;

    const srcX = 800, srcY = 2000, srcW = 430, srcH = 650;
    const patchX = 800, patchY = 2030, patchW = 430, patchH = 605;
    const sampler = document.createElement('canvas');
    sampler.width = srcW;
    sampler.height = srcH;
    const sampleCtx = sampler.getContext('2d', { willReadFrequently: true });
    if (!sampleCtx) return;
    let data;
    try {
      sampleCtx.drawImage(cover, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      data = sampleCtx.getImageData(0, 0, srcW, srcH).data;
    } catch (_error) {
      // The original artwork stays visible if a browser disallows pixel access.
      return;
    }

    const overlay = document.createElement('canvas');
    overlay.width = patchW;
    overlay.height = patchH;
    overlay.className = 'cover-lettering-cleanup';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText =
      'position:absolute;z-index:1;pointer-events:none;' +
      'left:' + (patchX / 2048 * 100) + '%;' +
      'top:' + (patchY / 3072 * 100) + '%;' +
      'width:' + (patchW / 2048 * 100) + '%;' +
      'height:' + (patchH / 3072 * 100) + '%;';
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    const output = ctx.createImageData(patchW, patchH);

    function sampled(x, y, protectRight) {
      // Smooth compression noise without touching the original cover itself.
      const px = protectRight ? Math.min(x, 1128) : x;
      const row = y - srcY;
      const result = [0, 0, 0];
      let count = 0;
      for (let dx = -15; dx <= 15; dx++) {
        const col = Math.max(0, Math.min(srcW - 1, px + dx - srcX));
        const i = (row * srcW + col) * 4;
        result[0] += data[i];
        result[1] += data[i + 1];
        result[2] += data[i + 2];
        count++;
      }
      return result.map(v => v / count);
    }
    // [x1, y1, x2, y2, clean background row above, row below, veil protection]
    const removals = [
      [830, 2040, 1207, 2210, 2015, 2240, false],
      [885, 2290, 1158, 2610, 2250, 2630, true]
    ];
    for (const [x1, y1, x2, y2, topY, bottomY, protectRight] of removals) {
      const width = x2 - x1;
      const top = new Array(width);
      const bottom = new Array(width);
      for (let i = 0; i < width; i++) {
        top[i] = sampled(x1 + i, topY, protectRight);
        bottom[i] = sampled(x1 + i, bottomY, protectRight);
      }
      for (let y = y1; y < y2; y++) {
        const t = (y - y1) / (y2 - y1);
        const fadeY = Math.max(0, Math.min(1, (y - y1) / 16, (y2 - 1 - y) / 16));
        for (let x = x1; x < x2; x++) {
          const i = x - x1;
          const fadeX = Math.max(0, Math.min(1, i / 18, (x2 - 1 - x) / 18));
          const alpha = Math.min(fadeX, fadeY);
          const p = ((y - patchY) * patchW + x - patchX) * 4;
          for (let c = 0; c < 3; c++)
            output.data[p + c] = Math.round(top[i][c] * (1 - t) + bottom[i][c] * t);
          output.data[p + 3] = Math.round(alpha * 255);
        }
      }
    }
    ctx.putImageData(output, 0, 0);
    stage.appendChild(overlay);
  }
  function initialize() {
    const cover = document.querySelector('#top .cover-art');
    if (!cover) return;
    if (cover.complete && cover.naturalWidth) cleanCover();
    else cover.addEventListener('load', cleanCover, { once: true });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
