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
  // Only the lettered regions are painted. Photos, gold frame, ribbon
  // details and the original 906px-wide source image are never rescaled.
  function overlayBurgundy(ctx,x,y,w,h,sampleX=450,sampleY=255){
    const px=ctx.getImageData(sampleX,sampleY,1,1).data;
    const old=ctx.getImageData(x,y,w,h);
    for(let yy=0;yy<h;yy++){
      const fadeY=Math.min(1,(yy+1)/10,(h-yy)/10);
      for(let xx=0;xx<w;xx++){
        const fadeX=Math.min(1,(xx+1)/14,(w-xx)/14);
        const alpha=Math.max(0,Math.min(fadeX,fadeY));
        const i=(yy*w+xx)*4;
        // A small deterministic variation avoids a flat rectangular patch.
        // The original pixels remain unchanged outside the feathered region.
        for(let c=0;c<3;c++)
          old.data[i+c]=Math.round(old.data[i+c]*(1-alpha)+px[c]*alpha);
      }
    }
    ctx.putImageData(old,x,y);
  }
  function centeredItalian(ctx,text,y,size,options={}){
    ctx.save();
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=options.color||CREAM;
    ctx.font=(options.italic?'italic ':'')+(options.weight||'500')+' '+size+'px '+(options.script?'"Great Vibes", cursive':serif);
    const max=options.maxWidth||770;
    while(ctx.measureText(text).width>max&&size>18){
      size--;ctx.font=(options.italic?'italic ':'')+(options.weight||'500')+' '+size+'px '+(options.script?'"Great Vibes", cursive':serif);
    }
    ctx.fillText(text,W/2,y);
    ctx.restore();
  }
  function translateCardLetters(ctx,gap){
    // Original "Thank You" on the burgundy field, safely away from faces.
    overlayBurgundy(ctx,184,105,541,120);
    centeredItalian(ctx,'Grazie di cuore',166,99,{script:true,maxWidth:530});
    // Two lines immediately below Mattia & Kirsten.
    overlayBurgundy(ctx,106,674,695,66,450,672);
    centeredItalian(ctx,'Grazie per essere con noi in questo giorno speciale.',690,29,{italic:true,maxWidth:685});
    centeredItalian(ctx,'Non vediamo l’ora di festeggiare insieme!',724,29,{italic:true,maxWidth:680});
    // Original gold plaque and frame remain; only lettering inside it changes.
    const plaqueY=805+gap;
    ctx.save();
    ctx.fillStyle='#f7db9d';
    ctx.fillRect(320,plaqueY,280,32);
    ctx.restore();
    centeredItalian(ctx,'Dettagli del matrimonio',plaqueY+16,29,{italic:true,weight:'600',color:'#6d0c21',maxWidth:278});
    // Signature under the unchanged gold details frame.
    overlayBurgundy(ctx,214,1124+gap,480,76,450,1117+gap);
    centeredItalian(ctx,'Con amore, Mattia & Kirsten',1159+gap,50,{script:true,maxWidth:477});
  }
  function replaceItalianDetails(ctx,source,offset){
    // Rebuild only the textual part of the original gold-bordered details
    // panel, leaving the perimeter, floral corner and left-side icons intact.
    const left=158,top=851,right=808,bottom=1097,w=right-left,h=bottom-top;
    const lineCanvas=document.createElement('canvas');
    lineCanvas.width=W;lineCanvas.height=2;
    const lc=lineCanvas.getContext('2d',{willReadFrequently:true});
    lc.drawImage(source,0,850,W,1,0,0,W,1);
    lc.drawImage(source,0,1098,W,1,0,1,W,1);
    const upper=lc.getImageData(0,0,W,1).data;
    const lower=lc.getImageData(0,1,W,1).data;
    const existing=ctx.getImageData(left,top+offset,w,h);
    for(let y=0;y<h;y++){
      const t=y/(h-1),fadeY=Math.min(1,(y+1)/8,(h-y)/8);
      for(let x=0;x<w;x++){
        const edgeFade=Math.min(1,(x+1)/10,(w-x)/10);
        const alpha=Math.max(0,Math.min(fadeY,edgeFade));
        const actualX=left+x,p=(y*w+x)*4,src=actualX*4;
        for(let c=0;c<3;c++){
          const clean=upper[src+c]*(1-t)+lower[src+c]*t;
          existing.data[p+c]=Math.round(existing.data[p+c]*(1-alpha)+clean*alpha);
        }
      }
    }
    ctx.putImageData(existing,left,top+offset);
    const rows=[
      ['CERIMONIA','Municipio di San Jose · Ufficio del Sindaco',870,20],
      ['DATA','07 dicembre 2026',908,23],
      ['ORA','Lunedì · ore 15:00',946,22],
      ['RICEVIMENTO','Bahay Baluk-Baluk Restaurant',984,22],
      ['ORARIO RICEV.','Dalle ore 18:00',1037,22],
      ['ABBIGLIAMENTO','Semiformale · dal rosso al bordeaux',1076,20]
    ];
    ctx.save();ctx.strokeStyle='#edc56d';ctx.lineWidth=2;
    for(const [label,value,y,fontSize] of rows){
      const yy=y+offset;
      ctx.beginPath();ctx.moveTo(345,yy-14);ctx.lineTo(345,yy+15);ctx.stroke();
      write(ctx,label,165,yy,Math.min(17,fontSize),{align:'left',weight:'600'});
      let size=fontSize;
      while(size>16&&width(ctx,value,size,{italic:true})>430)size--;
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
    // Translate embedded raster typography in place, at original pixels.
    translateCardLetters(ctx,gap);
    guestBlock(ctx,names,split,seatCount);
    replaceItalianDetails(ctx,source,gap);
    // PNG preserves the full pixel detail of the source without a second
    // lossy encode. Gmail embeds these bytes inline.
    const result=canvas.toDataURL('image/png');
    if(!result.startsWith('data:image/png;base64,')||result.length>9500000)
      throw Error('The confirmation PNG could not be prepared for email.');
    return result;
  }
  window.WEDDING_CONFIRMATION_IMAGE={createImage};
})();