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
    const heading=seatCount+' '+(seatCount===1?'seat reserved for you':'seats reserved for you');
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
  function replaceReceptionAddress(ctx,source,offset){
    // Rebuild the LAST THREE rows as one clean area, then draw all labels,
    // values and three INDEPENDENT gold bars. This removes raster ghosts from
    // the original words and never paints over the illustrations or frame.
    const left=153,top=968,right=807,bottom=1095,w=right-left,h=bottom-top;
    const scan=document.createElement('canvas');
    scan.width=W;scan.height=2;
    const sc=scan.getContext('2d',{willReadFrequently:true});
    sc.drawImage(source,0,966,W,1,0,0,W,1);
    sc.drawImage(source,0,1091,W,1,0,1,W,1);
    const topPixels=sc.getImageData(0,0,W,1).data;
    const bottomPixels=sc.getImageData(0,1,W,1).data;
    const original=ctx.getImageData(left,top+offset,w,h).data;
    const cleaned=ctx.createImageData(w,h);
    for(let y=0;y<h;y++){
      const t=y/(h-1);
      const verticalFade=Math.min(1,(y+1)/7,(h-y)/7);
      for(let x=0;x<w;x++){
        const actualX=x+left,pi=(y*w+x)*4,si=actualX*4;
        const horizontalFade=Math.min(1,(x+1)/12,(w-x)/12);
        const alpha=Math.max(0,Math.min(1,verticalFade*horizontalFade));
        for(let color=0;color<3;color++){
          // Average nearby burgundy pixels from a clean source row to
          // maintain the poster's natural color gradient without old text.
          let sum=0,points=0;
          for(let dx=-3;dx<=3;dx++){
            const xi=Math.max(left,Math.min(right-1,actualX+dx))*4+color;
            sum+=topPixels[xi]*(1-t)+bottomPixels[xi]*t;
            points++;
          }
          const clean=sum/points;
          cleaned.data[pi+color]=Math.round(original[pi+color]*(1-alpha)+clean*alpha);
        }
        cleaned.data[pi+3]=255;
      }
    }
    ctx.putImageData(cleaned,left,top+offset);

    // The reception takes two lines; the other two rows move down a little.
    // Bar positions are in the original artwork's 906px coordinate system.
    ctx.save();
    ctx.strokeStyle='#e9bf62';
    ctx.lineWidth=2.2;
    ctx.lineCap='round';
    for(const [y1,y2] of [[976,1018],[1034,1055],[1072,1091]]){
      ctx.beginPath();
      ctx.moveTo(345,y1+offset);
      ctx.lineTo(345,y2+offset);
      ctx.stroke();
    }
    ctx.restore();

    const label=(text,y,size=19)=>{
      write(ctx,text,166,y+offset,size,{align:'left',weight:'600'});
    };
    const value=(text,y,initial=23)=>{
      let size=initial;
      while(size>17&&width(ctx,text,size,{italic:true})>431)size--;
      write(ctx,text,371,y+offset,size,{align:'left',italic:true});
    };
    label('RECEPTION',991,21);
    label('RECEPTION TIME',1045,19);
    label('DRESS CODE',1083,19);
    value('Bahay Baluk Baluk Restaurant,',984,23);
    value('Maatas Na Kahoy, Lipa City, Batangas',1010,22);
    value('6:00 PM onwards',1045,24);
    value('Semi-formal · Shades of Red to Burgundy',1083,22);
  }
  async function createImage(names,seatCount=names.length){
    if(!Array.isArray(names)||!names.length||names.length>20||
       names.some(n=>typeof n!=='string'||!n.trim()))
      throw Error('No attending guests are available for the confirmation.');
    if(!Number.isSafeInteger(seatCount)||seatCount<names.length||seatCount>20)
      throw Error('Invalid seat count for the wedding confirmation.');
    if(document.fonts?.load){
      await document.fonts.load('32px "Cormorant Garamond"').catch(()=>{});
    }
    const source=await load('./assets/wedding-thank-you.jpg?v=20261107-original-approved1');
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
    guestBlock(ctx,names,split,seatCount);
    replaceReceptionAddress(ctx,source,gap);
    // PNG preserves the full pixel detail of the source without a second
    // lossy encode. Gmail embeds these bytes inline.
    const result=canvas.toDataURL('image/png');
    if(!result.startsWith('data:image/png;base64,')||result.length>9500000)
      throw Error('The confirmation PNG could not be prepared for email.');
    return result;
  }
  window.WEDDING_CONFIRMATION_IMAGE={createImage};
})();