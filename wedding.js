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
  /* Web Audio rather than <audio>/<video>:
     no embedded notification player; OS audio indicators are browser-controlled.
     Decode the track independently of autoplay permission. Play on load when
     permitted, otherwise as soon as the visitor interacts with the page.
     Stop on hide, page close, freeze or background; never keep mobile audio running. */
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  const soundtrackUrl = cfg.musicFile || './ben-ben-araw-araw-official-music-video_DNkfYn6U.mp3';
  let musicContext = null;
  let musicBuffer = null;
  let musicLoading = null;
  let musicSource = null;
  let musicGain = null;
  let audioUnlocked = false;

  const musicVisible = () => !document.hidden && document.visibilityState === 'visible';
  const getMusicContext = () => {
    if(!AudioContextType) return null;
    if(!musicContext || musicContext.state === 'closed') musicContext = new AudioContextType();
    return musicContext;
  };

  async function preloadMusic(){
    if(musicBuffer) return musicBuffer;
    if(musicLoading) return musicLoading;
    musicLoading = (async () => {
      const ctx = getMusicContext();
      if(!ctx) return null;
      const response = await fetch(soundtrackUrl, {cache:'force-cache'});
      if(!response.ok) throw new Error('Soundtrack could not be loaded: '+response.status);
      const bytes = await response.arrayBuffer();
      if(!bytes.byteLength) throw new Error('The soundtrack file is empty');
      musicBuffer = await ctx.decodeAudioData(bytes);
      return musicBuffer;
    })().catch(() => null).finally(() => {
      // Allow a retry after interrupted/network-failed downloads.
      if(!musicBuffer) musicLoading = null;
    });
    return musicLoading;
  }

  function playDecodedMusic(){
    if(!musicVisible() || !musicBuffer || !musicContext ||
       musicContext.state !== 'running' || musicSource) return;
    const source = musicContext.createBufferSource();
    const gain = musicContext.createGain();
    source.buffer = musicBuffer;
    source.loop = true;
    gain.gain.value = 0.18;
    source.connect(gain);
    gain.connect(musicContext.destination);
    musicSource = source;
    musicGain = gain;
    try{source.start(0);audioUnlocked = true;}
    catch(_error){
      musicSource = null;
      musicGain = null;
      try{source.disconnect();gain.disconnect();}catch(_ignored){}
    }
  }

  function startMusic(){
    if(!musicVisible()) return;
    const ctx = getMusicContext();
    if(!ctx) return;
    // Resume is invoked immediately from the gesture, before any asynchronous
    // fetch/decode. This avoids the mobile autoplay deadlock of the old code.
    if(ctx.state !== 'running'){
      ctx.resume().then(() => {
        if(musicVisible()) playDecodedMusic();
      }).catch(() => {});
    }
    preloadMusic().then(() => {
      if(musicVisible()) playDecodedMusic();
    }).catch(() => {});
    playDecodedMusic();
  }

  function stopMusic(){
    if(musicSource){
      try{musicSource.stop(0)}catch(_error){}
      try{musicSource.disconnect()}catch(_error){}
      musicSource = null;
    }
    if(musicGain){
      try{musicGain.disconnect()}catch(_error){}
      musicGain = null;
    }
    if(musicContext && musicContext.state === 'running'){
      musicContext.suspend().catch(() => {});
    }
  }

  // Load the real MP3 while suspended; autoplay restrictions should not stop
  // the browser from fetching and decoding its bytes.
  preloadMusic().then(() => {
    if(musicVisible()) playDecodedMusic();
  }).catch(() => {});
  startMusic();
  document.addEventListener('DOMContentLoaded', startMusic, {once:true});
  window.addEventListener('load', startMusic, {once:true});
  for(const eventName of ['pointerdown','touchstart','touchend','click','keydown']){
    document.addEventListener(eventName,startMusic,{passive:true});
  }
  document.addEventListener('visibilitychange',() => {
    if(!musicVisible()) stopMusic();
    else if(audioUnlocked) startMusic();
  });
  window.addEventListener('pagehide',() => {
    stopMusic();
    if(musicContext && musicContext.state !== 'closed'){
      musicContext.close().catch(() => {});
    }
  });
  window.addEventListener('pageshow',() => {
    if(audioUnlocked && musicVisible()) startMusic();
  });
  document.addEventListener('freeze',stopMusic);

  // Guest names are never stored in public JavaScript. All lookup data lives in D1.
  const modal=document.createElement('div');
  modal.className='rsvp-curtain';
  modal.hidden=true;
  modal.innerHTML='<section class="rsvp-dialog" role="dialog" aria-modal="true" aria-labelledby="rsvpHeading"><button class="rsvp-x" type="button" aria-label="Close">×</button><div class="rsvp-content"></div></section>';
  document.body.appendChild(modal);
  const content=modal.querySelector('.rsvp-content');
  const state={step:'find',name:'',token:'',members:[],answers:{},error:'',busy:false};
  const enc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const palette='<div class="rsvp-colors"><span style="background:#dac2a6"></span><span style="background:#cba57d"></span><span style="background:#b38a61"></span><span style="background:#936c50"></span><span style="background:#75533e"></span></div>';
  const error=()=>state.error?'<p class="rsvp-error" role="alert">'+enc(state.error)+'</p>':'';
  const primary=(label,act,disabled=false)=>'<button type="button" class="rsvp-primary" data-act="'+act+'"'+(disabled?' disabled aria-disabled="true"':'')+'>'+label+'</button>';
  function countAnswers(){return state.members.filter(m=>['attending','not_attending'].includes(state.answers[m.id])).length;}
  function render(){
    let html='';
    if(state.step==='find'){
      html='<p class="rsvp-kicker">MATTIA & KIRSTEN · 07.12.2026</p><h2 id="rsvpHeading">Find your invitation</h2>'+
        '<p>Enter your exact first name, surname or full name. Partial names and random letters will not show any results.</p>'+
        '<form id="rsvpLookup"><label for="rsvpName">Name or surname</label><input id="rsvpName" type="text" minlength="3" maxlength="100" autocomplete="name" required placeholder="Your name or surname" value="'+enc(state.name)+'">'+
        error()+(!api?'<p class="rsvp-demo">Guest confirmation will be available once the Cloudflare D1 database is connected.</p>':'')+
        primary(state.busy?'Searching…':'Search invitation','lookup',state.busy)+'</form>';
    }
    if(state.step==='choose'){
      html='<p class="rsvp-kicker">YOUR INVITATION</p><h2 id="rsvpHeading">Who will attend?</h2>'+
        '<p>Select Attend or Not attend for <strong>every person</strong> listed here.</p>'+
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
      html='<p class="rsvp-kicker">A LITTLE NOTE FROM US</p><h2 id="rsvpHeading">Celebrate in Caramel</h2>'+
      '<p>We kindly ask guests to dress in warm light brown, caramel, camel or sand tones.</p>'+palette+
      '<p><strong>Keep it simple & elegant.</strong> Plain solid colors are preferred; no bold patterns.</p>'+primary('Consider it noted','done');
    }
    if(state.step==='done')html='<p class="rsvp-kicker">MATTIA & KIRSTEN</p><h2 id="rsvpHeading">Thank you!</h2><p>All responses for your invitation have been recorded.</p>'+primary('Back to the invitation','close');
    content.innerHTML=html;
    content.querySelectorAll('[data-act]').forEach(btn=>btn.addEventListener('click',()=>action(btn.dataset.act)));
    content.querySelectorAll('[data-member]').forEach(btn=>btn.addEventListener('click',()=>{
      state.answers[Number(btn.dataset.member)]=btn.dataset.status;
      state.error='';render();
    }));
    content.querySelector('#rsvpLookup')?.addEventListener('submit',e=>{e.preventDefault();action('lookup')});
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
      const key=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
      if(key.length<3||!/^[a-z]+(?:[ '-][a-z]+)*$/.test(key)){
        state.error='Enter an exact first name, surname or full name (at least 3 letters).';render();return;
      }
      if(!api){state.error='The RSVP database is not connected yet.';render();return;}
      state.busy=true;state.error='';render();
      try{
        const resp=await fetch(api+'/api/household/lookup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name}),cache:'no-store'});
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
        const resp=await fetch(api+'/api/household/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          household_token:state.token,
          answers:state.members.map(m=>({id:Number(m.id),status:state.answers[m.id]}))
        }),cache:'no-store'});
        const data=await resp.json().catch(()=>({}));
        if(!resp.ok)throw Error(data.error||'Could not save your responses.');
        state.step='dress';state.error='';
      }catch(e){state.error=e.message||'Could not save. Please retry.';}
      finally{state.busy=false;render();}
    }
  }
  function open(name=''){
    state.step='find';state.name=name;state.token='';state.members=[];state.answers={};state.error='';state.busy=false;
    modal.hidden=false;document.body.classList.add('rsvp-open');render();
    if(name)action('lookup');
  }
  function close(){modal.hidden=true;document.body.classList.remove('rsvp-open');}
  document.querySelectorAll('[data-open-rsvp]').forEach(button=>button.addEventListener('click',()=>open()));
  document.querySelectorAll('[data-rsvp-search]').forEach(form=>form.addEventListener('submit',e=>{
    e.preventDefault();open(form.querySelector('input')?.value.trim()||'');
  }));
  modal.querySelector('.rsvp-x').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
})();
