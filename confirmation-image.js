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
  function extendBlankBackground(ctx,split,gap){
    // Copy clean burgundy rows from the exact reference so the inserted
    // space has the same horizontal gradient and no ornamental streaks.
    const innerX=37,innerW=W-74;
    const top=ctx.getImageData(innerX,split-1,innerW,1).data;
    const bottom=ctx.getImageData(innerX,split-7,innerW,1).data;
    const image=ctx.createImageData(innerW,gap);
    for(let y=0;y<gap;y++){
      const t=y/(gap-1);
      for(let x=0;x<innerW;x++){
        const i=x*4,o=(y*innerW+x)*4;
        for(let k=0;k<3;k++)image.data[o+k]=Math.round(top[i+k]*(1-t)+bottom[i+k]*t);
        image.data[o+3]=255;
      }
    }
    ctx.putImageData(image,innerX,split);
    for(const [x,weight,color] of [
      [17,5,'#d7a246'],[28,2,'#f7e0a0'],
      [W-17,5,'#d7a246'],[W-28,2,'#f7e0a0']]){
      ctx.beginPath();ctx.moveTo(x,split);ctx.lineTo(x,split+gap);
      ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.stroke();
    }
  }
  function guestBlock(ctx,names,split){
    const middle=W/2,n=Math.min(names.length,7);
    const step=39,first=middle-(n*30+(n-1)*9)/2;
    for(let i=0;i<n;i++)chair(ctx,first+i*step,split+17,30);
    const heading=names.length+' '+(names.length===1?'seat reserved for you':'seats reserved for you');
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
  function replaceReceptionAddress(ctx,offset){
    // Match the burgundy pixels of the reference before replacing only its
    // right-hand reception values; retain all labels and decorative borders.
    const x=357,y=973+offset,w=461,h=116;
    const top=ctx.getImageData(x,968+offset,w,1).data;
    const bottom=ctx.getImageData(x,1091+offset,w,1).data;
    const area=ctx.createImageData(w,h);
    for(let row=0;row<h;row++){
      const t=row/(h-1);
      for(let col=0;col<w;col++){
        const k=col*4,p=(row*w+col)*4;
        for(let ch=0;ch<3;ch++){
          const a=top[k+ch],b=bottom[k+ch];
          area.data[p+ch]=Math.round((a>135?78:a)*(1-t)+(b>135?78:b)*t);
        }
        area.data[p+3]=255;
      }
    }
    ctx.putImageData(area,x,y);
    const value=(text,position,size)=>{
      while(size>17&&width(ctx,text,size,{italic:true})>435)size--;
      write(ctx,text,371,position+offset,size,{italic:true,align:'left'});
    };
    value('Bahay Baluk Baluk Restaurant,',987,23);
    value('Maatas Na Kahoy, Lipa City, Batangas',1010,21);
    value('6:00 PM onwards',1036,23);
    value('Semi-formal · Shades of Red to Burgundy',1072,22);
  }
  async function createImage(names){
    if(!Array.isArray(names)||!names.length||names.length>20||
       names.some(n=>typeof n!=='string'||!n.trim()))
      throw Error('No attending guests are available for the confirmation.');
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
    const gap=Math.max(185,114+lines*33),split=751;
    const canvas=document.createElement('canvas');
    canvas.width=W;canvas.height=H+gap;
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw Error('This browser cannot create the confirmation image.');
    ctx.drawImage(source,0,0,W,split,0,0,W,split);
    ctx.drawImage(source,0,split,W,H-split,0,split+gap,W,H-split);
    extendBlankBackground(ctx,split,gap);
    guestBlock(ctx,names,split);
    replaceReceptionAddress(ctx,gap);
    // PNG preserves the full pixel detail of the source without a second
    // lossy encode. Gmail embeds these bytes inline.
    const result=canvas.toDataURL('image/png');
    if(!result.startsWith('data:image/png;base64,')||result.length>9500000)
      throw Error('The confirmation PNG could not be prepared for email.');
    return result;
  }
  window.WEDDING_CONFIRMATION_IMAGE={createImage};
})();