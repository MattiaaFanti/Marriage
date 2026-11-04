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
  const soundtrack = document.createElement('audio');
  soundtrack.src = cfg.musicFile || './ben-ben-araw-araw-official-music-video_DNkfYn6U.mp3';
  soundtrack.loop = true;
  soundtrack.autoplay = true;
  soundtrack.preload = 'auto';
  soundtrack.volume = 0.18;
  soundtrack.setAttribute('playsinline','');
  document.body.appendChild(soundtrack);
  let playing = false;
  function startMusic(){
    if (playing) return;
    soundtrack.play().then(()=>playing=true).catch(()=>{});
  }
  startMusic();
  document.addEventListener('DOMContentLoaded', startMusic, {once:true});
  window.addEventListener('load', startMusic, {once:true});
  // When audible autoplay is blocked, the first natural gesture starts music.
  ['pointerdown','keydown','touchstart'].forEach(e=>document.addEventListener(e,startMusic,{passive:true}));
  const modal = document.createElement('div');
  modal.className='rsvp-curtain';
  modal.hidden=true;
  modal.innerHTML='<section class="rsvp-dialog" role="dialog" aria-modal="true" aria-labelledby="rsvpHeading"><button class="rsvp-x" type="button" aria-label="Close">×</button><div class="rsvp-content"></div></section>';
  document.body.appendChild(modal);
  const content = modal.querySelector('.rsvp-content');
  const p = new URLSearchParams(location.search);
  const state = {step:'find',name:'',token:p.get('invite')||'',guest:null,status:'',count:1,email:'',message:'',error:'',busy:false};
  const enc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const demoNote = demo?'<p class="rsvp-demo">PREVIEW ONLY — Cloudflare D1 is not connected; responses are not sent.</p>':'';
  const palette = '<div class="rsvp-colors"><span style="background:#dac2a6"></span><span style="background:#cba57d"></span><span style="background:#b38a61"></span><span style="background:#936c50"></span><span style="background:#75533e"></span></div>';
  const error = () => state.error?'<p class="rsvp-error">'+enc(state.error)+'</p>':'';
  const btn = (text,act) => '<button type="button" class="rsvp-primary" data-act="'+act+'">'+text+'</button>';
  function render(){
    let html='';
    if (state.step==='find') html='<p class="rsvp-kicker">KIRSTEN & MATTIA · 07.12.2026</p><h2 id="rsvpHeading">Find your invitation</h2><p>Search the name printed on your invitation.</p><form id="rsvpLookup"><label for="rsvpName">Name</label><input id="rsvpName" required autocomplete="name" placeholder="Enter your name" value="'+enc(state.name)+'">'+error() + demoNote + btn('Search my name','lookup') + '</form>';
    if (state.step==='choose') html='<p class="rsvp-kicker">WE FOUND YOU</p><h2 id="rsvpHeading">'+enc(state.guest.display_name)+'</h2><p>We would love to celebrate with you.</p><p class="rsvp-person">'+Number(state.guest.seats)+' seat(s) reserved</p><div class="rsvp-choices"><button data-answer="attending" class="'+(state.status==='attending'?'chosen':'')+'">Attending</button><button data-answer="not_attending" class="'+(state.status==='not_attending'?'chosen':'')+'">Not attending</button></div>'+(state.status==='attending'?'<label for="rsvpCount">Number of guests attending</label><input type="number" id="rsvpCount" min="1" max="'+Number(state.guest.seats)+'" value="'+Number(state.count)+'">':'')+error()+btn('Continue','details');
    if (state.step==='details') html='<p class="rsvp-kicker">JUST ONE MORE THING</p><h2 id="rsvpHeading">Confirm your RSVP</h2><label for="rsvpEmail">Email address (optional)</label><input id="rsvpEmail" type="email" placeholder="name@example.com" value="'+enc(state.email)+'"><label for="rsvpMessage">A note for the couple (optional)</label><textarea id="rsvpMessage" rows="3" maxlength="500">'+enc(state.message)+'</textarea>'+error()+btn(state.busy?'Saving…':'Confirm RSVP','submit');
    if (state.step==='dress') html='<p class="rsvp-kicker">A LITTLE NOTE FROM US</p><h2 id="rsvpHeading">Celebrate in Caramel</h2><p>We kindly ask our guests to dress in warm light brown, caramel, camel or sand tones.</p>'+palette+'<p><strong>Keep it simple & elegant.</strong> Plain solid colors are preferred; no bold patterns.</p>'+demoNote+btn('Consider it noted','done');
    if (state.step==='done') html='<p class="rsvp-kicker">KIRSTEN & MATTIA</p><h2 id="rsvpHeading">'+(state.status==='attending'?'See you there!':'Thank you for replying')+'</h2><p>'+(demo?'This preview has saved your choice only on this device.':'Your reply has been recorded.')+'</p>'+btn('Back to our invitation','close');
    content.innerHTML=html;
    content.querySelectorAll('[data-act]').forEach(n=>n.addEventListener('click',()=>action(n.dataset.act)));
    content.querySelectorAll('[data-answer]').forEach(n=>n.addEventListener('click',()=>{state.status=n.dataset.answer;state.error='';render()}));
    content.querySelector('#rsvpLookup')?.addEventListener('submit',e=>{e.preventDefault();action('lookup')});
  }
  async function action(a){
    if(a==='close'){close();return}
    if(a==='done'){state.step='done';render();return}
    if(a==='lookup'){
      const name=content.querySelector('#rsvpName')?.value.trim()||'';
      state.name=name;
      if(!name){state.error='Enter the name on your invitation.';render();return}
      try {
        if(demo){state.guest={display_name:name,seats:2,rsvp_status:'pending',guest_count:0}}
        else {
          if(!state.token) throw new Error('Please open your personal invitation link from the couple.');
          const res=await fetch(api+'/api/invite?token='+encodeURIComponent(state.token),{cache:'no-store'});
          const data=await res.json();
          if(!res.ok) throw new Error(data.error||'Invitation not found.');
          if(data.guest.display_name.trim().toLowerCase()!==name.toLowerCase()) throw new Error('The name does not match your invitation.');
          state.guest=data.guest;
        }
        state.status=state.guest.rsvp_status==='pending'?'':state.guest.rsvp_status;
        state.count=Math.max(1,Number(state.guest.guest_count)||1);
        state.email=state.guest.email||'';
        state.message=state.guest.message||'';
        state.error='';state.step='choose';
      } catch(e){state.error=e.message||'Invitation not found.'}
      render();return;
    }
    if(a==='details'){
      if(!['attending','not_attending'].includes(state.status)){state.error='Choose Attending or Not attending.';render();return;}
      const count=state.status==='attending'?Number(content.querySelector('#rsvpCount')?.value||1):0;
      if(!Number.isInteger(count)||count<0||count>Number(state.guest.seats)||(state.status==='attending'&&count<1)){state.error='Invalid guest count.';render();return;}
      state.count=count;state.step='details';state.error='';render();return;
    }
    if(a==='submit'&&!state.busy){
      state.email=content.querySelector('#rsvpEmail')?.value.trim()||'';
      state.message=content.querySelector('#rsvpMessage')?.value.trim()||'';
      if(state.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)){state.error='Please enter a valid email address.';render();return;}
      state.busy=true;render();
      try{
        if(demo)localStorage.setItem('marriage-demo-rsvp',JSON.stringify({name:state.name,status:state.status,count:state.count}));
        else{
          const res=await fetch(api+'/api/rsvp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:state.token,status:state.status,guest_count:state.count,email:state.email,message:state.message})});
          const data=await res.json();if(!res.ok)throw new Error(data.error||'Could not save your reply.');
        }
        state.step='dress';state.error='';
      }catch(e){state.error=e.message||'Please try again.'}finally{state.busy=false;render();}
    }
  }
  function open(name=''){
    state.step='find';state.error='';if(name)state.name=name;
    modal.hidden=false;document.body.classList.add('rsvp-open');render();
    if(name)action('lookup');
  }
  function close(){modal.hidden=true;document.body.classList.remove('rsvp-open')}
  document.querySelectorAll('[data-open-rsvp]').forEach(n=>n.addEventListener('click',()=>open()));
  document.querySelectorAll('[data-rsvp-search]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();open(form.querySelector('input')?.value.trim()||'')}));
  modal.querySelector('.rsvp-x').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
})();