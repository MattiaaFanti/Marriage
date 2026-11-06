/* Gentle scroll reveals for the wedding invitation.
   The visual introduction and live RSVP form remain untouched. */
(() => {
  'use strict';
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (media.matches || !('IntersectionObserver' in window)) return;

  function init() {
    const root = document.querySelector('main .content');
    if (!root) return;
    const textSelector = [
      '.info-section h2','.info-section h3','.info-section h4',
      '.info-section p','.info-section .invitation-monogram',
      '.info-section .venue-photo','.info-section .details-palette-panel',
      '.info-section .details-outfit-figure',
      '.info-section .event-divider','.info-section .family-inner-divider',
      '.info-section .invitation-divider','.info-section .details-flourish',
      '.info-section .final-fine-divider',
      '.info-section .action-link'
    ].join(',');
    const selected = [...root.querySelectorAll(textSelector)];
    const targets = selected.filter(el => {
      // An ancestor gets the effect instead of animating its children twice.
      return !selected.some(other => other !== el && other.contains(el));
    });
    // Each element is revealed once. Group delays are gentle and capped.
    let previousGroup = null;
    let index = 0;
    for (const el of targets) {
      const section = el.closest('.info-section');
      if (section !== previousGroup) { previousGroup = section; index = 0; }
      el.classList.add('wedding-reveal');
      if (el.matches('.venue-photo, .invitation-monogram, .details-outfit-figure')) el.classList.add('wedding-reveal-media');
      el.style.setProperty('--wedding-delay', Math.min(index % 5, 4) * 55 + 'ms');
      index++;
    }
    const dividers = [...root.querySelectorAll('.wedding-transition')];
    dividers.forEach(d => d.classList.add('wedding-divider-reveal'));
    const footer = document.querySelector('.site-footer');
    if (footer) targets.push(footer);
    if (footer) footer.classList.add('wedding-reveal');

    // Observer is ready before any element becomes hidden.
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, {threshold:0.07, rootMargin:'0px 0px -3% 0px'});

    document.documentElement.classList.add('wedding-motion-on');
    for (const el of [...targets, ...dividers]) {
      // Content initially in view should never be obscured waiting for a scroll.
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * .90 && rect.bottom > 0) {
        el.classList.add('is-visible');
      } else observer.observe(el);
    }
    // Safe escape: nothing remains hidden if orientation, lifecycle or browser
    // scheduling prevents the intersection callback.
    function revealAll() {
      observer.disconnect();
      for (const el of [...targets, ...dividers]) el.classList.add('is-visible');
    }
    media.addEventListener?.('change', event => { if (event.matches) revealAll(); });
    window.addEventListener('pagehide', revealAll, {once:true});
    window.addEventListener('pageshow', () => {
      for (const el of [...targets, ...dividers]) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-visible');
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
