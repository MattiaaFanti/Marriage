/* Wedding confirmation postcard. The only email body content is this rendered image.
   Uses the approved wedding cover artwork, locally hosted on the same GitHub Pages origin. */
(() => {
  'use strict';
  const WIDTH=1122, HEIGHT=1402, GOLD='#f4cc79', PALE='#fff0dd', BURGUNDY='#570009';
  const roundRect=(c,x,y,w,h,r,fill,stroke='',line=1)=>{
    c.beginPath();c.roundRect(x,y,w,h,r);
    if(fill){c.fillStyle=fill;c.fill()}
    if(stroke){c.lineWidth=line;c.strokeStyle=stroke;c.stroke()}
  };
  const line=(c,x1,y1,x2,y2,color=GOLD,width=2)=>{
    c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);
    c.strokeStyle=color;c.lineWidth=width;c.stroke();
  };
  const centerText=(c,text,x,y,size=32,color=PALE,italic=false,bold=false)=>{
    c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;
    c.font=(italic?'italic ':'')+(bold?'bold ':'')+size+'px Georgia, "Times New Roman", serif';
    c.fillText(String(text),x,y);
  };
  const fitText=(c,text,maxWidth,font=32,min=17,italic=false,bold=false)=>{
    let size=font;do{
      c.font=(italic?'italic ':'')+(bold?'bold ':'')+size+'px Georgia, serif';
      if(c.measureText(text).width<=maxWidth)break;
    }while(--size>min);
    return size;
  };
  const corner=(c,x,y,sx,sy)=>{
    c.save();c.translate(x,y);c.scale(sx,sy);
    c.strokeStyle=GOLD;c.lineWidth=4;
    c.beginPath();c.moveTo(0,55);c.quadraticCurveTo(22,55,23,25);c.quadraticCurveTo(24,3,57,0);c.stroke();
    c.restore();
  };
  const flourish=(c,x,y,scale=1)=>{
    c.save();c.translate(x,y);c.scale(scale,scale);
    c.strokeStyle=GOLD;c.lineWidth=2.5;
    c.beginPath();
    c.moveTo(-190,0);c.bezierCurveTo(-128,16,-107,-20,-47,0);
    c.bezierCurveTo(-25,9,-17,5,0,0);
    c.bezierCurveTo(17,5,25,9,47,0);
    c.bezierCurveTo(107,-20,128,16,190,0);c.stroke();
    c.beginPath();c.moveTo(0,-12);c.bezierCurveTo(-19,-30,-31,-8,0,14);
    c.bezierCurveTo(31,-8,19,-30,0,-12);c.stroke();c.restore();
  };
  const flower=(c,x,y,s=1)=>{
    c.save();c.translate(x,y);c.scale(s,s);
    for(let i=0;i<10;i++){
      c.rotate(Math.PI/5);
      const grad=c.createLinearGradient(-10,0,40,0);
      grad.addColorStop(0,'#7d0524');grad.addColorStop(.6,'#b5274c');grad.addColorStop(1,'#55001a');
      c.fillStyle=grad;c.beginPath();c.ellipse(22,0,32,13,0,0,Math.PI*2);c.fill();
    }
    c.fillStyle='#f8d28b';c.beginPath();c.arc(0,0,9,0,Math.PI*2);c.fill();c.restore();
  };
  const bow=(c,x,y,flip=1)=>{
    c.save();c.translate(x,y);c.scale(flip,1);
    const gold=c.createLinearGradient(-80,-60,80,140);
    gold.addColorStop(0,'#fff7b5');gold.addColorStop(.35,'#f5c552');
    gold.addColorStop(.7,'#a86609');gold.addColorStop(1,'#ffdd6a');
    c.fillStyle=gold;c.strokeStyle='#d59b29';c.lineWidth=3;
    c.beginPath();c.moveTo(0,5);c.bezierCurveTo(-105,-80,-100,73,0,24);
    c.bezierCurveTo(105,73,105,-80,0,5);c.fill();c.stroke();
    c.beginPath();c.moveTo(-4,25);c.lineTo(-48,160);c.lineTo(-13,127);c.lineTo(6,29);
    c.moveTo(4,25);c.lineTo(47,143);c.lineTo(26,119);c.lineTo(-6,29);c.fill();c.stroke();
    roundRect(c,-12,8,24,22,5,gold,'#d89c2b',2);c.restore();
  };
  const chair=(c,x,y,size)=>{
    c.save();c.translate(x,y);c.scale(size/24,size/24);
    c.strokeStyle='#f7d48d';c.lineWidth=1.8;c.lineCap='round';c.lineJoin='round';
    c.beginPath();
    c.moveTo(5,13);c.lineTo(5,7);c.quadraticCurveTo(5,5,7,5);c.lineTo(17,5);
    c.quadraticCurveTo(19,5,19,7);c.lineTo(19,13);
    c.moveTo(5,12);c.quadraticCurveTo(2,12,2,15);c.lineTo(2,19);c.lineTo(22,19);
    c.lineTo(22,15);c.quadraticCurveTo(22,12,19,12);
    c.moveTo(5,19);c.lineTo(5,21);c.moveTo(19,19);c.lineTo(19,21);c.stroke();c.restore();
  };
  const pin=(c,x,y)=>{
    c.save();c.fillStyle=GOLD;c.beginPath();c.arc(x,y,12,Math.PI,0);
    c.bezierCurveTo(x+12,y+16,x,y+26,x,y+26);
    c.bezierCurveTo(x,y+26,x-12,y+16,x-12,y);c.fill();
    c.fillStyle='#66001b';c.beginPath();c.arc(x,y,4,0,2*Math.PI);c.fill();c.restore();
  };
  const clock=(c,x,y)=>{
    c.save();c.strokeStyle=GOLD;c.lineWidth=4;c.beginPath();c.arc(x,y,13,0,Math.PI*2);
    c.moveTo(x,y-8);c.lineTo(x,y);c.lineTo(x+6,y+4);c.stroke();c.restore();
  };
  const wrap=(c,raw,maxWidth,maxLines=2)=>{
    const words=raw.split(/\s+/).filter(Boolean),lines=[];let cur='';
    for(const word of words){
      const next=cur?cur+' '+word:word;
      if(c.measureText(next).width>maxWidth && cur){lines.push(cur);cur=word;}
      else cur=next;
    }
    if(cur)lines.push(cur);
    // Do not silently truncate any person's name.
    if(lines.length>maxLines)throw new Error('The invitation contains too many names to fit.');
    return lines;
  };
  const photo=(c,image,sx,sy,sw,sh,dx,dy,dw,dh,angle)=>{
    c.save();c.translate(dx+dw/2,dy+dh/2);c.rotate(angle);
    const frame=c.createLinearGradient(-dw/2,-dh/2,dw/2,dh/2);
    frame.addColorStop(0,'#ffedac');frame.addColorStop(.25,'#c37c15');
    frame.addColorStop(.5,'#fff2c1');frame.addColorStop(.7,'#d58d25');frame.addColorStop(1,'#ffec9b');
    roundRect(c,-dw/2-11,-dh/2-11,dw+22,dh+22,2,frame,'#efb553',3);
    c.drawImage(image,sx,sy,sw,sh,-dw/2,-dh/2,dw,dh);
    roundRect(c,-dw/2,-dh/2,dw,dh,0,null,'#f5d27d',6);
    c.restore();
  };
  const imgLoad=src=>new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Wedding artwork could not be loaded.'));
    img.src=src;
  });
  async function createImage(names){
    if(!Array.isArray(names)||!names.length||names.length>20||names.some(n=>typeof n!=='string'||!n.trim())){
      throw new Error('No attending guests are available for the confirmation.');
    }
    const cover=await imgLoad('./slide1.webp');
    const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
    const c=canvas.getContext('2d',{alpha:false});
    if(!c)throw new Error('Image rendering is not supported on this device.');
    const bg=c.createRadialGradient(560,550,180,560,700,850);
    bg.addColorStop(0,'#86001d');bg.addColorStop(.65,'#65000e');bg.addColorStop(1,'#360006');
    c.fillStyle=bg;c.fillRect(0,0,WIDTH,HEIGHT);
    const gold=c.createLinearGradient(0,0,WIDTH,HEIGHT);
    gold.addColorStop(0,'#fbdb84');gold.addColorStop(.25,'#b36d16');gold.addColorStop(.5,'#fff5ac');
    gold.addColorStop(.75,'#c78b1c');gold.addColorStop(1,'#fee79c');
    roundRect(c,19,18,WIDTH-38,HEIGHT-36,0,null,gold,8);
    roundRect(c,31,30,WIDTH-62,HEIGHT-60,0,null,'#e8b750',2.5);
    corner(c,31,30,1,1);corner(c,WIDTH-31,30,-1,1);
    corner(c,31,HEIGHT-30,1,-1);corner(c,WIDTH-31,HEIGHT-30,-1,-1);
    bow(c,131,79,1);bow(c,WIDTH-131,79,-1);
    const w=cover.naturalWidth,h=cover.naturalHeight;
    // Cropped childhood portraits from the same approved cover illustration.
    photo(c,cover,w*.04,h*.46,w*.40,h*.46,192,103,252,279,-.07);
    photo(c,cover,w*.55,h*.46,w*.41,h*.46,678,103,252,279,.07);
    flower(c,169,349,.75);flower(c,952,349,.75);
    centerText(c,'MATTIA & KIRSTEN',WIDTH/2,92,25,GOLD,false,true);
    centerText(c,'Your Wedding Confirmation',WIDTH/2,403,43,PALE,true);
    // Chair glyphs use the same chair paths as the RSVP reserved-seat badges.
    const visibleChairs=Math.min(3,names.length),step=44;
    const first=WIDTH/2-((visibleChairs-1)*step+29)/2;
    for(let i=0;i<visibleChairs;i++)chair(c,first+i*step,440,29);
    centerText(c,names.length+' '+(names.length===1?'seat reserved for you':'seats reserved for you'),
      WIDTH/2,510,fitText(c,names.length+' seats reserved for you',810,40,28),GOLD,false,true);
    const joined=names.map(x=>x.trim()).join('   •   ');
    const maximum=4, maxWidth=855;
    let nameLines=[],font=29;
    for(font=29;font>=17;font--){
      c.font='italic '+font+'px Georgia, serif';
      try{nameLines=wrap(c,joined,maxWidth,maximum);break;}catch(_){}
    }
    if(nameLines.length===0)throw Error('Unable to fit the guest names.');
    const gap=nameLines.length>2?30:35;
    let y=563-(nameLines.length-1)*4;
    for(const name of nameLines){centerText(c,name,WIDTH/2,y,font,PALE,true);y+=gap;}
    flourish(c,WIDTH/2,687,.78);
    roundRect(c,302,714,518,78,20,gold,'#7b3e11',3);
    roundRect(c,314,724,494,58,17,'#f7dfa1','#eab351',2);
    centerText(c,'Wedding Details',WIDTH/2,754,50,'#5b0017',true,true);
    centerText(c,'Monday, 07 December 2026',WIDTH/2,820,38,PALE,true);
    line(c,565,863,565,1114,GOLD,2.5);
    centerText(c,'C E R E M O N Y',296,887,26,GOLD,false,true);
    centerText(c,'R E C E P T I O N',845,887,26,GOLD,false,true);
    clock(c,152,947);clock(c,696,947);
    centerText(c,'3:00 PM',328,947,31,PALE,true);
    centerText(c,'6:00 PM onwards',891,947,30,PALE,true);
    pin(c,152,1013);pin(c,696,1013);
    for(const [label,yy] of [
      ['San Jose New Municipal Hall',1017],
      ['Office of the Mayor',1056],
      ['San Jose, Batangas',1095]
    ]) centerText(c,label,343,yy,26,PALE,true);
    for(const [label,yy] of [
      ['Bahay Baluk-Baluk Restaurant',1017],
      ['Mataas na Kahoy, Lipa City',1056],
      ['Batangas',1095]
    ]) centerText(c,label,881,yy,26,PALE,true);
    flourish(c,WIDTH/2,1157,1.1);
    centerText(c,'D R E S S   C O D E',WIDTH/2,1202,31,GOLD,false,true);
    centerText(c,'Semi-Formal',WIDTH/2,1244,30,PALE,true);
    const shades=[['Burgundy','#6c0014'],['Wine','#8c1224'],['Maroon','#5b1d27'],['Plum','#874e70'],['Dusty Rose','#d98892']];
    const bw=72,gapShade=21,all=shades.length*bw+(shades.length-1)*gapShade;
    const start=(WIDTH-all)/2;
    for(let i=0;i<shades.length;i++){
      const x=start+i*(bw+gapShade);
      roundRect(c,x,1290,bw,51,13,shades[i][1],'#e9c675',3);
      centerText(c,shades[i][0],x+bw/2,1361,17,PALE,true);
    }
    const data=canvas.toDataURL('image/jpeg',.87);
    if(!data.startsWith('data:image/jpeg;base64,'))throw Error('Could not export the confirmation image.');
    return data;
  }
  window.WEDDING_CONFIRMATION_IMAGE={createImage};
})();