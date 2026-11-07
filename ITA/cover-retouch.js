/* Italian cover is rendered as ONE complete raster from the untouched
   English slide. Both split mobile images use the SAME finished PNG, so
   text, ornaments, portraits and the biblical quote stay aligned. */
(() => {
  'use strict';
  const WIDTH=2048, HEIGHT=3072;
  const qs=s=>document.querySelector(s);
  const stage=qs('#top .cover-stage');
  const original=qs('#top .cover-art-upper');
  if(!stage||!original)return;

  function cssReady(){
    document.documentElement.classList.remove('ita-cover-pending');
  }
  // Make the untouched image available if a device cannot render the canvas.
  const fallback=setTimeout(cssReady,8500);

  async function build(){
    try{
      if(!original.complete||!original.naturalWidth){
        await new Promise((resolve,reject)=>{
          original.addEventListener('load',resolve,{once:true});
          original.addEventListener('error',reject,{once:true});
        });
      }
      if(original.naturalWidth!==WIDTH||original.naturalHeight!==HEIGHT)
        throw Error('Unexpected wedding cover dimensions');
      // A temporarily unavailable web font must not prevent the artwork
      // from being displayed; Canvas can use its local serif fallback.
      await Promise.all([
        document.fonts?.load('400 170px "Great Vibes"'),
        document.fonts?.load('500 74px "Cormorant Garamond"')
      ].filter(Boolean).map(p=>p.catch(()=>{})));

      const canvas=document.createElement('canvas');
      canvas.width=WIDTH;canvas.height=HEIGHT;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      if(!ctx)throw Error('Canvas unavailable');
      ctx.drawImage(original,0,0,WIDTH,HEIGHT);
      const source=ctx.getImageData(0,0,WIDTH,HEIGHT).data;
      const sample=(x,y)=>{
        const p=(Math.round(y)*WIDTH+Math.round(x))*4;
        return [source[p],source[p+1],source[p+2]];
      };
      const topCenter=sample(1024,12),lowerCenter=sample(1024,981);
      function burgundy(x,y){
        const left=sample(25,Math.max(1,Math.min(HEIGHT-2,y)));
        const right=sample(2022,Math.max(1,Math.min(HEIGHT-2,y)));
        const t=Math.max(0,Math.min(1,x/(WIDTH-1)));
        const u=Math.max(0,Math.min(1,(y-12)/969));
        const center=[0,1,2].map(c=>topCenter[c]*(1-u)+lowerCenter[c]*u);
        // Broad, smooth vertical and radial tones, not pixel inpainting.
        const centerWeight=4*t*(1-t);
        return [0,1,2].map(c=>{
          const edges=left[c]*(1-t)+right[c]*t;
          return Math.round(Math.max(0,Math.min(255,edges*(1-centerWeight)+center[c]*centerWeight)));
        });
      }
      function goldPixel(x,y){
        // Keep the original gold celebration rays if a fill overlaps them.
        if(y>290||!(x<685||x>1360))return false;
        const p=(y*WIDTH+x)*4;
        const r=source[p],g=source[p+1],b=source[p+2];
        return r>114&&g>76&&b<g*.77&&g>b*1.45;
      }
      function paintRegion(x0,y0,w,h,edge=28,keepGold=false){
        const pixels=ctx.getImageData(x0,y0,w,h);
        for(let yy=0;yy<h;yy++){
          const absY=y0+yy;
          const fy=Math.min(1,(yy+1)/edge,(h-yy)/edge);
          for(let xx=0;xx<w;xx++){
            const absX=x0+xx;
            if(keepGold&&goldPixel(absX,absY))continue;
            const fx=Math.min(1,(xx+1)/edge,(w-xx)/edge);
            const alpha=Math.max(0,Math.min(1,fy,fx));
            const c=burgundy(absX,absY),p=(yy*w+xx)*4;
            for(let k=0;k<3;k++)
              pixels.data[p+k]=Math.round(pixels.data[p+k]*(1-alpha)+c[k]*alpha);
            // Preserve the original fully opaque pixels outside the lettering.
            pixels.data[p+3]=255;
          }
        }
        ctx.putImageData(pixels,x0,y0);
      }

      // Upper text only; the original ribbons, frames and portraits are
      // outside these areas. Clean wide rectangles avoid leftover ghost text.
      paintRegion(525,16,1005,185,25,true);
      paintRegion(405,181,1250,617,35,true);
      paintRegion(586,790,880,186,28,false);

      // The original approved cover removes M&K / OUR E-INVITE in the
      // burgundy gap between the children's images. Keep those narrow crops.
      function cleanCenter(x0,y0,w,h,above,below){
        const out=ctx.getImageData(x0,y0,w,h);
        for(let yy=0;yy<h;yy++){
          const f=(yy+1)/h;
          const featherY=Math.min(1,(yy+1)/15,(h-yy)/15);
          for(let xx=0;xx<w;xx++){
            const xxAbs=x0+xx;
            const i=(yy*w+xx)*4;
            const c0=sample(xxAbs,above),c1=sample(xxAbs,below);
            const featherX=Math.min(1,(xx+1)/17,(w-xx)/17);
            const a=Math.max(0,Math.min(featherX,featherY));
            for(let c=0;c<3;c++){
              const clean=c0[c]*(1-f)+c1[c]*f;
              out.data[i+c]=Math.round(out.data[i+c]*(1-a)+clean*a);
            }
            out.data[i+3]=255;
          }
        }
        ctx.putImageData(out,x0,y0);
      }
      cleanCenter(830,2040,377,170,2015,2240);
      cleanCenter(885,2290,273,320,2250,2630);

      // Original illustration's gold scroll is ABOVE y=2710. The English
      // Song of Solomon lettering lies exclusively BELOW this position.
      // Work on the finished full-size PNG instead of an overlay on the
      // unshifted mobile first half (the cause of the cut across the dress).
      const quoteY=2708;
      const bottom=ctx.getImageData(0,quoteY,WIDTH,HEIGHT-quoteY);
      for(let yy=0;yy<HEIGHT-quoteY;yy++){
        const y=yy+quoteY;
        const a=sample(24,y),b=sample(2022,y);
        const vertical=Math.max(0,Math.min(1,yy/56));
        for(let x=0;x<WIDTH;x++){
          const t=x/(WIDTH-1),p=(yy*WIDTH+x)*4;
          for(let c=0;c<3;c++){
            const clean=a[c]*(1-t)+b[c]*t;
            bottom.data[p+c]=Math.round(bottom.data[p+c]*(1-vertical)+clean*vertical);
          }
          bottom.data[p+3]=255;
        }
      }
      ctx.putImageData(bottom,0,quoteY);

      function text(value,y,size,{font='serif',italic=false,weight='500',max=1600,tracking=0}={}){
        ctx.save();
        const family=font==='script'?'"Great Vibes", cursive':'"Cormorant Garamond", Georgia, serif';
        ctx.fillStyle='#fff5eb';
        ctx.textAlign='center';ctx.textBaseline='middle';
        function setFont(n){ctx.font=(italic?'italic ':'')+weight+' '+n+'px '+family;}
        setFont(size);
        while(size>24&&ctx.measureText(value).width>max)setFont(--size);
        if(tracking&&'letterSpacing' in ctx)ctx.letterSpacing=tracking+'px';
        ctx.fillText(value,1024,y);
        ctx.restore();
      }
      text('QUESTI DUE BAMBINI',127,71,{weight:'600',max:950,tracking:5});
      text('si stanno',430,265,{font:'script',max:1160});
      text('sposando',680,260,{font:'script',max:1230});
      text('e non vedono l’ora',856,69,{max:870});
      text('di festeggiare con voi!',924,69,{max:1110});
      text('«Ho trovato l’amore dell’anima mia»',2834,87,{italic:true,max:1680});
      text('CANTICO DEI CANTICI 3:4',2955,47,{weight:'600',max:1080,tracking:6});

      // Lossless PNG: don't recompress or change the untouched source photo.
      const png=await new Promise((resolve,reject)=>
        canvas.toBlob(b=>b?resolve(b):reject(Error('PNG conversion failed')),'image/png'));
      const url=URL.createObjectURL(png);
      const covers=[...stage.querySelectorAll('.cover-art')];
      await Promise.all(covers.map(img=>new Promise((resolve,reject)=>{
        img.addEventListener('load',resolve,{once:true});
        img.addEventListener('error',reject,{once:true});
        img.src=url;
      })));
      clearTimeout(fallback);
      cssReady();
      window.addEventListener('pagehide',()=>URL.revokeObjectURL(url),{once:true});
    }catch(err){
      console.warn('[Italian wedding cover] Rendering failed, showing original artwork:',err?.message||err);
      clearTimeout(fallback);
      cssReady();
    }
  }
  void build();
})();