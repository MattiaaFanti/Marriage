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
  // Normalize displayed sponsor/family roles while the D1 migration is pending.
  const guestRoleLabel = role => {
    const original=String(role||'');
    const label=original.trim().toLowerCase();
    return label==='ninang'?'Nina':label==='ninong'?'Nino':label==='umpeng'?'Umpe':original;
  };
  document.querySelectorAll('[data-wedding-date]').forEach(n => n.textContent = 'MONDAY · 07 DECEMBER 2026');
  document.querySelectorAll('[data-wedding-address]').forEach(n => n.textContent = cfg.address || 'Mataas Na Kahoy, Lipa, Batangas, Philippines');
  document.querySelectorAll('[data-map-link]').forEach(n => n.href = cfg.mapUrl);
  // The opening HTML starts loading/playing this audio before deferred scripts run.
  // Reuse that same player so the song is never restarted or duplicated.
  const soundtrack = document.getElementById('wedding-soundtrack') || document.createElement('audio');
  soundtrack.id = 'wedding-soundtrack';
  const backupMusic = './ben-ben-araw-araw-official-music-video_DNkfYn6U.mp3';
  const selectedMusic = cfg.musicFile || backupMusic;
  if (!soundtrack.src || soundtrack.src !== new URL(selectedMusic, document.baseURI).href) {
    soundtrack.src = selectedMusic;
  }
  let musicFallbackUsed = false;
  soundtrack.addEventListener('error', () => {
    if (musicFallbackUsed) return;
    musicFallbackUsed = true;
    soundtrack.src = backupMusic;
    soundtrack.load();
    soundtrack.play().catch(() => {});
  });
  soundtrack.loop = true;
  soundtrack.autoplay = true;
  soundtrack.preload = 'auto';
  soundtrack.volume = 0.18;
  soundtrack.setAttribute('playsinline','');
  if (!soundtrack.isConnected) document.body.appendChild(soundtrack);
  // The early splash button is already present, and must not be duplicated.
  const musicPrompt = document.getElementById('wedding-audio-prompt') || document.createElement('button');
  if (!musicPrompt.isConnected) {
    musicPrompt.type = 'button';
    musicPrompt.className = 'wedding-audio-prompt';
    musicPrompt.textContent = 'Tap to start music';
    musicPrompt.hidden = true;
    document.body.appendChild(musicPrompt);
  }
  let playing = !soundtrack.paused && soundtrack.readyState >= 2;
  soundtrack.addEventListener('playing',()=>{playing=true;musicPrompt.hidden=true});
  soundtrack.addEventListener('pause',()=>{playing=false});
  function startMusic(){
    if (document.hidden || playing || !soundtrack.paused) return;
    try{
      const attempt=soundtrack.play();
      if(attempt && typeof attempt.then==='function'){
        attempt.then(()=>{playing=true}).catch(error=>{
          // A denied autoplay attempt is a browser decision; expose the actual
          // error instead of silently suppressing it during diagnostics.
          if(error?.name==='NotAllowedError'){
            // Audible autoplay cannot be forced on iOS/Android. Offer one tap.
            if (!document.hidden) musicPrompt.hidden = false;
            console.info('[Wedding audio] The browser requires a tap to begin audible playback.');
          }else if(error?.name!=='AbortError'){
            console.warn('[Wedding audio] Could not start playback:',error?.name,error?.message);
          }
        });
      }
    }catch(error){
      console.warn('[Wedding audio] Playback failed:',error?.name,error?.message);
    }
  }
  if (musicPrompt.dataset.bootstrapClick !== '1') musicPrompt.addEventListener('click', startMusic);
  startMusic();
  document.addEventListener('DOMContentLoaded', startMusic, {once:true});
  window.addEventListener('load', startMusic, {once:true});
  // On touchscreens user activation may occur at pointerup/touchend/click,
  // rather than the pointerdown/touchstart used by the original fallback.
  for(const eventName of ['pointerdown','pointerup','touchstart','touchend','click','keydown']){
    document.addEventListener(eventName,startMusic,{capture:true,passive:true});
  }

  // Stop when the visitor genuinely leaves the site or switches to another tab.
  // Do not stop on blur: mobile browsers can emit it while the page is visible.
  function stopMusic(){
    try{soundtrack.pause()}catch(_error){}
    playing=false;
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stopMusic();
    else startMusic();
  });
  window.addEventListener('pagehide',stopMusic);
  window.addEventListener('pageshow',()=>{if(!document.hidden)startMusic()});

  // All guest data is queried from D1; no private guest list is embedded in GitHub Pages.
  const modal=document.createElement('div');
  modal.className='rsvp-curtain';
  modal.hidden=true;
  modal.innerHTML='<section class="rsvp-dialog" role="dialog" aria-modal="true" aria-labelledby="rsvpHeading"><button class="rsvp-x" type="button" aria-label="Close">×</button><div class="rsvp-content"></div></section>';
  document.body.appendChild(modal);
  const content=modal.querySelector('.rsvp-content');
  const state={step:'find',name:'',selectedId:null,token:'',members:[],answers:{},error:'',busy:false,confirmationEmail:'',emailChoice:'',sendingPhase:''};
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
  function attendingMembers(){return state.members.filter(m=>state.answers[m.id]==='attending');}
  function validEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'').trim())&&String(s).trim().length<=254;}
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
          return '<div class="rsvp-member"><div class="rsvp-member-name">'+enc(m.name)+(m.role?'<small>'+enc(guestRoleLabel(m.role))+'</small>':'')+'</div>'+
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
        primary('OK','close');
    }
    if(state.step==='done'){
      html='<p class="rsvp-kicker">MATTIA & KIRSTEN</p><h2 id="rsvpHeading">Thank you!</h2>'+
        '<p>All responses for your invitation have been recorded.</p>';
      if(attendingMembers().length){
        html+='<form id="rsvpEmailForm" class="rsvp-email-form" novalidate>'+
          '<p class="rsvp-email-question">Would you like to receive your invitation confirmation by e-mail?</p>'+
          '<label for="rsvpConfirmEmail">E-mail address</label>'+
          '<input id="rsvpConfirmEmail" type="email" autocomplete="email" inputmode="email" maxlength="254" placeholder="Enter your e-mail address" value="'+enc(state.confirmationEmail)+'"'+(state.busy?' disabled':'')+'>'+
          error()+
          (state.busy?'<p class="rsvp-email-progress" role="status" aria-live="polite"><span class="rsvp-spinner" aria-hidden="true"></span>'+enc(state.sendingPhase||'Sending your confirmation…')+'</p>':'')+
          '<div class="rsvp-done-actions">'+
          '<button type="submit" class="rsvp-primary rsvp-email-action"'+(state.busy?' disabled':'')+'>'+(state.busy?'<span class="rsvp-spinner" aria-hidden="true"></span> Sending…':'Send email - See you soon!')+'</button>'+
          '<button type="button" class="rsvp-primary rsvp-email-action rsvp-email-skip" data-act="skipEmail"'+(state.busy?' disabled':'')+'>Skip - I don&#39;t want a confirmation e-mail</button>'+
          '</div></form>';
      }else{
        html+=primary('OK','close');
      }
    }
    if(state.step==='emailSent'){
      html='<p class="rsvp-kicker">MATTIA & KIRSTEN</p>'+
        '<div class="rsvp-email-success" role="status" aria-live="polite">'+
          '<span class="rsvp-success-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="21" stroke="currentColor" stroke-width="2.6"/><path d="M13 24l8 8 15-17" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'+
          '<h2 id="rsvpHeading">Email sent successfully!</h2>'+
          '<p>Your wedding confirmation has been sent to<br><strong>'+enc(state.confirmationEmail)+'</strong>.</p>'+
          '<p class="rsvp-success-signoff">See you soon!</p>'+
        '</div>'+primary('OK','close');
    }
    if(state.step==='emailQueued'){
      html='<p class="rsvp-kicker">MATTIA & KIRSTEN</p>'+
        '<div class="rsvp-email-success" role="status" aria-live="polite">'+
          '<span class="rsvp-success-mark rsvp-queued-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="21" stroke="currentColor" stroke-width="2.6"/><path d="M24 12v13l9 5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'+
          '<h2 id="rsvpHeading">Your email is on its way!</h2>'+
          '<p>We are processing your wedding confirmation for<br><strong>'+enc(state.confirmationEmail)+'</strong>.</p>'+
          '<p class="rsvp-success-signoff">See you soon!</p>'+
        '</div>'+primary('OK','close');
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
    const emailInput=content.querySelector('#rsvpConfirmEmail');
    emailInput?.addEventListener('input',()=>{state.confirmationEmail=emailInput.value;});
    content.querySelector('#rsvpEmailForm')?.addEventListener('submit',event=>{
      event.preventDefault();void action('sendEmail');
    });
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
              const role=document.createElement('small');role.textContent=guestRoleLabel(person.role);btn.append(role);
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
    if(kind==='close'){
      if(state.busy)return;
      if(state.step==='done'&&attendingMembers().length&&state.emailChoice!=='EMAIL'){
        await action('skipEmail');
      }else close();
      return;
    }
    if(kind==='skipEmail'&&!state.busy){
      if(!attendingMembers().length){close();return;}
      if(!api||!state.token){state.error='Confirmation service unavailable.';render();return;}
      const generation=lookupGeneration;
      state.busy=true;state.error='';render();
      try{
        const response=await fetch(api+'/api/household/skip-confirmation-email',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({household_token:state.token}),cache:'no-store'
        });
        const data=await response.json().catch(()=>({}));
        if(generation!==lookupGeneration)return;
        if(!response.ok)throw Error(data.error||'Could not save your e-mail preference.');
        state.emailChoice='NO';state.busy=false;close();return;
      }catch(err){
        if(generation!==lookupGeneration)return;
        state.error=err.message||'Could not save your e-mail preference.';
      }finally{
        if(generation===lookupGeneration){state.busy=false;if(!modal.hidden)render();}
      }
      return;
    }
    if(kind==='sendEmail'&&!state.busy){
      if(!attendingMembers().length){state.error='No attending guests were selected.';render();return;}
      const email=String(content.querySelector('#rsvpConfirmEmail')?.value||state.confirmationEmail||'').trim();
      state.confirmationEmail=email;
      if(!validEmail(email)){
        state.error='Please enter a valid e-mail address.';render();return;
      }
      if(!api||!state.token||!window.WEDDING_CONFIRMATION_IMAGE){
        state.error='The confirmation e-mail service is not available.';render();return;
      }
      const generation=lookupGeneration;
      const names=attendingMembers().map(m=>m.name);
      // Initiate image generation and the Cloudflare request immediately.
      // They are independent of the popup's two-second display timer.
      state.busy=true;state.error='';
      state.sendingPhase='Preparing your confirmation email…';render();
      let submitted=null,submitError=null;
      const submission=(async()=>{
        const image=await window.WEDDING_CONFIRMATION_IMAGE.createImage(names);
        const response=await fetch(api+'/api/household/send-confirmation-email',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            household_token:state.token,email,
            image_data_url:image,attending_names:names
          }),cache:'no-store'
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok||!data.ok)
          throw Error(data.error||'The confirmation could not be submitted.');
        return data;
      })();
      // Attach rejection handlers immediately to avoid unhandled errors.
      submission.then(data=>{
        submitted=data;
        if(generation!==lookupGeneration||modal.hidden)return;
        if(state.step==='emailQueued'&&data.sent){
          state.step='emailSent';state.emailChoice='EMAIL';render();
        }
      },err=>{
        submitError=err;
        console.error('Wedding e-mail submission failed:',err);
        if(generation!==lookupGeneration||modal.hidden)return;
        if(state.step==='emailQueued'){
          state.step='done';state.error=err.message||'Email could not be submitted.';render();
        }
      });
      // The acknowledgement screen appears after TWO seconds, even if the
      // image upload is still underway. This never cancels the submission.
      await new Promise(resolve=>setTimeout(resolve,2000));
      if(generation!==lookupGeneration)return;
      state.busy=false;state.sendingPhase='';
      if(submitError){
        state.step='done';
        state.error=submitError.message||'Email could not be submitted.';
      }else if(submitted?.sent){
        state.emailChoice='EMAIL';state.step='emailSent';
      }else{
        state.step='emailQueued';
      }
      render();
      return;
    }
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
        // No dress code screen if nobody in the group will attend.
        const hasAttendees=state.members.some(m=>state.answers[m.id]==='attending');
        state.step=hasAttendees?'dress':'regret';state.error='';
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
    state.answers={};state.error='';state.busy=false;state.confirmationEmail='';state.emailChoice='';state.sendingPhase='';
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
  modal.querySelector('.rsvp-x').addEventListener('click',()=>void action('close'));
  modal.addEventListener('click',e=>{if(e.target===modal)void action('close')});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)void action('close')});
})();
