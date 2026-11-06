/* Single Burgundy wedding invitation and RSVP client. */
(() => {
  'use strict';
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const top = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  top();
  window.addEventListener('pageshow', top);
  window.addEventListener('load', top, {once:true});
  const cfg = window.WEDDING_CONFIG || {};
  const api = (cfg.apiBase || '').replace(/\/+$/,'');
  const demo = !api;
  document.querySelectorAll('[data-wedding-date]').forEach(n => n.textContent = 'MONDAY · 07 DECEMBER 2026');
  document.querySelectorAll('[data-wedding-address]').forEach(n => n.textContent = cfg.address || 'Mataas Na Kahoy, Lipa, Batangas, Philippines');
  document.querySelectorAll('[data-map-link]').forEach(n => n.href = cfg.mapUrl);
  /* Non-media-element soundtrack to avoid native "Now Playing" UI.
     Browser policy may delay audible autoplay until the first user gesture.
     The engine fetches/decodes independently and unlocks iOS on interaction.
     Never continues into the background. */
  const AudioContextType=window.AudioContext||window.webkitAudioContext;
  const soundtrackUrl=cfg.musicFile||'./ben-ben-araw-araw-official-music-video_DNkfYn6U.mp3';
  let soundContext=null;
  let soundBuffer=null;
  let soundFetch=null;
  let soundSource=null;
  let soundGain=null;
  let soundUnlocked=false;
  let soundInvalidation=0;
  let soundWasPlaying=false;
  const visible=()=>document.visibilityState==='visible'&&!document.hidden;

  function contextForMusic(){
    if(!AudioContextType)return null;
    if(!soundContext||soundContext.state==='closed'){
      soundContext=new AudioContextType();
      soundContext.addEventListener?.('statechange',()=>{
        if(soundContext?.state==='running'&&visible())startDecodedSound();
      });
    }
    return soundContext;
  }

  async function fetchAndDecodeSound(){
    if(soundBuffer)return soundBuffer;
    if(soundFetch)return soundFetch;
    soundFetch=(async()=>{
      const response=await fetch(soundtrackUrl,{cache:'no-cache'});
      if(!response.ok)throw new Error('MP3 unavailable: HTTP '+response.status);
      const bytes=await response.arrayBuffer();
      if(!bytes.byteLength)throw new Error('MP3 is empty');
      const context=contextForMusic();
      if(!context)throw new Error('Web Audio unavailable');
      soundBuffer=await context.decodeAudioData(bytes);
      return soundBuffer;
    })().catch(error=>{
      console.warn('Wedding soundtrack could not be decoded:',error?.message);
      return null;
    }).finally(()=>{if(!soundBuffer)soundFetch=null;});
    return soundFetch;
  }

  function startDecodedSound(){
    if(!visible()||!soundBuffer||soundSource||soundContext?.state!=='running')return;
    try{
      const node=soundContext.createBufferSource();
      const gain=soundContext.createGain();
      node.buffer=soundBuffer;
      node.loop=true;
      gain.gain.value=0.25;
      node.connect(gain);
      gain.connect(soundContext.destination);
      node.start(0);
      soundSource=node;
      soundGain=gain;
      soundUnlocked=true;
      soundWasPlaying=true;
    }catch(error){
      console.warn('Wedding soundtrack playback failed:',error?.message);
    }
  }
  function unlockSound(event){
    if(!visible())return;
    const ctx=contextForMusic();
    if(!ctx)return;
    // Safari/iOS unlock: schedule a silent one-shot *inside* the real gesture,
    // without waiting for MP3 network or decoding promises.
    if(event?.isTrusted&&ctx.state!=='running'){
      try{
        const primer=ctx.createBuffer(1,1,ctx.sampleRate);
        const oneShot=ctx.createBufferSource();
        oneShot.buffer=primer;
        oneShot.connect(ctx.destination);
        oneShot.start(0);
        oneShot.onended=()=>{try{oneShot.disconnect()}catch(_){}};
      }catch(_error){}
    }
    if(ctx.state!=='running'){
      try{
        const pending=ctx.resume();
        pending?.then(()=>{if(visible())startDecodedSound()}).catch(()=>{});
      }catch(_error){}
    }
    const generation=soundInvalidation;
    fetchAndDecodeSound().then(()=>{
      if(generation===soundInvalidation&&visible())startDecodedSound();
    });
    startDecodedSound();
  }
  function stopSound(){
    soundInvalidation++;
    if(soundSource){
      try{soundSource.stop(0);soundSource.disconnect()}catch(_error){}
      soundSource=null;
    }
    if(soundGain){
      try{soundGain.disconnect()}catch(_error){}
      soundGain=null;
    }
    if(soundContext?.state==='running')
      soundContext.suspend().catch(()=>{});
  }
  // Attempt immediate playback wherever the browser allows it.
  fetchAndDecodeSound().then(()=>{if(visible())unlockSound()});
  unlockSound();
  document.addEventListener('DOMContentLoaded',()=>unlockSound(),{once:true});
  window.addEventListener('load',()=>unlockSound(),{once:true});
  for(const type of ['pointerdown','touchend','click','keydown']){
    document.addEventListener(type,unlockSound,{capture:true,passive:true});
  }
  document.addEventListener('visibilitychange',()=>{
    if(!visible())stopSound();
    else if(soundUnlocked||soundWasPlaying)unlockSound();
  });
  window.addEventListener('pagehide',()=>{
    stopSound();
    if(soundContext&&soundContext.state!=='closed')
      soundContext.close().catch(()=>{});
  });
  window.addEventListener('pageshow',()=>{
    if(visible()&&(soundUnlocked||soundWasPlaying))unlockSound();
  });
  document.addEventListener('freeze',stopSound);

  // All guest data is queried from D1; no private guest list is embedded in GitHub Pages.
  const modal=document.createElement('div');
  modal.className='rsvp-curtain';
  modal.hidden=true;
  modal.innerHTML='<section class="rsvp-dialog" role="dialog" aria-modal="true" aria-labelledby="rsvpHeading"><button class="rsvp-x" type="button" aria-label="Close">×</button><div class="rsvp-content"></div></section>';
  document.body.appendChild(modal);
  const content=modal.querySelector('.rsvp-content');
  const state={step:'find',name:'',selectedId:null,token:'',members:[],answers:{},error:'',busy:false};
  const enc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nameKey=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
  const validName=s=>s.length>=3&&s.length<=100&&/^[a-z]+(?:[ '-][a-z]+)*$/.test(s);
  const primary=(label,act,disabled=false)=>'<button type="button" class="rsvp-primary" data-act="'+act+'"'+(disabled?' disabled aria-disabled="true"':'')+'>'+label+'</button>';
  const error=()=>state.error?'<p class="rsvp-error" role="alert">'+enc(state.error)+'</p>':'';
  const palette=[
    ['Red','#a00008'],['Crimson','#a12a30'],['Cherry','#b4494a'],
    ['Burgundy','#850024'],['Wine','#5d2030'],['Maroon','#451526']
  ];
  const paletteMarkup=()=>'<div class="rsvp-burgundy-palette" role="list" aria-label="Red to burgundy dress code colors">'+
    palette.map(([label,color])=>'<div class="rsvp-shade" role="listitem"><span class="rsvp-shade-color" style="background:'+color+'"></span><span>'+label+'</span></div>').join('')+
    '</div>';

  function countAnswers(){return state.members.filter(m=>['attending','not_attending'].includes(state.answers[m.id])).length;}
  function render(){
    let html='';
    if(state.step==='find'){
      html='<p class="rsvp-kicker">MATTIA & KIRSTEN · 07.12.2026</p><h2 id="rsvpHeading">Find your invitation</h2>'+
        '<p>Type at least 3 letters of your first name or surname. Select the suggestion if one appears, or press Search.</p>'+
        '<form id="rsvpLookup"><label for="rsvpName">Name or surname</label>'+
        '<input id="rsvpName" type="text" minlength="3" maxlength="100" autocomplete="off" required placeholder="Your name or surname" value="'+enc(state.name)+'">'+
        '<div id="modalNameSuggestions" class="rsvp-modal-suggestions" aria-live="polite"></div>'+
        error()+(!api?'<p class="rsvp-demo">The RSVP database is not connected.</p>':'')+
        primary(state.busy?'Searching…':'Search invitation','lookup',state.busy)+'</form>';
    }
    if(state.step==='choose'){
      html='<p class="rsvp-kicker">YOUR INVITATION</p><h2 id="rsvpHeading">Who will attend?</h2>'+
        '<p>Select Attend or Not attend for <strong>every person</strong> on your invitation.</p>'+
        '<div class="rsvp-group-members">'+state.members.map(m=>{
          const selected=state.answers[m.id]||'';
          return '<div class="rsvp-member"><div class="rsvp-member-name">'+enc(m.name)+(m.role?'<small>'+enc(m.role)+'</small>':'')+'</div>'+
            '<div class="rsvp-member-options"><button type="button" data-member="'+Number(m.id)+'" data-status="attending" aria-pressed="'+(selected==='attending')+'" class="rsvp-choice rsvp-yes'+(selected==='attending'?' selected':'')+'">Attend</button>'+
            '<button type="button" data-member="'+Number(m.id)+'" data-status="not_attending" aria-pressed="'+(selected==='not_attending')+'" class="rsvp-choice rsvp-no'+(selected==='not_attending'?' selected':'')+'">Not attend</button></div></div>';
        }).join('')+'</div>'+
        '<p class="rsvp-progress">'+countAnswers()+' of '+state.members.length+' responses selected</p>'+error()+
        primary('Continue','review',countAnswers()!==state.members.length);
    }
    if(state.step==='review'){
      html='<p class="rsvp-kicker">PLEASE REVIEW</p><h2 id="rsvpHeading">Confirm your answers</h2>'+
        '<div class="rsvp-review">'+state.members.map(m=>'<div><span>'+enc(m.name)+'</span><strong class="'+(state.answers[m.id]==='attending'?'attend-text':'decline-text')+'">'+(state.answers[m.id]==='attending'?'Attend':'Not attend')+'</strong></div>').join('')+'</div>'+
        error()+primary(state.busy?'Saving…':'Save responses','submit',state.busy)+primary('Edit responses','edit',state.busy);
    }
    if(state.step==='dress'){
      html='<p class="rsvp-kicker">A LITTLE NOTE FROM US</p><h2 id="rsvpHeading">Celebrate in Burgundy</h2>'+
        '<p>We would be delighted to see you dressed in your finest semi-formal attire, complemented by our suggested color palette.</p>'+
        '<p class="rsvp-palette-heading">SHADES OF RED TO BURGUNDY</p>'+paletteMarkup()+
        '<p><strong>Keep it simple & elegant.</strong> Plain solid colors are preferred; no bold patterns.</p>'+
        primary('Consider it noted','done');
    }
    if(state.step==='regret'){
      html='<p class="rsvp-kicker">MATTIA & KIRSTEN</p><h2 id="rsvpHeading">We’ll miss you</h2>'+
        '<p class="rsvp-regret-copy">Though distance may keep us apart, you will always have a special place in our hearts.</p>'+
        '<p class="rsvp-regret-copy">We warmly invite you to join us virtually and be part of our special day as we exchange our vows and begin this beautiful journey together.</p>'+
        '<p class="rsvp-regret-signature">WITH LOVE,<strong>Mattia & Kirsten</strong></p>'+
        primary('Continue','done');
    }
    if(state.step==='done'){
      html='<p class="rsvp-kicker">MATTIA & KIRSTEN</p><h2 id="rsvpHeading">Thank you!</h2>'+
        '<p>All responses for your invitation have been recorded.</p>'+
        primary('Back to the invitation','close');
    }
    content.innerHTML=html;
    content.querySelectorAll('[data-act]').forEach(btn=>btn.addEventListener('click',()=>action(btn.dataset.act)));
    content.querySelectorAll('[data-member]').forEach(btn=>btn.addEventListener('click',()=>{
      state.answers[Number(btn.dataset.member)]=btn.dataset.status;
      state.error='';render();
    }));
    content.querySelector('#rsvpLookup')?.addEventListener('submit',e=>{e.preventDefault();action('lookup')});
    const input=content.querySelector('#rsvpName');
    if(input)bindSuggestions(input,content.querySelector('#modalNameSuggestions'),(name,id)=>{
      state.name=name;state.selectedId=id;input.value=name;action('lookup');
    });
  }

  /* Autocomplete returns zero or one person. If multiple matches exist, the
     server never discloses their names; users must supply more letters. */
  let suggestionSerial=0;
  const suggestionTimers=new WeakMap();
  function bindSuggestions(input,target,onSelect){
    if(!input||!target)return;
    target.classList.add('rsvp-suggestions');
    const inputChanged=()=>{
      const serial=++suggestionSerial;
      const term=nameKey(input.value);
      if(input.id==='rsvpName'){state.name=input.value;state.selectedId=null;}
      const oldTimer=suggestionTimers.get(input);
      if(oldTimer)clearTimeout(oldTimer);
      target.replaceChildren();
      target.hidden=true;
      if(!api||!validName(term))return;
      const timer=setTimeout(async()=>{
        try{
          const res=await fetch(api+'/api/household/suggest',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({query:term}),cache:'no-store'
          });
          const data=await res.json().catch(()=>({}));
          if(serial!==suggestionSerial||input.value.trim()!==term&&nameKey(input.value)!==term||!target.isConnected)return;
          if(!res.ok){
            if(res.status===429)showSuggestionNote(target,'Too many searches. Please try again later.');
            return;
          }
          const options=Array.isArray(data.suggestions)?data.suggestions:[];
          if(options.length===1){
            const person=options[0];
            if(!Number.isSafeInteger(person.id)||!person.name)return;
            const btn=document.createElement('button');
            btn.type='button';btn.className='rsvp-suggestion-item';
            const title=document.createElement('strong');title.textContent=person.name;btn.append(title);
            if(person.role){
              const role=document.createElement('small');role.textContent=person.role;btn.append(role);
            }
            btn.addEventListener('click',()=>{
              target.hidden=true;
              target.replaceChildren();
              input.value=person.name;
              onSelect(person.name,person.id);
            });
            target.replaceChildren(btn);target.hidden=false;
          }else if(data.needs_more_letters){
            showSuggestionNote(target,'More than one match. Type more letters to narrow your search.');
          }
        }catch(_error){ /* No names shown on temporary network failures. */ }
      },300);
      suggestionTimers.set(input,timer);
    };
    input.addEventListener('input',inputChanged);
    input.addEventListener('focus',()=>{
      if(validName(nameKey(input.value)))inputChanged();
    });
  }
  function showSuggestionNote(target,note){
    const p=document.createElement('p');p.className='rsvp-suggestion-note';p.textContent=note;
    target.replaceChildren(p);target.hidden=false;
  }
  async function action(kind){
    if(kind==='close'){close();return;}
    if(kind==='done'){state.step='done';render();return;}
    if(kind==='edit'){state.step='choose';render();return;}
    if(kind==='review'){
      if(countAnswers()!==state.members.length){state.error='Select a response for every person before continuing.';render();return;}
      state.step='review';state.error='';render();return;
    }
    if(kind==='lookup'&&!state.busy){
      const name=content.querySelector('#rsvpName')?.value.trim()||state.name.trim();
      state.name=name;
      const key=nameKey(name);
      if(!validName(key)){state.error='Enter at least 3 letters of your name or surname.';render();return;}
      if(!api){state.error='The RSVP database is not connected yet.';render();return;}
      state.busy=true;state.error='';render();
      try{
        const request={name};
        if(state.selectedId&&Number.isSafeInteger(state.selectedId))request.member_id=state.selectedId;
        const resp=await fetch(api+'/api/household/lookup',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify(request),cache:'no-store'
        });
        const data=await resp.json().catch(()=>({}));
        if(!resp.ok)throw Error(data.error||'Unable to find the invitation.');
        if(!Array.isArray(data.members)||!data.members.length||!data.household_token)throw Error('Invalid invitation data.');
        state.members=data.members;state.token=data.household_token;
        state.answers={};for(const m of data.members)state.answers[m.id]=m.status==='pending'?'':m.status;
        state.step='choose';state.error='';
      }catch(e){state.error=e.message||'Search failed.';}
      finally{state.busy=false;render();}
      return;
    }
    if(kind==='submit'&&!state.busy){
      if(countAnswers()!==state.members.length){state.step='choose';state.error='Answer for every person.';render();return;}
      state.busy=true;state.error='';render();
      try{
        const resp=await fetch(api+'/api/household/confirm',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            household_token:state.token,
            answers:state.members.map(m=>({id:Number(m.id),status:state.answers[m.id]}))
          }),cache:'no-store'
        });
        const data=await resp.json().catch(()=>({}));
        if(!resp.ok)throw Error(data.error||'Could not save your responses.');
        const singleDecline=state.members.length===1&&state.answers[state.members[0].id]==='not_attending';
        state.step=singleDecline?'regret':'dress';state.error='';
      }catch(e){state.error=e.message||'Could not save. Please retry.';}
      finally{state.busy=false;render();}
    }
  }
  function open(name='',id=null){
    state.step='find';state.name=name;state.selectedId=id;state.token='';state.members=[];state.answers={};state.error='';state.busy=false;
    modal.hidden=false;document.body.classList.add('rsvp-open');render();
    if(name)action('lookup');
  }
  function close(){modal.hidden=true;document.body.classList.remove('rsvp-open');suggestionSerial++;}
  document.querySelectorAll('[data-open-rsvp]').forEach(button=>button.addEventListener('click',()=>open()));
  document.querySelectorAll('[data-rsvp-search]').forEach(form=>{
    const input=form.querySelector('input');
    const target=document.createElement('div');
    target.className='rsvp-cover-suggestions';
    target.hidden=true;
    form.parentNode?.appendChild(target);
    bindSuggestions(input,target,(name,id)=>open(name,id));
    form.addEventListener('submit',e=>{e.preventDefault();open(input?.value.trim()||'');});
  });
  modal.querySelector('.rsvp-x').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
})();
