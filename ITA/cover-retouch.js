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
    const sampler=document.createElement('canvas');
    sampler.width=2048;sampler.height=3072;
    const sc=sampler.getContext('2d',{willReadFrequently:true});
    if(!sc)return;
    sc.drawImage(source,0,0,2048,3072);

    // Remove the top English lettering with a precisely segmented mask.
    // A smooth row-based reconstruction replaces only cream/ivory glyphs.
    // Unlike nearest-pixel propagation, it cannot create blotchy, puddled
    // colors inside large letters. Everything outside the glyphs stays exact.
    function eraseTopText(x,y,w,h){
      const original=sc.getImageData(x,y,w,h).data;
      const count=w*h,mask=new Uint8Array(count);
      for(let i=0;i<count;i++){
        const k=i*4,r=original[k],g=original[k+1],b=original[k+2];
        // Mask cream text, avoiding red/burgundy and gold strokes.
        if(r>138&&g>121&&b>104&&r+g+b>410&&
           Math.abs(r-g)<90&&Math.abs(g-b)<85)mask[i]=1;
      }
      // Expand by three pixels to suppress pale anti-alias fringes.
      let expanded=mask;
      for(let pass=0;pass<3;pass++){
        const next=expanded.slice();
        for(let yy=1;yy<h-1;yy++){
          for(let xx=1;xx<w-1;xx++){
            const i=yy*w+xx;
            if(!expanded[i])continue;
            for(let dy=-1;dy<=1;dy++)
              for(let dx=-1;dx<=1;dx++)next[i+dy*w+dx]=1;
          }
        }
        expanded=next;
      }
      // Reconstruct the quiet central burgundy from clean side strips of
      // the actual photo. This is smooth across both horizontal and vertical
      // directions and does not use random nearest-neighbor color patches.
      const left=new Float32Array(h*3),right=new Float32Array(h*3);
      for(let yy=0;yy<h;yy++){
        const py=y+yy;
        const a=sc.getImageData(365,py,1,1).data;
        const b=sc.getImageData(1690,py,1,1).data;
        for(let c=0;c<3;c++){
          left[yy*3+c]=a[c];right[yy*3+c]=b[c];
        }
      }
      const blend=new Float32Array(h*3);
      // Average nearby rows to remove compression noise but retain the
      // gradual original vertical color changes.
      for(let yy=0;yy<h;yy++)for(let c=0;c<3;c++){
        let n=0,value=0;
        for(let delta=-14;delta<=14;delta+=2){
          const j=Math.max(0,Math.min(h-1,yy+delta));
          value+=.5*(left[j*3+c]+right[j*3+c]);n++;
        }
        blend[yy*3+c]=value/n;
      }
      const patch=ctx.createImageData(w,h);
      for(let yy=0;yy<h;yy++){
        for(let xx=0;xx<w;xx++){
          const i=yy*w+xx;
          if(!expanded[i])continue;
          const k=i*4;
          for(let c=0;c<3;c++){
            // A continuous center-to-edge interpolation, without seams.
            const horizontal=(xx/(w-1))-.5;
            const grad=(right[yy*3+c]-left[yy*3+c])*horizontal*.20;
            patch.data[k+c]=Math.max(0,Math.min(255,Math.round(blend[yy*3+c]+grad)));
          }
          patch.data[k+3]=255;
        }
      }
      ctx.putImageData(patch,x,y);
    }
    // Nonoverlapping areas track the original English typography, without
    // touching the gold bows, arrows, portraits or picture frames.
    eraseTopText(565,42,937,171);  // THESE KIDS ARE
    eraseTopText(415,213,1224,568); // getting married
    eraseTopText(610,804,830,157); // and they can't wait...

    // The bottom scripture is entirely inside an empty burgundy band.
    // Rebuild its continuous gradient using the ORIGINAL pixels at the
    // two outer edges for every row, then place the Italian text exactly
    // where the English quote and citation were.
    function clearBottomQuote(y0=2723){
      const height=3072-y0,width=2048;
      const patch=ctx.createImageData(width,height);
      for(let yy=0;yy<height;yy++){
        const py=y0+yy;
        const l=sc.getImageData(30,py,1,1).data;
        const r=sc.getImageData(2015,py,1,1).data;
        for(let x=0;x<width;x++){
          const t=x/(width-1),k=(yy*width+x)*4;
          for(let c=0;c<3;c++)
            patch.data[k+c]=Math.round(l[c]*(1-t)+r[c]*t);
          patch.data[k+3]=255;
        }
      }
      ctx.putImageData(patch,0,y0);
    }
    clearBottomQuote();

    function centered(text,y,size,{script=false,italic=false,weight='500',max=1600,color='#fff5e9',tracking=0}={}){
      ctx.save();ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
      const family=script?'"Great Vibes", cursive':'"Cormorant Garamond", Georgia, serif';
      ctx.font=(italic?'italic ':'')+weight+' '+size+'px '+family;
      while(size>25&&ctx.measureText(text).width>max){
        size--;ctx.font=(italic?'italic ':'')+weight+' '+size+'px '+family;
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
    // Keep the line and the attribution inside the original scripture area.
    centered('«Ho trovato l’amore dell’anima mia»',2816,75,{italic:true,max:1670});
    centered('CANTICO DEI CANTICI 3:4',2952,47,{max:1170,tracking:7});
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
