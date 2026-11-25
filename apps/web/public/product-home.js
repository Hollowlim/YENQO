// Progressive enhancement: with JavaScript unavailable, all feature sections remain readable.
(() => {
  const home=document.querySelector('[data-product-home]');
  if (!(home instanceof HTMLElement)) return;
  const list=home.querySelector('[data-product-tabs]');
  if (!(list instanceof HTMLElement)) return;
  const tabs=Array.from(list.querySelectorAll('a'));
  const panels=tabs.map(tab=>home.querySelector(tab.hash));
  if (panels.some(panel=>!(panel instanceof HTMLElement))) return;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  /** @type {Map<Animation, boolean>} */
  const animations=new Map();
  let devicesVisible=false;
  const animate=(node,frames,options,device=false)=>{
    if(motion.matches||document.hidden||!(node instanceof HTMLElement)||!node.animate)return;
    const animation=node.animate(frames,options);
    animations.set(animation,device);
    const release=()=>animations.delete(animation);
    animation.finished.then(release,release);
  };
  const arrive=(node,delay=0)=>animate(node,[{opacity:0,translate:'0 18px'},{opacity:1,translate:'0 0'}],{duration:580,delay,easing:'cubic-bezier(.2,.7,.3,1)'});
  const floatDevices=()=>{
    if(!devicesVisible||motion.matches||document.hidden||Array.from(animations).some(([animation,device])=>device&&animation.playState!=='idle'))return;
    home.querySelectorAll('.product-device-stage .product-phone').forEach((phone,index)=>animate(phone,[
      {translate:'0 0'},
      {translate:index?'2px -15px':'-2px -12px',offset:.36},
      {translate:index?'-1px -5px':'2px 4px',offset:.72},
      {translate:'0 0'},
    ],{duration:index?7600:6200,iterations:Infinity,easing:'ease-in-out'},true));
  };
  const syncMotion=()=>{
    home.dataset.productMotion=motion.matches?'reduced':document.hidden?'paused':'enabled';
    for(const [animation,device] of animations){
      if(motion.matches)animation.cancel();
      else if(document.hidden||(device&&!devicesVisible))animation.pause();
      else if(animation.playState==='paused')animation.play();
    }
    floatDevices();
  };
  motion.addEventListener('change',syncMotion);
  document.addEventListener('visibilitychange',syncMotion);
  if('IntersectionObserver' in window){
    const reveals=new window.IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        const node=entry.target;
        const stagger=node.matches('.product-steps>li,.product-plan')?Array.from(node.parentElement?.children??[]).indexOf(node)%3*70:0;
        arrive(node,stagger);reveals.unobserve(node);
      }
    },{threshold:.1});
    home.querySelectorAll('.product-hero-copy>*,.product-section-heading,.product-tabs,.product-coming-soon,.product-steps>li,.product-plan,.product-perspective-copy,.product-faq-section>div,.product-final-cta,.product-footer').forEach(node=>reveals.observe(node));
    const devices=new window.IntersectionObserver(entries=>{devicesVisible=entries.some(entry=>entry.isIntersecting);syncMotion();},{threshold:.1});
    const stage=home.querySelector('.product-device-stage');if(stage)devices.observe(stage);
    window.addEventListener('pagehide',()=>{reveals.disconnect();devices.disconnect();for(const animation of animations.keys())animation.cancel();});
    window.addEventListener('pageshow',()=>{if(stage)devices.observe(stage);});
  }
  syncMotion();
  list.setAttribute('role','tablist');
  list.setAttribute('aria-label','Explore product features');
  let selected=-1;
  const activate=(index,focus=false)=>{
    tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});
    panels.forEach((panel,i)=>{if(panel instanceof HTMLElement)panel.hidden=i!==index;});
    if(focus)tabs[index]?.focus({preventScroll:true});
    if(selected!==-1&&selected!==index){
      const panel=panels[index];
      if(panel instanceof HTMLElement)arrive(panel.querySelector('.product-feature-copy'));
    }
    selected=index;
  };
  tabs.forEach((tab,index)=>{
    const panel=panels[index];
    if (!(panel instanceof HTMLElement)) return;
    tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panel.id);
    panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panel.tabIndex=0;
    tab.addEventListener('click',event=>{event.preventDefault();activate(index);});
    tab.addEventListener('keydown',event=>{
      if(event.key===' '){event.preventDefault();activate(index);return;}
      const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;
      if(next!==null){event.preventDefault();activate(next,true);tabs[next]?.scrollIntoView({block:'nearest',inline:'nearest'});}
    });
  });
  const initial=tabs.findIndex(tab=>tab.hash===window.location.hash);
  activate(initial<0?0:initial);
  home.querySelectorAll('.product-menu a').forEach(link=>link.addEventListener('click',()=>home.querySelector('.product-menu')?.removeAttribute('open')));
  home.addEventListener('keydown',event=>{if(event.key==='Escape'){const menu=home.querySelector('.product-menu[open]');if(menu instanceof HTMLElement){menu.removeAttribute('open');const summary=menu.querySelector('summary');if(summary instanceof HTMLElement)summary.focus();}}});
})();
