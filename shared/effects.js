/* Page-by-page entrance effects based on four different video styles. */
(() => {
  'use strict';
  const parts=location.pathname.split('/').filter(Boolean); const last=parts.at(-1)||''; const slug=last==='index.html'?(parts.at(-2)||''):last;
  const theme = ['burgundy','botanical','editorial','vintage'].includes(slug)?slug:null;
  if(!theme)return;
  document.documentElement.classList.add('motion-'+theme);
  if(!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
  if(!('IntersectionObserver' in window))return;
  const selectors = {
    burgundy:'.section',
    botanical:'.sheet',
    editorial:'.chapter, .bottom',
    vintage:'.paper'
  };
  const targets=[...document.querySelectorAll(selectors[theme])];
  const observer = new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.isIntersecting){
        entry.target.classList.add('motion-visible');
        observer.unobserve(entry.target);
      }
    }
  },{threshold:0.08,rootMargin:'0px 0px 20px 0px'});
  for(const el of targets){el.classList.add('motion-section'); observer.observe(el)}
  document.documentElement.classList.add('wedding-motion');
})();