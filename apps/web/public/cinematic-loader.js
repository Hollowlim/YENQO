// Load the optional scene only near the homepage hero and when motion is permitted.
(() => {
  const root=document.querySelector('[data-v4-home]');
  // Keep supplied artwork at native browser image resolution, not a downsampled canvas.
  if(!root||!root.hasAttribute('data-enable-webgl')||window.location.protocol==='file:')return;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let loaded=false;
  const load=()=>{
    if(loaded||motion.matches)return;
    loaded=true;
    const script=document.createElement('script');script.src='/assets/cinematic-scene.js';script.defer=true;document.head.append(script);
  };
  if('IntersectionObserver' in window){
    const observer=new window.IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){load();if(loaded)observer.disconnect();}},{rootMargin:'120px'});
    observer.observe(root.querySelector('.v4-hero')??root);
    motion.addEventListener('change',()=>{if(!motion.matches)load();});
  }else load();
})();
