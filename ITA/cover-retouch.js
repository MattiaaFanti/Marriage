/* Italian cover: one complete full-resolution raster replaces BOTH split
   mobile images. English lettering is never patched letter by letter:
   the ENTIRE UPPER TEXT FIELD is repainted once with a continuous smooth
   burgundy field; original gold bows and rays are restored unchanged.
   Source slide1.webp and English wedding site remain unmodified. */
(() => {
  'use strict';
  const WIDTH=2048, HEIGHT=3072;
  const stage=document.querySelector('#top .cover-stage');
  const original=stage?.querySelector('.cover-art-upper');
  if(!stage||!original)return;
  const reveal=()=>document.documentElement.classList.remove('ita-cover-pending');
  let finished=false;
  const fallback=setTimeout(()=>{if(!finished)reveal()},12000);

  async function build(){
    try{
      if(!original.complete||!original.naturalWidth)
        await new Promise((resolve,reject)=>{
          original.addEventListener('load',resolve,{once:true});
          original.addEventListener('error',reject,{once:true});
        });
      if(original.naturalWidth!==WIDTH||original.naturalHeight!==HEIGHT)
        throw Error('Original cover has unexpected dimensions');
      // Fonts are optional. Do not keep the user waiting on Google Fonts.
      if(document.fonts?.load)await Promise.race([
        Promise.all([
          document.fonts.load('400 160px "Great Vibes"').catch(()=>{}),
          document.fonts.load('500 65px "Cormorant Garamond"').catch(()=>{})
        ]),
        new Promise(resolve=>setTimeout(resolve,1700))
      ]);

      const canvas=document.createElement('canvas');
      canvas.width=WIDTH;canvas.height=HEIGHT;
      const ctx=canvas.getContext('2d',{alpha:false});
      if(!ctx)throw Error('Canvas unsupported');
      ctx.drawImage(original,0,0,WIDTH,HEIGHT);

      const sampler=document.createElement('canvas');
      sampler.width=WIDTH;sampler.height=HEIGHT;
      const sc=sampler.getContext('2d',{willReadFrequently:true});
      sc.drawImage(original,0,0,WIDTH,HEIGHT);
      const pixel=(x,y)=>{
        const c=sc.getImageData(Math.round(x),Math.round(y),1,1).data;
        return [c[0],c[1],c[2]];
      };
      const rgb=c=>'rgb('+c.map(n=>Math.round(n)).join(',')+')';
      function edgeColor(y){
        // Only the outermost margins of the artwork: never the original
        // English glyphs, ribbons or decorative rays.
        const points=[pixel(14,y),pixel(2033,y)];
        return [0,1,2].map(k=>(points[0][k]+points[1][k])/2);
      }

      // Recreate ALL of the top, including the original title area, in one
      // operation. The previous narrow inpainting masks are gone completely.
      const upper=document.createElement('canvas');
      upper.width=WIDTH;upper.height=1040;
      const uc=upper.getContext('2d');
      const topGradient=uc.createLinearGradient(0,0,0,1040);
      for(const y of [0,130,320,540,780,960,1030])
        topGradient.addColorStop(y/1040,rgb(edgeColor(y)));
      uc.fillStyle=topGradient;
      uc.fillRect(0,0,WIDTH,1040);
      // Fade into the untouched background ONLY below all old English words.
      uc.globalCompositeOperation='destination-in';
      const fade=uc.createLinearGradient(0,960,0,1035);
      fade.addColorStop(0,'rgba(0,0,0,1)');
      fade.addColorStop(1,'rgba(0,0,0,0)');
      uc.fillStyle=fade;uc.fillRect(0,0,WIDTH,1040);
      uc.globalCompositeOperation='source-over';
      ctx.drawImage(upper,0,0);

      // Restore the four ribbon/bow regions from the EXACT original pixels.
      // Smoothly feather just their empty burgundy edges, not the gold bows.
      function restoreCorner(x,width,right){
        const h=790;
        const clip=document.createElement('canvas');
        clip.width=width;clip.height=h;
        const c=clip.getContext('2d');
        c.drawImage(original,x,0,width,h,0,0,width,h);
        c.globalCompositeOperation='destination-in';
        const edge=c.createLinearGradient(0,0,width,0);
        if(right){
          edge.addColorStop(0,'rgba(0,0,0,0)');
          edge.addColorStop(.19,'rgba(0,0,0,1)');
          edge.addColorStop(1,'rgba(0,0,0,1)');
        }else{
          edge.addColorStop(0,'rgba(0,0,0,1)');
          edge.addColorStop(.81,'rgba(0,0,0,1)');
          edge.addColorStop(1,'rgba(0,0,0,0)');
        }
        c.fillStyle=edge;c.fillRect(0,0,width,h);
        const bottom=c.createLinearGradient(0,655,0,h);
        bottom.addColorStop(0,'rgba(0,0,0,1)');
        bottom.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=bottom;c.fillRect(0,0,width,h);
        c.globalCompositeOperation='source-over';
        ctx.drawImage(clip,x,0);
      }
      restoreCorner(0,455,false);
      restoreCorner(1610,438,true);

      // Reuse the exact small decorative gold rays next to the heading,
      // never copying any of the original cream English lettering.
      function restoreGoldRay(x0,y0,w,h){
        const region=sc.getImageData(x0,y0,w,h);
        const a=region.data,mask=new Uint8Array(w*h);
        for(let i=0;i<mask.length;i++){
          const p=i*4,r=a[p],g=a[p+1],b=a[p+2];
          if(r>126&&g>81&&g>b*1.55&&r>g*1.12&&b<103)mask[i]=1;
        }
        for(let pass=0;pass<2;pass++){
          const next=mask.slice();
          for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
            if(!mask[y*w+x])continue;
            for(let dy=-1;dy<=1;dy++)
              for(let dx=-1;dx<=1;dx++)next[(y+dy)*w+x+dx]=1;
          }
          mask.set(next);
        }
        for(let i=0;i<mask.length;i++)a[i*4+3]=mask[i]?255:0;
        const ray=document.createElement('canvas');ray.width=w;ray.height=h;
        ray.getContext('2d').putImageData(region,0,0);
        ctx.drawImage(ray,x0,y0);
      }
      restoreGoldRay(540,145,145,165);
      restoreGoldRay(1365,145,145,165);

      // Preserve approved absence of M & K and OUR E-INVITE. Fill only their
      // original central lettering rectangles, far from faces and dresses.
      function cleanCenter(x0,y0,w,h,top,bottom){
        const img=ctx.getImageData(x0,y0,w,h);
        const above=sc.getImageData(x0,top,w,1).data;
        const below=sc.getImageData(x0,bottom,w,1).data;
        const a=img.data;
        for(let y=0;y<h;y++){
          const t=y/(h-1),fy=Math.min(1,(y+1)/16,(h-y)/16);
          for(let x=0;x<w;x++){
            const fx=Math.min(1,(x+1)/18,(w-x)/18),opacity=Math.max(0,Math.min(fx,fy));
            const p=(y*w+x)*4,q=x*4;
            for(let k=0;k<3;k++)
              a[p+k]=Math.round(a[p+k]*(1-opacity)+
                (above[q+k]*(1-t)+below[q+k]*t)*opacity);
          }
        }
        ctx.putImageData(img,x0,y0);
      }
      cleanCenter(830,2040,377,170,2015,2240);
      cleanCenter(885,2290,273,320,2250,2630);

      // The English Song of Solomon line is in the clear burgundy at the
      // extreme bottom. Cover it fully, preserving all the portraits above.
      const scripture=document.createElement('canvas');
      scripture.width=WIDTH;scripture.height=350;
      const bc=scripture.getContext('2d');
      const bg=bc.createLinearGradient(0,0,0,350);
      for(const [y,position] of [[2722,0],[2800,78],[2880,158],[2970,248],[3070,348]])
        bg.addColorStop(position/350,rgb(edgeColor(y)));
      bc.fillStyle=bg;bc.fillRect(0,0,WIDTH,350);
      bc.globalCompositeOperation='destination-in';
      const edge=bc.createLinearGradient(0,0,0,28);
      edge.addColorStop(0,'rgba(0,0,0,0)');
      edge.addColorStop(1,'rgba(0,0,0,1)');
      bc.fillStyle=edge;bc.fillRect(0,0,WIDTH,350);
      bc.globalCompositeOperation='source-over';
      ctx.drawImage(scripture,0,2722);

      function centered(value,y,size,{script=false,italic=false,weight='500',max=1700,spacing=0}={}){
        ctx.save();
        ctx.fillStyle='#fff5e9';
        ctx.textAlign='center';ctx.textBaseline='middle';
        const family=script?'"Great Vibes", cursive':'"Cormorant Garamond", Georgia, serif';
        const setFont=n=>ctx.font=(italic?'italic ':'')+weight+' '+n+'px '+family;
        setFont(size);
        while(size>24&&ctx.measureText(value).width>max)setFont(--size);
        if(spacing&&'letterSpacing' in ctx)ctx.letterSpacing=spacing+'px';
        ctx.fillText(value,1024,y);
        ctx.restore();
      }
      centered('QUESTI DUE BAMBINI',114,72,{weight:'600',max:935,spacing:5});
      centered('si stanno',422,245,{script:true,max:1210});
      centered('sposando',660,247,{script:true,max:1260});
      centered('e non vedono l’ora',845,65,{max:880});
      centered('di festeggiare con voi!',924,62,{max:1120});
      centered('«Ho trovato l’amore dell’anima mia»',2818,86,{italic:true,max:1670});
      centered('CANTICO DEI CANTICI 3:4',2945,49,{weight:'600',max:1160,spacing:5});

      const png=await new Promise((resolve,reject)=>
        canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG encoding failed')),'image/png'));
      const pngUrl=URL.createObjectURL(png);
      // Both images must load BEFORE the pending mask disappears; otherwise
      // the lower half flashes the English base cover on mobile.
      const covers=[...stage.querySelectorAll('.cover-art')];
      await Promise.all(covers.map(img=>new Promise((resolve,reject)=>{
        img.addEventListener('load',resolve,{once:true});
        img.addEventListener('error',reject,{once:true});
        img.src=pngUrl;
      })));
      finished=true;clearTimeout(fallback);reveal();
      window.addEventListener('pagehide',()=>URL.revokeObjectURL(pngUrl),{once:true});
    }catch(error){
      console.warn('[Italian wedding cover] Could not prepare artwork',error);
      finished=true;clearTimeout(fallback);reveal();
    }
  }
  void build();
})();