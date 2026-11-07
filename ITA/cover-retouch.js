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
      // Inpaint only bright cream letters using the nearby original burgundy
      // pixels. Everything else, including gold arrows and the background
      // texture, stays byte-for-byte visible through transparency.
      const sourcePixels=sc.getImageData(x,y,w,h).data;
      const count=w*h,mask=new Uint8Array(count);
      for(let i=0;i<count;i++){
        const p=i*4,r=sourcePixels[p],g=sourcePixels[p+1],b=sourcePixels[p+2];
        if(r>118&&g>105&&b>89&&r+g+b>385&&
           g<r+18&&b<g+42&&b>g*.65)mask[i]=1;
      }
      // Include anti-aliased edges of each letter, but not a rectangular
      // patch. Four-pixel dilation removes the original glyph halo.
      let dilated=mask;
      for(let pass=0;pass<4;pass++){
        const next=dilated.slice();
        for(let yy=1;yy<h-1;yy++){
          const row=yy*w;
          for(let xx=1;xx<w-1;xx++){
            const i=row+xx;
            if(!dilated[i])continue;
            for(let dy=-1;dy<=1;dy++)
              for(let dx=-1;dx<=1;dx++)next[i+dy*w+dx]=1;
          }
        }
        dilated=next;
      }
      // Multi-source propagation selects original background from the
      // nearest clean burgundy pixel; no flat-color artificial rectangles.
      const nearest=new Int32Array(count);nearest.fill(-1);
      const queue=new Int32Array(count);let tail=0;
      for(let i=0;i<count;i++){
        const p=i*4,r=sourcePixels[p],g=sourcePixels[p+1],b=sourcePixels[p+2];
        if(!dilated[i]&&r>40&&r>g*1.5&&r>b*1.1&&g<90&&b<110){
          nearest[i]=i;queue[tail++]=i;
        }
      }
      for(let head=0;head<tail;head++){
        const i=queue[head],x=i%w;
        const neighbors=[x?i-1:-1,x<w-1?i+1:-1,i>=w?i-w:-1,i<count-w?i+w:-1];
        for(const j of neighbors){
          if(j<0||nearest[j]!==-1)continue;
          nearest[j]=nearest[i];queue[tail++]=j;
        }
      }
      const patch=ctx.createImageData(w,h);
      for(let i=0;i<count;i++){
        if(!dilated[i])continue;
        const p=i*4,origin=nearest[i];
        const q=origin>=0?origin*4:-1;
        patch.data[p]=q>=0?sourcePixels[q]:col[0];
        patch.data[p+1]=q>=0?sourcePixels[q+1]:col[1];
        patch.data[p+2]=q>=0?sourcePixels[q+2]:col[2];
        patch.data[p+3]=255;
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
