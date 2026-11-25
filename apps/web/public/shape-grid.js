// Canvas adaptation of the square ShapeGrid effect supplied by the user
// (React Bits). No React runtime, remote scripts or model loading required.
// Shared MagicBento-style interaction for visible cards throughout the site.
(() => {
  const grid = document.documentElement;
  let cards = document.querySelectorAll('.offering-card, .card, .stat-card');
  cards.forEach(card => card.classList.add('effect-card'));
  document.addEventListener('cards:updated', () => { cards = document.querySelectorAll('.offering-card, .card, .stat-card'); cards.forEach(card => card.classList.add('effect-card')); });
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clear = () => cards.forEach(card => {
    if (!(card instanceof HTMLElement)) return;
    card.style.removeProperty('--bento-x');
    card.style.removeProperty('--bento-y');
    card.style.removeProperty('--bento-power');
  });
  grid.addEventListener('pointermove', event => {
    if (motion.matches || event.pointerType === 'touch') return;
    cards.forEach(card => {
      if (!(card instanceof HTMLElement)) return;
      const rect = card.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      const distance = Math.hypot(Math.max(0, -x, x - rect.width), Math.max(0, -y, y - rect.height));
      card.style.setProperty('--bento-x', `${x}px`);
      card.style.setProperty('--bento-y', `${y}px`);
      card.style.setProperty('--bento-power', String(Math.max(0, 1 - distance / 220)));
    });
  }, { passive: true });
  grid.addEventListener('pointerleave', clear);
  window.addEventListener('blur', clear);
  motion.addEventListener('change', clear);
})();
(() => {
  const element = document.querySelector('[data-shape-grid]');
  if (!(element instanceof HTMLElement)) return;
  const host = element;
  const target = host.querySelector('canvas');
  if (!(target instanceof HTMLCanvasElement)) return;
  const canvas = target;
  const context = canvas.getContext('2d');
  if (!context) return;
  const ctx = context;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cell = 44;
  let width = 1, height = 1, ratio = 1, offset = 0;
  let pointerX = -1000, pointerY = -1000;
  let last = 0, raf = 0, visible = true;
  /** @type {{x: number, y: number, age: number}[]} */
  let ripples = [];

  function draw(dt = 0) {
    if (!motion.matches) offset = (offset + dt * 9) % cell;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 0.65;
    for (let x = -cell; x < width + cell; x += cell) {
      for (let y = -cell; y < height + cell; y += cell) {
        const left = x + offset, top = y - offset;
        const distance = Math.hypot(left + cell / 2 - pointerX, top + cell / 2 - pointerY);
        let glow = motion.matches ? 0 : Math.max(0, 1 - distance / (cell * 2));
        for (const ripple of ripples) {
          const radius = ripple.age * 230;
          const edge = Math.abs(Math.hypot(left + cell / 2 - ripple.x, top + cell / 2 - ripple.y) - radius);
          glow = Math.max(glow, Math.max(0, 1 - edge / 35) * Math.max(0, 1 - ripple.age / 1.8));
        }
        ctx.strokeStyle = `rgba(232,190,104,${0.095 + glow * 0.5})`;
        ctx.strokeRect(left, top, cell, cell);
        if (glow > 0.01) {
          ctx.fillStyle = `rgba(232,190,104,${glow * 0.075})`;
          ctx.fillRect(left, top, cell, cell);
        }
      }
    }
    host.dataset.ready = 'true';
  }
  function stop() {
    window.cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden || motion.matches) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    ripples = ripples.filter(ripple => { ripple.age += dt; return ripple.age < 1.8; });
    draw(dt);
    raf = window.requestAnimationFrame(frame);
  }
  function wake() {
    if (motion.matches) { draw(); return; }
    if (!raf && visible && !document.hidden) raf = window.requestAnimationFrame(frame);
  }
  function resize() {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(4e6 / (width * height)));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    draw();
    wake();
  }
  const region = host.parentElement;
  if (!region) return;
  region.addEventListener('pointermove', event => {
    if (motion.matches || event.pointerType === 'touch') return;
    const bounds = host.getBoundingClientRect();
    pointerX = event.clientX - bounds.left;
    pointerY = event.clientY - bounds.top;
  }, { passive: true });
  region.addEventListener('pointerleave', () => { pointerX = pointerY = -1000; });
  region.addEventListener('pointerdown', event => {
    if (motion.matches) return;
    const bounds = host.getBoundingClientRect();
    ripples.push({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, age: 0 });
    ripples = ripples.slice(-4);
    wake();
  }, { passive: true });
  const resizeObserver = new window.ResizeObserver(resize);
  resizeObserver.observe(host);
  const observer = new window.IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible) wake(); else stop();
  });
  observer.observe(host);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else wake(); });
  motion.addEventListener('change', () => {
    stop();
    ripples = [];
    pointerX = pointerY = -1000;
    draw();
    wake();
  });
  window.addEventListener('pagehide', () => { stop(); observer.disconnect(); resizeObserver.disconnect(); }, { once: true });
  resize();
})();
