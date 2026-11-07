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
  /* One-gesture Web Audio playback, without an HTML media player.
     The AudioContext is resumed synchronously on the first user gesture.
     The MP3 can finish loading afterwards; no second interaction is needed. */
  const AudioContextType=window.AudioContext||window.webkitAudioContext;
  const fallbackMusic='./ben-ben-araw-araw-official-music-video_DNkfYn6U.mp3';
  const musicFiles=[...new Set([cfg.musicFile,fallbackMusic].filter(Boolean))];
  const audioVisible=()=>!document.hidden&&document.visibilityState!=='hidden';
  let musicContext=null,decodedMusic=null,decodeTask=null,musicSource=null,musicGain=null;
  let musicWanted=false;

  function playDecodedMusic(){
    if(!audioVisible()||!musicWanted||musicSource||!decodedMusic||
       !musicContext||musicContext.state!=='running')return;
    try{
      const source=musicContext.createBufferSource();
      const gain=musicContext.createGain();
      source.buffer=decodedMusic;
      source.loop=true;
      gain.gain.value=0.18;
      source.connect(gain);
      gain.connect(musicContext.destination);
      musicSource=source;
      musicGain=gain;
      source.start(0);
    }catch(error){
      console.warn('[Wedding audio] Start error:',error?.message);
      musicSource=null;
      if(musicGain){try{musicGain.disconnect()}catch(_){} musicGain=null;}
    }
  }

  function getMusicContext(){
    if(!AudioContextType)return null;
    if(!musicContext||musicContext.state==='closed'){
      musicContext=new AudioContextType();
      musicContext.addEventListener('statechange',playDecodedMusic);
    }
    return musicContext;
  }

  function loadMusic(){
    if(decodedMusic)return Promise.resolve(decodedMusic);
    if(decodeTask)return decodeTask;
    const ctx=getMusicContext();
    if(!ctx)return Promise.resolve(null);
    decodeTask=(async()=>{
      for(const file of musicFiles){
        try{
          const response=await fetch(file,{cache:'force-cache'});
          if(!response.ok)continue;
          const bytes=await response.arrayBuffer();
          if(!bytes.byteLength)continue;
          const buffer=await ctx.decodeAudioData(bytes);
          if(buffer){
            decodedMusic=buffer;
            playDecodedMusic();
            return buffer;
          }
        }catch(error){
          console.warn('[Wedding audio] Music file error:',error?.message);
        }
      }
      return null;
    })().finally(()=>{decodeTask=null});
    return decodeTask;
  }

  function startMusic(){
    if(!audioVisible()||!AudioContextType)return;
    musicWanted=true;
    try{
      const ctx=getMusicContext();
      // Crucial: resume() is called directly inside the gesture callback.
      if(ctx.state!=='running'){
        ctx.resume().then(playDecodedMusic).catch(error=>{
          if(error?.name!=='NotAllowedError')
            console.warn('[Wedding audio] Resume error:',error?.message);
        });
      }
      void loadMusic();
      playDecodedMusic();
    }catch(error){
      console.warn('[Wedding audio] Initialization error:',error?.message);
    }
  }

  function stopMusic(){
    musicWanted=false;
    if(musicSource){
      try{musicSource.stop(0)}catch(_){}
      try{musicSource.disconnect()}catch(_){}
      musicSource=null;
    }
    if(musicGain){
      try{musicGain.disconnect()}catch(_){}
      musicGain=null;
    }
    if(musicContext&&musicContext.state==='running')
      musicContext.suspend().catch(()=>{});
  }

  // Autoplay is attempted where allowed; otherwise the first gesture starts it.
  startMusic();
  document.addEventListener('DOMContentLoaded',startMusic,{once:true});
  window.addEventListener('load',startMusic,{once:true});
  for(const eventName of ['pointerdown','touchstart','click','keydown']){
    document.addEventListener(eventName,startMusic,{capture:true,passive:true});
  }
  document.addEventListener('visibilitychange',()=>{
    if(audioVisible())startMusic();else stopMusic();
  });
  window.addEventListener('pagehide',stopMusic);
  window.addEventListener('pageshow',()=>{if(audioVisible())startMusic()});
  document.addEventListener('freeze',stopMusic);

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

  // Identical seat icon used in both name suggestions and the RSVP group header.
  const seatIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/><path d="M5 12a2 2 0 0 0-2 2v5h18v-5a2 2 0 0 0-2-2"/><path d="M5 19v2M19 19v2"/></svg>';
  function reservedSeatBadge(value){
    const n=Number(value);
    if(!Number.isSafeInteger(n)||n<1)return '';
    const label=n+' '+(n===1?'seat reserved':'seats reserved');
    return '<span class="rsvp-seat-badge" aria-label="'+label+'">'+
      '<span class="rsvp-seat-icons" aria-hidden="true">'+seatIcon.repeat(Math.min(3,n))+'</span>'+
      '<span class="rsvp-seat-label">'+label+'</span></span>';
  }

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
    if(state.step==='lookupError'){
      html='<p class="rsvp-kicker">YOUR INVITATION</p>'+
        '<h2 id="rsvpHeading">Invitation unavailable</h2>'+
        error()+primary('Search again','retrySearch');
    }
    if(state.step==='choose'){
      html='<p class="rsvp-kicker">YOUR INVITATION</p><h2 id="rsvpHeading" class="rsvp-reserved-heading">'+reservedSeatBadge(state.members.length)+'</h2>'+
        '<p>Select Attending or Not Attending for <strong>every person</strong> on your invitation.</p>'+
        '<div class="rsvp-group-members">'+state.members.map(m=>{
          const selected=state.answers[m.id]||'';
          return '<div class="rsvp-member"><div class="rsvp-member-name">'+enc(m.name)+(m.role?'<small>'+enc(m.role)+'</small>':'')+'</div>'+
            '<div class="rsvp-member-options"><button type="button" data-member="'+Number(m.id)+'" data-status="attending" aria-pressed="'+(selected==='attending')+'" class="rsvp-choice rsvp-yes'+(selected==='attending'?' selected':'')+'"><span class="rsvp-choice-label">Attending</span><span class="rsvp-choice-note">See you there!</span></button>'+
            '<button type="button" data-member="'+Number(m.id)+'" data-status="not_attending" aria-pressed="'+(selected==='not_attending')+'" class="rsvp-choice rsvp-no'+(selected==='not_attending'?' selected':'')+'"><span class="rsvp-choice-label">Not Attending</span><span class="rsvp-choice-note">I\'ll be there in spirit</span></button></div></div>';
        }).join('')+'</div>'+
        '<p class="rsvp-progress">'+countAnswers()+' of '+state.members.length+' responses selected</p>'+error()+
        primary('Continue','review',countAnswers()!==state.members.length);
    }
    if(state.step==='review'){
      html='<p class="rsvp-kicker">PLEASE REVIEW</p><h2 id="rsvpHeading">Confirm your answers</h2>'+
        '<div class="rsvp-review">'+state.members.map(m=>'<div><span>'+enc(m.name)+'</span><strong class="'+(state.answers[m.id]==='attending'?'attend-text':'decline-text')+'">'+(state.answers[m.id]==='attending'?'Attending':'Not Attending')+'</strong></div>').join('')+'</div>'+
        error()+primary(state.busy?'Saving…':'Save responses','submit',state.busy)+primary('Edit responses','edit',state.busy);
    }
    if(state.step==='dress'){
      html='<p class="rsvp-kicker">A LITTLE NOTE FROM US</p><h2 id="rsvpHeading">Celebrate in <span class="rsvp-burgundy-word">Burgundy</span></h2>'+
        '<p>We would be delighted to see you dressed in your finest semi-formal attire, complemented by our suggested color palette.</p>'+
        '<p class="rsvp-palette-heading">SHADES OF RED TO BURGUNDY</p>'+paletteMarkup()+

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
    if(input)bindSuggestions(input,content.querySelector('#modalNameSuggestions'),(name,id)=>open(name,id));
  }

  /* From the third letter, show every matching person as a separate,
     clickable suggestion, including matches across different RSVP groups. */
  let suggestionSerial=0;
  const suggestionTimers=new WeakMap();

  /* Backward-compatible RSVP suggestions. Cloudflare's Worker build can lag
     behind the Github Pages frontend. The existing open admin dashboard
     already exposes this household list; use it only when the public
     suggestions API lacks the seat count or still hides ambiguous matches. */
  let householdDirectoryPromise=null;
  async function compatibleSuggestions(term){
    if(!householdDirectoryPromise){
      householdDirectoryPromise=fetch(api+'/api/admin/households',{cache:'no-store'})
        .then(response=>{
          if(!response.ok)throw new Error('RSVP household list unavailable');
          return response.json();
        })
        .then(data=>{
          if(!Array.isArray(data.groups))throw new Error('Invalid RSVP household data');
          return data.groups;
        })
        .catch(err=>{householdDirectoryPromise=null;throw err});
    }
    const households=await householdDirectoryPromise;
    const results=[];
    for(const group of households){
      const members=Array.isArray(group.members)?group.members:[];
      for(const member of members){
        const fullName=String(member.display_name||'');
        const normalized=nameKey(fullName);
        const matches=normalized.startsWith(term)||
          normalized.split(/\s+/).some(part=>part.startsWith(term));
        if(!matches||!Number.isSafeInteger(Number(member.id)))continue;
        results.push({
          id:Number(member.id),name:fullName,role:member.role||'',
          seat_count:members.length
        });
      }
    }
    return results.sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'}));
  }

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
          if(serial!==suggestionSerial||nameKey(input.value)!==term||!target.isConnected)return;
          if(!res.ok){
            if(res.status===429)showSuggestionNote(target,'Too many searches. Please try again later.');
            return;
          }
          let options=Array.isArray(data.suggestions)?data.suggestions:[];
          // Older Workers returned one suggestion at most, without seat_count.
          // Recover all guest matches from the already-public admin overview.
          const outdated=data.needs_more_letters===true||
            options.some(p=>!Number.isSafeInteger(Number(p.seat_count))||
                            Number(p.seat_count)<1)||options.length===0;
          if(outdated){
            try{
              const recovered=await compatibleSuggestions(term);
              // A selected old-API alias might not match the display name;
              // retain such matches and enrich their count where possible.
              const merged=new Map(recovered.map(p=>[p.id,p]));
              for(const p of options){
                const id=Number(p.id);
                if(!merged.has(id))merged.set(id,p);
              }
              options=[...merged.values()];
            }catch(error){
              console.warn('[RSVP] Guest compatibility data unavailable:',error.message);
            }
          }
          if(serial!==suggestionSerial||nameKey(input.value)!==term||!target.isConnected)return;
          const buttons=document.createDocumentFragment();
          for(const person of options){
            if(!Number.isSafeInteger(person.id)||!person.name)continue;
            const btn=document.createElement('button');
            btn.type='button';btn.className='rsvp-suggestion-item';
            const heading=document.createElement('span');heading.className='rsvp-suggestion-heading';
            const title=document.createElement('strong');title.textContent=person.name;heading.append(title);
            // Seat count comes from D1, not hard-coded in the public site.
            const seats=Number(person.seat_count);
            if(Number.isSafeInteger(seats)&&seats>0){
              heading.insertAdjacentHTML('beforeend',reservedSeatBadge(seats));
            }
            btn.append(heading);
            if(person.role){
              const role=document.createElement('small');role.textContent=person.role;btn.append(role);
            }
            btn.addEventListener('click',event=>{
              event.preventDefault();
              event.stopPropagation();
              target.hidden=true;
              target.replaceChildren();
              input.value=person.name;
              onSelect(person.name,person.id);
            });
            buttons.appendChild(btn);
          }
          target.replaceChildren(buttons);
          target.hidden=target.childElementCount===0;
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
  // Invalidates in-flight searches when another guest is selected or the dialog closes.
  let lookupGeneration=0;
  function revealRsvp(){
    modal.hidden=false;
    document.body.classList.add('rsvp-open');
  }
  async function action(kind,options={}){
    if(kind==='close'){close();return;}
    if(kind==='retrySearch'){open();return;}
    if(kind==='done'){state.step='done';render();return;}
    if(kind==='edit'){state.step='choose';render();return;}
    if(kind==='review'){
      if(countAnswers()!==state.members.length){state.error='Select a response for every person before continuing.';render();return;}
      state.step='review';state.error='';render();return;
    }
    if(kind==='lookup'&&!state.busy){
      const silent=options.silent===true;
      // For a suggestion click, use the selected name, not a stale input from
      // the previous modal rendering.
      const name=(silent?state.name:(content.querySelector('#rsvpName')?.value||state.name)).trim();
      state.name=name;
      const key=nameKey(name);
      if(!validName(key)){
        state.error='Enter at least 3 letters of your name or surname.';
        state.step=silent?'lookupError':'find';render();if(silent)revealRsvp();return;
      }
      if(!api){
        state.error='The RSVP database is not connected yet.';
        state.step=silent?'lookupError':'find';render();if(silent)revealRsvp();return;
      }
      const generation=lookupGeneration;
      state.busy=true;
      state.error='';
      if(!silent)render();
      try{
        const request={name};
        if(state.selectedId&&Number.isSafeInteger(state.selectedId))request.member_id=state.selectedId;
        const resp=await fetch(api+'/api/household/lookup',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify(request),cache:'no-store'
        });
        const data=await resp.json().catch(()=>({}));
        if(generation!==lookupGeneration)return;
        if(!resp.ok)throw Error(data.error||'Unable to find the invitation.');
        if(!Array.isArray(data.members)||!data.members.length||!data.household_token)
          throw Error('Invalid invitation data.');
        state.members=data.members;
        state.token=data.household_token;
        state.answers={};
        for(const m of data.members)state.answers[m.id]=m.status==='pending'?'':m.status;
        state.step='choose';
        state.error='';
      }catch(e){
        if(generation!==lookupGeneration)return;
        state.step=silent?'lookupError':'find';
        state.error=e.message||'Search failed.';
      }finally{
        if(generation===lookupGeneration){
          state.busy=false;
          render();
          // The modal becomes visible only once the seats-selection screen
          // (or an actual error) has been rendered, never while searching.
          if(silent)revealRsvp();
        }
      }
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
    lookupGeneration++;
    suggestionSerial++; // Invalidate any pending autocomplete.
    const preselected=Boolean(String(name).trim());
    // Hide synchronously, before any state change or async operation.
    modal.hidden=true;
    document.body.classList.remove('rsvp-open');
    state.step=preselected?'loading':'find';
    state.name=name;state.selectedId=id;state.token='';state.members=[];
    state.answers={};state.error='';state.busy=false;
    if(preselected){
      // Never render a search form during a selected-guest lookup.
      // Reveal only when group choices are ready (or on a real error).
      action('lookup',{silent:true});
    }else{
      render();
      revealRsvp();
    }
  }
  function close(){
    lookupGeneration++;
    state.busy=false;
    modal.hidden=true;
    document.body.classList.remove('rsvp-open');
    suggestionSerial++;
  }
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
