// Ambient effects over the approved, complete hero artwork.
(() => {
  const root = document.querySelector('[data-v4-home]');
  const hero = root?.querySelector('.product-hero') ?? root?.querySelector('.v4-hero');
  if (!(root instanceof HTMLElement) || !(hero instanceof HTMLElement)) return;

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const assetBase = new URL(document.currentScript?.getAttribute('src') ?? window.location.href,window.location.href);
  let rendererLoaded = false;
  // The supplied artwork is the visible hero, never replaced by a second scene.
  root.dataset.heroLayers = 'artwork';
  // Only render the single opening artwork while its section is in view.
  const initialBounds = hero.getBoundingClientRect();
  let visible = !('IntersectionObserver' in window) || (initialBounds.bottom > 0 && initialBounds.top < window.innerHeight);
  const particles = document.createElement('div');
  particles.className = 'v4-hero-particles';
  particles.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 14; i++) {
    const spark = document.createElement('i');
    spark.style.setProperty('--spark-x', `${(i * 37 + 11) % 100}%`);
    spark.style.setProperty('--spark-y', `${(i * 23 + 17) % 100}%`);
    spark.style.setProperty('--spark-duration', `${9 + i % 6}s`);
    spark.style.setProperty('--spark-delay', `${-i * 1.7}s`);
    particles.append(spark);
  }
  hero.querySelector('.v4-hero-art')?.append(particles);

  const stars = document.createElement('div');
  stars.className = 'v4-hero-stars';
  stars.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 28; i++) {
    const star = document.createElement('i');
    star.className = `v4-white-star${i % 9 === 0 ? ' v4-white-star-flare' : ''}`;
    const x = (i * 47 + 13) % 100;
    let y = (i * 29 + 7) % 86;
    // Leave the main desktop headline and description free of bright points.
    if (x < 46 && y > 22 && y < 82) y = i % 2 ? 11 : 86;
    star.style.setProperty('--star-x', `${x}%`);
    star.style.setProperty('--star-y', `${y}%`);
    star.style.setProperty('--star-time', `${6 + i % 5}s`);
    star.style.setProperty('--star-delay', `${-i * 1.3}s`);
    stars.append(star);
  }
  hero.querySelector('.v4-hero-art')?.append(stars);

  const sync = () => {
    root.dataset.heroMotion = preference.matches ? 'reduced' : !visible || document.hidden ? 'paused' : 'running';
    if(root.dataset.heroMotion==='running'&&!rendererLoaded){
      rendererLoaded=true;root.dataset.artRenderer='loading';
      const script=document.createElement('script');script.src=new URL('hero-art-renderer.js',assetBase).href;script.defer=true;
      script.onerror=()=>{root.dataset.artRenderer='fallback';};document.head.append(script);
    }
  };
  preference.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    const observer = new window.IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      sync();
    });
    observer.observe(hero);
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
    window.addEventListener('pageshow', () => observer.observe(hero));
  }
  sync();

})();
