/* Wedding confirmation: lossless PNG, preserved artwork and matched typography.
   If assets/wedding-thank-you.jpg exists, the actual approved Thank You artwork
   is sliced without stretching to make room for guest names. Otherwise the
   same layout is recreated from the site's own cover and monogram artwork. */
(() => {
  'use strict';
  const W=906, ORIGINAL_H=1280;
  const GOLD='#efc870', PALE='#fff0d5', DARK='#5a000d';
  const baseFont='"Cormorant Garamond", Georgia, serif';
  const scriptFont='"Great Vibes", cursive';
  const imgLoad=src=>new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(Error('Unable to load the wedding illustration.'));
    image.src=src;
  });
  const rect=(c,x,y,w,h,fill)=>{c.fillStyle=fill;c.fillRect(x,y,w,h)};
  const ln=(c,x,y,xx,yy,color=GOLD,width=2)=>{
    c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);
    c.strokeStyle=color;c.lineWidth=width;c.stroke();
  };
  const type=(c,label,x,y,size=25,opts={})=>{
    c.save();c.fillStyle=opts.color||PALE;
    c.textAlign=opts.align||'center';c.textBaseline='middle';
    c.font=(opts.italic?'italic ':'')+(opts.weight||'400')+' '+size+'px '+(opts.script?scriptFont:baseFont);
    c.fillText(label,x,y);c.restore();
  };
  const measure=(c,label,size,opts={})=>{
    c.font=(opts.italic?'italic ':'')+(opts.weight||'400')+' '+size+'px '+baseFont;
    return c.measureText(label).width;
  };
  const wrap=(c,words,maxWidth,size)=>{
    const lines=[];let row='';
    for(const word of words.split(/\s+/).filter(Boolean)){
      const next=row?row+' '+word:word;
      if(row&&measure(c,next,size,{italic:true})>maxWidth){lines.push(row);row=word;}
      else row=next;
    }
    if(row)lines.push(row);
    return lines;
  };
  const flourish=(c,x,y,scale=1)=>{
    c.save();c.translate(x,y);c.scale(scale,scale);
    c.strokeStyle=GOLD;c.lineWidth=2.2;c.beginPath();
    c.moveTo(-145,0);c.bezierCurveTo(-94,13,-77,-16,-35,0);
    c.bezierCurveTo(-12,5,-11,5,0,0);c.bezierCurveTo(11,5,12,5,35,0);
    c.bezierCurveTo(77,-16,94,13,145,0);c.stroke();
    c.beginPath();c.moveTo(0,-10);c.bezierCurveTo(-18,-25,-26,-4,0,12);
    c.bezierCurveTo(26,-4,18,-25,0,-10);c.stroke();c.restore();
  };
  const chair=(c,x,y,size=27)=>{
    c.save();c.translate(x,y);c.scale(size/24,size/24);
    c.strokeStyle=GOLD;c.lineWidth=2;c.lineJoin='round';c.lineCap='round';
    c.beginPath();c.moveTo(5,13);c.lineTo(5,7);c.quadraticCurveTo(5,5,7,5);
    c.lineTo(17,5);c.quadraticCurveTo(19,5,19,7);c.lineTo(19,13);
    c.moveTo(5,12);c.quadraticCurveTo(2,12,2,15);c.lineTo(2,19);
    c.lineTo(22,19);c.lineTo(22,15);c.quadraticCurveTo(22,12,19,12);
    c.moveTo(5,19);c.lineTo(5,21);c.moveTo(19,19);c.lineTo(19,21);
    c.stroke();c.restore();
  };
  const ornament=(c,x,y,scale=1)=>{
    c.save();c.translate(x,y);c.scale(scale,scale);
    const gold=c.createLinearGradient(-68,-52,72,130);
    gold.addColorStop(0,'#fff3ac');gold.addColorStop(.42,'#f6cd54');
    gold.addColorStop(.64,'#b77712');gold.addColorStop(1,'#ffeb90');
    c.fillStyle=gold;c.strokeStyle='#e1a83a';c.lineWidth=2;
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-91,-65,-99,48,0,20);
    c.bezierCurveTo(99,48,91,-65,0,0);c.fill();c.stroke();
    c.beginPath();c.moveTo(-4,18);c.lineTo(-33,139);c.lineTo(-8,118);c.lineTo(5,17);
    c.moveTo(4,18);c.lineTo(38,139);c.lineTo(16,115);c.lineTo(-5,17);
    c.fill();c.stroke();c.restore();
  };
  const flower=(c,x,y,s=1)=>{
    c.save();c.translate(x,y);c.scale(s,s);
    for(let i=0;i<8;i++){
      c.save();c.rotate(Math.PI*2*i/8);
      const grad=c.createRadialGradient(14,0,2,28,0,30);
      grad.addColorStop(0,'#bb1d45');grad.addColorStop(1,'#4f001b');
      c.fillStyle=grad;c.beginPath();c.ellipse(22,0,25,11,0,0,Math.PI*2);c.fill();c.restore();
    }
    c.fillStyle='#e6bb68';c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.fill();c.restore();
  };
  const border=(c,height)=>{
    c.save();const gold=c.createLinearGradient(0,0,W,height);
    gold.addColorStop(0,'#ffebb0');gold.addColorStop(.26,'#c18b2e');
    gold.addColorStop(.57,'#ffedb6');gold.addColorStop(1,'#b47b19');
    c.strokeStyle=gold;c.lineWidth=6;c.strokeRect(17,16,W-34,height-32);
    c.lineWidth=2;c.strokeRect(28,27,W-56,height-54);c.restore();
  };
  // A fallback base retains the site’s original portraits and silver monogram.
  async function fallbackBase(){
    const [cover,monogram]=await Promise.all([
      imgLoad('./slide1.webp'),
      imgLoad('./monogram-transparent.png')
    ]);
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=ORIGINAL_H;
    const c=canvas.getContext('2d',{alpha:false});
    const bg=c.createRadialGradient(W/2,560,90,W/2,680,720);
    bg.addColorStop(0,'#800018');bg.addColorStop(.68,'#66000f');bg.addColorStop(1,'#390005');
    rect(c,0,0,W,ORIGINAL_H,bg);border(c,ORIGINAL_H);
    ornament(c,115,72,.82);ornament(c,791,72,.82);
    c.drawImage(monogram,0,0,monogram.width,monogram.height,W/2-46,21,92,64);
    flourish(c,285,79,.22);flourish(c,622,79,.22);
    type(c,'Thank You',W/2,157,102,{script:true});
    // Preserve image aspect ratio rather than distorting the children.
    const cw=cover.naturalWidth,ch=cover.naturalHeight;
    const half=cw/2;
    c.save();c.beginPath();c.rect(154,226,295,365);c.clip();
    c.drawImage(cover,0,ch*.45,half,ch*.47,154,226,295,365);c.restore();
    c.save();c.beginPath();c.rect(453,226,297,365);c.clip();
    c.drawImage(cover,half,ch*.45,half,ch*.47,453,226,297,365);c.restore();
    const fade=c.createLinearGradient(0,516,0,610);
    fade.addColorStop(0,'rgba(103,0,18,0)');fade.addColorStop(1,'#680010');
    rect(c,133,516,640,95,fade);
    flower(c,123,467,.87);flower(c,780,467,.87);
    type(c,'Mattia & Kirsten',W/2,608,57,{weight:'500'});
    ln(c,142,610,220,610);ln(c,684,610,762,610);
    type(c,'Thank you for choosing to be with us on this special day.',W/2,667,24,{italic:true});
    type(c,'We cannot wait to see you and celebrate together.',W/2,698,25,{italic:true});
    flourish(c,W/2,752,.73);
    // The base uses the same simple, gold-accented information table as the
    // reference. The extra guest block is inserted between it and the message.
    c.fillStyle='#f1ce7f';c.strokeStyle='#bd8b3a';c.lineWidth=3;
    c.beginPath();c.roundRect(267,785,372,64,17);c.fill();c.stroke();
    type(c,'Wedding Details',W/2,817,46,{italic:true,weight:'600',color:'#5e0012'});
    c.strokeStyle='#d2a866';c.lineWidth=2;
    c.beginPath();c.roundRect(71,858,765,281,16);c.stroke();
    const rows=[
      ['CEREMONY','San Jose New Municipal Hall — Office of the Mayor'],
      ['DATE','07 December 2026'],
      ['TIME','Monday · 3:00 PM'],
      ['RECEPTION','Bahay Baluk Baluk Restaurant,'],
      ['RECEPTION TIME','6:00 PM onwards'],
      ['DRESS CODE','Semi-formal · Shades of Red to Burgundy']
    ];
    const yy=[881,925,969,1013,1057,1101];
    ln(c,340,875,340,1120);
    rows.forEach(([label,value],i)=>{
      type(c,label,164,yy[i],21,{weight:'600',align:'left'});
      if(i===3){
        type(c,'Bahay Baluk Baluk Restaurant,',365,1000,21,{italic:true,align:'left'});
        type(c,'Maatas Na Kahoy, Lipa City, Batangas',365,1024,20,{italic:true,align:'left'});
      }else{
        let sz=23;while(sz>17&&measure(c,value,sz,{italic:true})>445)sz--;
        type(c,value,365,yy[i],sz,{italic:true,align:'left'});
      }
    });
    type(c,'With love, Mattia & Kirsten',W/2,1207,55,{script:true});
    flourish(c,W/2,1245,.78);flower(c,91,1205,.66);flower(c,817,1205,.66);
    return canvas;
  }
  function drawPersonalized(c,names,split,gap){
    const center=W/2;
    const displayed=Math.min(names.length,7);
    const step=39,first=center-(displayed*30+(displayed-1)*9)/2;
    for(let i=0;i<displayed;i++)chair(c,first+i*step,split+17,30);
    const label=names.length+' '+(names.length===1?'seat reserved for you':'seats reserved for you');
    let size=39;while(size>23&&measure(c,label,size,{weight:'600'})>760)size--;
    type(c,label,center,split+68,size,{weight:'600',color:'#f6d890'});
    const content=names.map(n=>n.trim()).join('  ·  ');
    let font=30,lines=[];
    do{lines=wrap(c,content,790,font);if(lines.length<=5)break;font-=2}while(font>=18);
    if(lines.length>5)throw Error('The guest names are too long for the confirmation.');
    let y=split+107;
    for(const row of lines){
      type(c,row,center,y,font,{italic:true,weight:'500'});
      y+=32;
    }
    return y;
  }
  function correctReferenceAddress(c,offset){
    // Replace only the three right-hand values. Recreate their actual
    // burgundy background from clean poster rows rather than placing a dark
    // rectangle over the original design.
    const x=357,y=973+offset,w=461,h=116;
    const top=c.getImageData(x,968+offset,w,1).data;
    const bottom=c.getImageData(x,1091+offset,w,1).data;
    const block=c.createImageData(w,h);
    for(let row=0;row<h;row++){
      const t=row/(h-1);
      for(let col=0;col<w;col++){
        const k=col*4,p=(row*w+col)*4;
        for(let ch=0;ch<3;ch++){
          const c1=top[k+ch],c2=bottom[k+ch];
          // Avoid carrying a decorative highlight or lettering all the way
          // through the painted area.
          block.data[p+ch]=Math.round((c1>135?78:c1)*(1-t)+(c2>135?78:c2)*t);
        }
        block.data[p+3]=255;
      }
    }
    c.putImageData(block,x,y);
    const value=(label,yy,targetSize)=>{
      let sz=targetSize;
      while(sz>17&&measure(c,label,sz,{italic:true})>440)sz--;
      type(c,label,371,yy+offset,sz,{align:'left',italic:true});
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
      await Promise.allSettled([
        document.fonts.load('32px "Cormorant Garamond"'),
        document.fonts.load('64px "Great Vibes"')
      ]);
    }
    // The exact second reference can be added under this asset name.
    const reference=await imgLoad('./assets/wedding-thank-you.jpg').catch(()=>null);
    const base=reference?null:await fallbackBase();
    const namesJoined=names.map(n=>n.trim()).join('  ·  ');
    const scratch=document.createElement('canvas').getContext('2d');
    let estimated=wrap(scratch,namesJoined,790,27).length;
    if(estimated>5)throw Error('The confirmation contains too many guest names.');
    const gap=Math.max(185,114+estimated*33);
    const canvas=document.createElement('canvas');
    canvas.width=W;canvas.height=ORIGINAL_H+gap;
    const c=canvas.getContext('2d',{alpha:false});
    if(!c)throw Error('Image rendering is not supported on this device.');
    const split=751;
    rect(c,0,0,W,canvas.height,DARK);
    const image=reference||base;
    const width=reference?reference.naturalWidth:W;
    const height=reference?reference.naturalHeight:ORIGINAL_H;
    const splitSource=Math.floor(height*split/ORIGINAL_H);
    // Copy pixels once: no aspect distortion, preserving photo detail.
    c.drawImage(image,0,0,width,splitSource,0,0,W,split);
    c.drawImage(image,0,splitSource,width,height-splitSource,
      0,split+gap,W,ORIGINAL_H-split);
    // Match every column of the untouched source image at both edges of
    // the new central area. No stretching, upscaling or visible dark seam.
    const innerX=37,innerW=W-74;
    const above=c.getImageData(innerX,split-1,innerW,1).data;
    // Sample a clean burgundy row before the original gold flourish, so\n    // decorative pixels cannot smear vertically through the new space.\n    const below=c.getImageData(innerX,split-7,innerW,1).data;
    const stripe=c.createImageData(innerW,gap);
    for(let yy=0;yy<gap;yy++){
      const t=yy/(gap-1);
      for(let xx=0;xx<innerW;xx++){
        const pos=xx*4,out=(yy*innerW+xx)*4;
        stripe.data[out]=Math.round(above[pos]*(1-t)+below[pos]*t);
        stripe.data[out+1]=Math.round(above[pos+1]*(1-t)+below[pos+1]*t);
        stripe.data[out+2]=Math.round(above[pos+2]*(1-t)+below[pos+2]*t);
        stripe.data[out+3]=255;
      }
    }
    c.putImageData(stripe,innerX,split);
    ln(c,17,split,17,split+gap,'#d7a246',5);
    ln(c,28,split,28,split+gap,'#f7e0a0',2);
    ln(c,W-17,split,W-17,split+gap,'#d7a246',5);
    ln(c,W-28,split,W-28,split+gap,'#f7e0a0',2);
    drawPersonalized(c,names,split,gap);
    if(reference)correctReferenceAddress(c,gap);
    const data=canvas.toDataURL('image/png');
    if(!data.startsWith('data:image/png;base64,'))
      throw Error('Unable to generate the lossless confirmation PNG.');
    if(data.length>9500000)throw Error('The image is too large to email. Please contact the couple.');
    return data;
  }
  window.WEDDING_CONFIRMATION_IMAGE={createImage};
})();