/* Lossless personalized wedding confirmation from the exact approved Thank You
   artwork. No redraw, stretching or extra JPEG re-encoding of the source. */
(() => {
  'use strict';
  const W=906,H=1280,GOLD='#efc870',CREAM='#fff0d5';
  const serif='"Cormorant Garamond", Georgia, serif';
  const load=src=>new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(Error('The wedding confirmation artwork is not available.'));
    image.src=src;
  });
  const font=(ctx,size,opts={})=>{
    ctx.font=(opts.italic?'italic ':'')+(opts.weight||'500')+' '+size+'px '+serif;
  };
  const width=(ctx,text,size,opts={})=>{font(ctx,size,opts);return ctx.measureText(text).width;};
  const write=(ctx,text,x,y,size,opts={})=>{
    ctx.save();
    font(ctx,size,opts);
    ctx.textAlign=opts.align||'center';
    ctx.textBaseline='middle';ctx.fillStyle=opts.color||CREAM;
    ctx.fillText(text,x,y);
    ctx.restore();
  };
  const wrap=(ctx,words,maxWidth,size)=>{
    const lines=[];let current='';
    for(const word of String(words).split(/\s+/).filter(Boolean)){
      const next=current?current+' '+word:word;
      if(current&&width(ctx,next,size,{italic:true})>maxWidth){
        lines.push(current);current=word;
      }else current=next;
    }
    if(current)lines.push(current);
    return lines;
  };
  const chair=(ctx,x,y,size=29)=>{
    ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);
    ctx.strokeStyle=GOLD;ctx.lineWidth=1.8;
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();
    ctx.moveTo(5,13);ctx.lineTo(5,7);ctx.quadraticCurveTo(5,5,7,5);
    ctx.lineTo(17,5);ctx.quadraticCurveTo(19,5,19,7);ctx.lineTo(19,13);
    ctx.moveTo(5,12);ctx.quadraticCurveTo(2,12,2,15);ctx.lineTo(2,19);
    ctx.lineTo(22,19);ctx.lineTo(22,15);ctx.quadraticCurveTo(22,12,19,12);
    ctx.moveTo(5,19);ctx.lineTo(5,21);ctx.moveTo(19,19);ctx.lineTo(19,21);
    ctx.stroke();ctx.restore();
  };
  function extendBlankBackground(ctx,source,split,gap){
    // Extend the artwork only between two adjacent plain rows. Preserve
    // the original full-width gold frame, including its antialiasing.
    // Softly blur the burgundy interior horizontally: copying a single
    // textured scanline downward would create visible vertical streaks.
    const upper=ctx.getImageData(0,split-1,W,1).data;
    const scan=document.createElement('canvas');
    scan.width=W;scan.height=1;
    const sc=scan.getContext('2d',{willReadFrequently:true});
    sc.drawImage(source,0,split,W,1,0,0,W,1);
    const lower=sc.getImageData(0,0,W,1).data;
    const interiorLeft=43,interiorRight=W-43,radius=35,stride=W*4;
    const smooth=new Float32Array(stride);
    for(let x=interiorLeft;x<interiorRight;x++){
      const lo=Math.max(interiorLeft,x-radius);
      const hi=Math.min(interiorRight-1,x+radius);
      const samples=hi-lo+1;
      for(let color=0;color<3;color++){
        let sum=0;
        for(let xx=lo;xx<=hi;xx++){
          const i=xx*4+color;
          sum+=(upper[i]+lower[i])*.5;
        }
        smooth[x*4+color]=sum/samples;
      }
    }
    const block=ctx.createImageData(W,gap);
    for(let y=0;y<gap;y++){
      const t=(y+1)/(gap+1);
      const yBlend=Math.min(1,(y+1)/20,(gap-y)/20);
      for(let x=0;x<W;x++){
        const xBlend=Math.max(0,Math.min(1,(x-interiorLeft)/40,(interiorRight-x)/40));
        const alpha=xBlend*yBlend,src=x*4,dst=(y*W+x)*4;
        for(let ch=0;ch<3;ch++){
          const raw=upper[src+ch]*(1-t)+lower[src+ch]*t;
          block.data[dst+ch]=Math.round(raw*(1-alpha)+smooth[src+ch]*alpha);
        }
        block.data[dst+3]=255;
      }
    }
    ctx.putImageData(block,0,split);
  }
  function guestBlock(ctx,names,split,seatCount=names.length){
    const middle=W/2,n=Math.min(seatCount,7);
    const step=39,first=middle-(n*30+(n-1)*9)/2;
    for(let i=0;i<n;i++)chair(ctx,first+i*step,split+17,30);
    const heading=seatCount+' '+(seatCount===1?'posto riservato per voi':'posti riservati per voi');
    let headingSize=40;while(headingSize>22&&width(ctx,heading,headingSize,{weight:'600'})>770)headingSize--;
    write(ctx,heading,middle,split+68,headingSize,{color:'#f6d890',weight:'600'});
    const combined=names.map(n=>n.trim()).join('  ·  ');
    let size=30,lines=[];
    for(;size>=18;size-=2){
      lines=wrap(ctx,combined,790,size);
      if(lines.length<=5&&lines.every(l=>width(ctx,l,size,{italic:true})<=790))break;
    }
    if(size<18||lines.length>5)throw Error('Guest names are too long to fit on this invitation.');
    let y=split+108;
    for(const row of lines){
      write(ctx,row,middle,y,size,{italic:true,weight:'500'});
      y+=32;
    }
  }
  // The original poster has one smooth burgundy background. Rebuild each
  // complete text field from the DARK BURGUNDY pixels of the untouched JPEG,
  // never from nearby letters. In particular, do not use per-glyph inpainting:
  // it created visible red puddles and left parts of English words behind.
  function paintCleanBurgundy(ctx,sourcePixels,x0,y0,x1,y1,offset=0,edge=3){
    const w=x1-x0,h=y1-y0,mid=Math.floor((x0+x1)/2);
    const colors=new Float32Array(h*6);
    const halves=[[x0,mid],[mid,x1]];
    for(let y=0;y<h;y++){
      for(let side=0;side<2;side++){
        const [left,right]=halves[side];
        let r=0,g=0,b=0,count=0;
        for(let x=left;x<right;x+=2){
          const i=((y+y0)*W+x)*4;
          const R=sourcePixels[i],G=sourcePixels[i+1],B=sourcePixels[i+2];
          if(R>40&&R<140&&G<45&&B<48&&R>G*1.5){
            r+=R;g+=G;b+=B;count++;
          }
        }
        const k=y*6+side*3;
        // A row always has lots of clean burgundy because the JPEG text
        // covers less than half the panel. Use a neutral fallback only if
        // the input artwork ever changes.
        colors[k]=count?r/count:77;
        colors[k+1]=count?g/count:1;
        colors[k+2]=count?b/count:9;
      }
    }
    const smooth=new Float32Array(h*6);
    for(let y=0;y<h;y++){
      for(let k=0;k<6;k++){
        let sum=0,count=0;
        for(let d=-3;d<=3;d++){
          const yy=Math.max(0,Math.min(h-1,y+d));
          sum+=colors[yy*6+k];count++;
        }
        smooth[y*6+k]=sum/count;
      }
    }
    const out=ctx.getImageData(x0,y0+offset,w,h),data=out.data;
    for(let y=0;y<h;y++){
      const fy=edge?Math.min(1,y/edge,(h-1-y)/edge):1;
      const k=y*6;
      for(let x=0;x<w;x++){
        const fx=edge?Math.min(1,x/edge,(w-1-x)/edge):1;
        const alpha=Math.max(0,Math.min(1,fx,fy));
        if(alpha===0)continue;
        const t=x/(w-1),p=(y*w+x)*4;
        for(let c=0;c<3;c++){
          const clean=smooth[k+c]*(1-t)+smooth[k+3+c]*t;
          data[p+c]=Math.round(data[p+c]*(1-alpha)+clean*alpha);
        }
        data[p+3]=255;
      }
    }
    ctx.putImageData(out,x0,y0+offset);
  }

  function restoreGold(ctx,sourcePixels,x0,y0,x1,y1){
    // Restore gold decorative rays and the upper edge of the two picture
    // frames after cleaning the large original "Thank You" lettering.
    // White/cream English text never passes this gold color filter.
    const w=x1-x0,h=y1-y0,mask=new Uint8Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=((y+y0)*W+x+x0)*4,R=sourcePixels[i],
        G=sourcePixels[i+1],B=sourcePixels[i+2];
      if(R>120&&G>65&&B<G*.76&&G>B*1.28&&R>G*1.06)
        mask[y*w+x]=1;
    }
    const expanded=mask.slice();
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      if(!mask[y*w+x])continue;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)
        expanded[(y+dy)*w+x+dx]=1;
    }
    const out=ctx.getImageData(x0,y0,w,h),data=out.data;
    for(let i=0;i<expanded.length;i++){
      if(!expanded[i])continue;
      const x=i%w,y=Math.floor(i/w),si=((y+y0)*W+x+x0)*4,p=i*4;
      data[p]=sourcePixels[si];
      data[p+1]=sourcePixels[si+1];
      data[p+2]=sourcePixels[si+2];
      data[p+3]=255;
    }
    ctx.putImageData(out,x0,y0);
  }

  function paintCleanPlaque(ctx,sourcePixels,offset){
    // The gold plaque has a horizontal cream-to-gold gradient. Recreate
    // only its INNER lettering area; the gold border and ornament stay.
    const x0=310,y0=795,w=291,h=41;
    const avg=(xStart,xEnd,yStart,yEnd)=>{
      const sum=[0,0,0];let n=0;
      for(let y=yStart;y<yEnd;y++)for(let x=xStart;x<xEnd;x++){
        const p=(y*W+x)*4;
        for(let c=0;c<3;c++)sum[c]+=sourcePixels[p+c];
        n++;
      }
      return sum.map(v=>v/n);
    };
    const top=avg(444,462,793,798);
    const bottom=avg(444,462,833,836);
    const out=ctx.getImageData(x0,y0+offset,w,h),data=out.data;
    for(let yy=0;yy<h;yy++){
      const Y=y0+yy;
      const left=avg(308,314,Math.max(0,Y-2),Math.min(H,Y+3));
      const right=avg(596,603,Math.max(0,Y-2),Math.min(H,Y+3));
      const v=yy/h;
      for(let xx=0;xx<w;xx++){
        const t=xx/(w-1),centerWeight=4*t*(1-t);
        const fade=Math.max(0,Math.min(1,xx/2,(w-1-xx)/2,yy/2,(h-1-yy)/2));
        const p=(yy*w+xx)*4;
        for(let c=0;c<3;c++){
          const mid=top[c]*(1-v)+bottom[c]*v;
          const edge=left[c]*(1-t)+right[c]*t;
          const clean=edge*(1-centerWeight)+mid*centerWeight;
          data[p+c]=Math.round(data[p+c]*(1-fade)+clean*fade);
        }
        data[p+3]=255;
      }
    }
    ctx.putImageData(out,x0,y0+offset);
  }

  function centeredItalian(ctx,text,y,size,options={}){
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=options.color||CREAM;
    const family=options.script?'"Great Vibes", cursive':serif;
    const max=options.maxWidth||770;
    const setSize=n=>ctx.font=(options.italic?'italic ':'')+
      (options.weight||'500')+' '+n+'px '+family;
    setSize(size);
    while(ctx.measureText(text).width>max&&size>18)setSize(--size);
    ctx.fillText(text,W/2,y);ctx.restore();
  }

  function cleanItalianCard(ctx,sourcePixels,gap){
    // Positions below the added guest-name area use the same gap as the
    // original English generator. The original 906px photos are unchanged.
    paintCleanBurgundy(ctx,sourcePixels,156,100,750,245,0,3);
    restoreGold(ctx,sourcePixels,148,125,209,197);
    restoreGold(ctx,sourcePixels,706,125,769,197);
    restoreGold(ctx,sourcePixels,234,223,423,246);
    restoreGold(ctx,sourcePixels,480,223,671,246);
    paintCleanBurgundy(ctx,sourcePixels,105,672,804,744,0,4);
    paintCleanPlaque(ctx,sourcePixels,gap);
    paintCleanBurgundy(ctx,sourcePixels,153,846,827,1100,gap,3);
    paintCleanBurgundy(ctx,sourcePixels,209,1114,706,1197,gap,4);
  }

  function drawItalianCardText(ctx,gap){
    centeredItalian(ctx,'Grazie di cuore',166,96,
      {script:true,maxWidth:565});
    centeredItalian(ctx,'Grazie per essere con noi in questo giorno speciale.',694,29,
      {italic:true,maxWidth:688});
    centeredItalian(ctx,'Non vediamo l’ora di festeggiare insieme!',727,29,
      {italic:true,maxWidth:688});
    centeredItalian(ctx,'Dettagli del matrimonio',815+gap,28,
      {italic:true,weight:'600',color:'#6d0c21',maxWidth:283});
    centeredItalian(ctx,'Con amore, Mattia & Kirsten',1155+gap,51,
      {script:true,maxWidth:486});
  }

  function drawItalianDetails(ctx,gap){
    const rows=[
      ['CERIMONIA','Municipio di San Jose · Ufficio del Sindaco',869,20],
      ['DATA','07 dicembre 2026',908,22],
      ['ORA','Lunedì · ore 15:00',948,22],
      ['RICEVIMENTO','Bahay Baluk-Baluk Restaurant',987,22],
      ['ORARIO RICEV.','Dalle ore 18:00',1029,22],
      ['ABBIGLIAMENTO','Semiformale · dal rosso al bordeaux',1070,21]
    ];
    ctx.save();ctx.strokeStyle='#edc56d';ctx.lineWidth=2;
    for(const [label,value,y,fontSize] of rows){
      const yy=y+gap;
      ctx.beginPath();ctx.moveTo(345,yy-14);ctx.lineTo(345,yy+15);ctx.stroke();
      write(ctx,label,165,yy,Math.min(17,fontSize),{align:'left',weight:'600'});
      let size=fontSize;
      while(size>16&&width(ctx,value,size,{italic:true})>439)size--;
      write(ctx,value,369,yy,size,{align:'left',italic:true});
    }
    ctx.restore();
  }
  async function createImage(names,seatCount=names.length){
    if(!Array.isArray(names)||!names.length||names.length>20||
       names.some(n=>typeof n!=='string'||!n.trim()))
      throw Error('No attending guests are available for the confirmation.');
    if(!Number.isSafeInteger(seatCount)||seatCount<names.length||seatCount>20)
      throw Error('Invalid seat count for the wedding confirmation.');
    if(document.fonts?.load){
      await Promise.all([
        document.fonts.load('32px "Cormorant Garamond"'),
        document.fonts.load('105px "Great Vibes"')
      ]).catch(()=>{});
    }
    const source=await load('../assets/wedding-thank-you.jpg?v=20261107-original-approved1');
    if(source.naturalWidth!==W||source.naturalHeight!==H)
      throw Error('The wedding confirmation artwork has unexpected dimensions.');
    const combined=names.map(n=>n.trim()).join('  ·  ');
    const probe=document.createElement('canvas').getContext('2d');
    const lines=wrap(probe,combined,790,27).length;
    if(lines>5)throw Error('There are too many guest names to fit on the invitation.');
    const gap=Math.max(185,114+lines*33),split=744;
    const canvas=document.createElement('canvas');
    canvas.width=W;canvas.height=H+gap;
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw Error('This browser cannot create the confirmation image.');
    ctx.drawImage(source,0,0,W,split,0,0,W,split);
    ctx.drawImage(source,0,split,W,H-split,0,split+gap,W,H-split);
    extendBlankBackground(ctx,source,split,gap);
    // Read the untouched source ONCE. Never sample from an image where
    // previous text patches have already altered the background.
    const original=document.createElement('canvas');
    original.width=W;original.height=H;
    const originalCtx=original.getContext('2d',{willReadFrequently:true});
    if(!originalCtx)throw Error('Unable to prepare the original wedding artwork.');
    originalCtx.drawImage(source,0,0,W,H);
    const sourcePixels=originalCtx.getImageData(0,0,W,H).data;
    cleanItalianCard(ctx,sourcePixels,gap);
    drawItalianCardText(ctx,gap);
    guestBlock(ctx,names,split,seatCount);
    drawItalianDetails(ctx,gap);
    // PNG preserves the full pixel detail of the source without a second
    // lossy encode. Gmail embeds these bytes inline.
    const result=canvas.toDataURL('image/png');
    if(!result.startsWith('data:image/png;base64,')||result.length>9500000)
      throw Error('The confirmation PNG could not be prepared for email.');
    return result;
  }
  window.WEDDING_CONFIRMATION_IMAGE={createImage};
})();