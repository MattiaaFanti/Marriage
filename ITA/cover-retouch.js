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
    // /ITA/: recolor only the English lettering zones. The original WebP,
    // faces, frames, gold ribbons and all the rest are never resampled.
    addItalianCoverText(cover,stage);
  }
  function addItalianCoverText(source,stage){
    if(stage.querySelector('.cover-italian-text'))return;
    const canvas=document.createElement('canvas');
    canvas.width=2048;canvas.height=3072;
    canvas.className='cover-italian-text';
    canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='position:absolute;inset:0;z-index:2;'+
      'width:100%;height:100%;pointer-events:none;';
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)return;
    const sample=document.createElement('canvas');
    sample.width=2048;sample.height=3072;
    const sc=sample.getContext('2d',{willReadFrequently:true});
    if(!sc)return;
    sc.drawImage(source,0,0,2048,3072);
    // Sample the actual burgundy from clean nearby rows of this exact image.
    const sampleColor=(x,y)=>{
      const d=sc.getImageData(x,y,1,1).data;
      return [d[0],d[1],d[2]];
    };
    const upper=sampleColor(1010,975),lower=sampleColor(1080,2718);
    function hideEnglish(x,y,w,h,col){
      const patch=ctx.createImageData(w,h);
      for(let yy=0;yy<h;yy++){
        const fy=Math.min(1,(yy+1)/21,(h-yy)/21);
        for(let xx=0;xx<w;xx++){
          const fx=Math.min(1,(xx+1)/24,(w-xx)/24);
          const p=(yy*w+xx)*4;
          for(let k=0;k<3;k++)patch.data[p+k]=col[k];
          patch.data[p+3]=Math.round(255*Math.max(0,Math.min(fx,fy)));
        }
      }
      ctx.putImageData(patch,x,y);
    }
    // Restrict the typography patches to empty burgundy, away from ribbons,
    // gold photo frames and all portraits.
    hideEnglish(568,43,921,171,upper);
    hideEnglish(420,209,1235,577,upper);
    hideEnglish(610,807,835,160,upper);
    hideEnglish(235,2730,1600,161,lower);
    hideEnglish(520,2887,1010,139,lower);

    function centered(text,y,size,{script=false,italic=false,weight='500',max=1600,color='#fff5e9',tracking=0}={}){
      ctx.save();ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font=(italic?'italic ':'')+weight+' '+size+'px '+
        (script?'"Great Vibes", cursive':'"Cormorant Garamond", Georgia, serif');
      while(size>25&&ctx.measureText(text).width>max){
        size--;ctx.font=(italic?'italic ':'')+weight+' '+size+'px '+
          (script?'"Great Vibes", cursive':'"Cormorant Garamond", Georgia, serif');
      }
      if(tracking&&'letterSpacing' in ctx)ctx.letterSpacing=tracking+'px';
      ctx.fillText(text,1024,y);
      ctx.restore();
    }
    centered('QUESTI DUE BAMBINI',124,71,{max:910,weight:'600',tracking:7});
    centered('si stanno',407,275,{script:true,max:1150});
    centered('sposando',661,275,{script:true,max:1200});
    centered('e non vedono l’ora',863,66,{max:820});
    centered('di festeggiare con voi!',938,66,{max:1000});
    centered('«Ho trovato l’amore dell’anima mia»',2820,75,{italic:true,max:1640});
    centered('CANTICO DEI CANTICI 3:4',2956,47,{max:1100,tracking:7});
    stage.appendChild(canvas);
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
