// Homepage-only progressive enhancements. No authentication, API calls or trading.
(() => {
  const root=document.querySelector('[data-homepage-v7]');
  if(!(root instanceof HTMLElement))return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact=window.matchMedia('(max-width: 850px)');
  const pointer=window.matchMedia('(hover: hover) and (pointer: fine)');
  const slow=window.matchMedia('(update: slow)');
  const lowPower=Boolean(window.navigator.hardwareConcurrency&&window.navigator.hardwareConcurrency<=2);

  const toggle=root.querySelector('[data-v7-menu-toggle]');
  const menu=root.querySelector('#v7-mobile-nav');
  if(toggle instanceof HTMLButtonElement&&menu instanceof HTMLElement){
    toggle.hidden=false;
    const close=(restoreFocus=false)=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open site navigation');if(restoreFocus)toggle.focus();};
    const open=()=>{menu.hidden=false;toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close site navigation');};
    close();
    toggle.addEventListener('click',()=>{if(menu.hidden)open();else close();});
    menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',event=>{
      if(!(link instanceof window.HTMLAnchorElement)||event instanceof window.MouseEvent&&(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0))return;
      // Close the compact menu while retaining the real link destination.
      event.preventDefault();close();
      const href=link.getAttribute('href');
      if(href?.startsWith('#')){const target=document.querySelector(href);if(target instanceof HTMLElement){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}}
      window.location.assign(link.href);
    }));
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){close(true);event.preventDefault();}});
    document.addEventListener('click',event=>{if(!menu.hidden&&event.target instanceof window.Node&&!menu.contains(event.target)&&!toggle.contains(event.target))close();});
    root.querySelector('.v7-header')?.addEventListener('focusout',event=>{
      const next=/** @type {FocusEvent} */(event).relatedTarget;
      if(next instanceof window.Node&&(menu.contains(next)||next===toggle))return;
      if(!menu.hidden)close();
    });
    compact.addEventListener('change',()=>close());
  }

  const track=root.querySelector('#v7-course-track');
  if(track instanceof HTMLElement){
    const controls=root.querySelectorAll('[data-v7-carousel]');
    const sync=()=>{
      controls.forEach(button=>{if(button instanceof HTMLButtonElement)button.disabled=button.dataset.v7Carousel==='-1'?track.scrollLeft<=2:track.scrollLeft+track.clientWidth>=track.scrollWidth-2;});
    };
    const move=direction=>{const card=track.querySelector('.v7-course');const step=card instanceof HTMLElement?card.offsetWidth+15:track.clientWidth*.8;track.scrollBy({left:direction*step,behavior:reduced.matches?'instant':'smooth'});};
    controls.forEach(button=>button.addEventListener('click',()=>move(Number(/** @type {HTMLElement} */(button).dataset.v7Carousel))));
    track.addEventListener('scroll',sync,{passive:true});
    track.addEventListener('keydown',event=>{if(event.target!==track||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();if(event.key==='Home'||event.key==='End')track.scrollTo({left:event.key==='Home'?0:track.scrollWidth,behavior:reduced.matches?'instant':'smooth'});else move(event.key==='ArrowLeft'?-1:1);});
    window.addEventListener('resize',sync,{passive:true});
    sync();
  }

  const hero=root.querySelector('[data-v7-hero]');
  const space=root.querySelector('[data-v7-scene-space]');
  let heroVisible=true;
  const syncMotion=()=>{
    root.dataset.motion=reduced.matches?'reduced':lowPower||slow.matches?'static':!heroVisible||document.hidden?'paused':'running';
    if(root.dataset.motion!=='running'&&space instanceof HTMLElement)space.style.transform='none';
  };
  if(hero instanceof HTMLElement){
    if('IntersectionObserver' in window){
      const observer=new window.IntersectionObserver(entries=>{heroVisible=entries.some(entry=>entry.isIntersecting);syncMotion();},{threshold:0});
      observer.observe(hero);
      window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
    }
    hero.addEventListener('pointermove',event=>{
      if(!(space instanceof HTMLElement)||!pointer.matches||root.dataset.motion!=='running')return;
      const box=hero.getBoundingClientRect(),x=(event.clientX-box.left)/box.width-.5,y=(event.clientY-box.top)/box.height-.5;
      space.style.transform=`rotateY(${(x*3).toFixed(2)}deg) rotateX(${(-y*2).toFixed(2)}deg)`;
    },{passive:true});
    hero.addEventListener('pointerleave',()=>{if(space instanceof HTMLElement)space.style.transform='none';});
  }
  document.addEventListener('visibilitychange',syncMotion);
  reduced.addEventListener('change',syncMotion);slow.addEventListener('change',syncMotion);
  window.addEventListener('pagehide',()=>{root.dataset.motion='paused';});
  window.addEventListener('pageshow',syncMotion);
  syncMotion();

  // Content is visible by default and without JavaScript. Only near-viewport
  // sections are enhanced, so fast navigation cannot leave content concealed.
  if('IntersectionObserver' in window&&!reduced.matches){
    root.dataset.revealReady='true';
    const observer=new window.IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting&&entry.target instanceof HTMLElement){entry.target.dataset.v7Reveal='visible';observer.unobserve(entry.target);}},{rootMargin:'0px 0px 80px 0px',threshold:0});
    root.querySelectorAll('[data-v7-reveal]').forEach(element=>{if(!(element instanceof HTMLElement))return;const box=element.getBoundingClientRect();element.dataset.v7Reveal=box.top>window.innerHeight?'waiting':'visible';observer.observe(element);});
    reduced.addEventListener('change',()=>{if(reduced.matches){observer.disconnect();root.querySelectorAll('[data-v7-reveal]').forEach(element=>{if(element instanceof HTMLElement)element.dataset.v7Reveal='visible';});}});
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }
})();
