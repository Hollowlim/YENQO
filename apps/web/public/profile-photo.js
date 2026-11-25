// Account-owned photos and a lightweight, reduced-motion-aware profile card.
(() => {
  if (!document.body.classList.contains('v6-portal')) return;
  const offline = document.documentElement.dataset.offlinePreview === 'true';
  const showImage = image => {
    const container = image.closest('[data-profile-avatar]');
    const initial = container?.querySelector('[data-profile-initial]');
    image.addEventListener('load', () => { image.hidden = false; if (initial instanceof HTMLElement) initial.hidden = true; });
    image.addEventListener('error', () => { image.hidden = true; if (initial instanceof HTMLElement) initial.hidden = false; });
    if (image.complete && image.naturalWidth) { image.hidden = false; if (initial instanceof HTMLElement) initial.hidden = true; }
  };
  document.querySelectorAll('[data-own-profile-photo]').forEach(image => { if (image instanceof window.HTMLImageElement) showImage(image); });
  const settings = document.querySelector('[data-photo-settings]');
  if (!(settings instanceof HTMLElement)) return;
  const form = settings.querySelector('[data-photo-form]');
  const file = settings.querySelector('[data-photo-file]');
  const save = settings.querySelector('[data-photo-save]');
  const remove = settings.querySelector('[data-photo-remove]');
  const cancel = settings.querySelector('[data-photo-cancel]');
  const status = settings.querySelector('[data-photo-status]');
  const picker = settings.querySelector('[data-photo-picker]');
  const actions = settings.querySelector('[data-photo-actions]');
  const card = settings.querySelector('[data-profile-card]');
  const portrait = settings.querySelector('.profile-card-portrait');
  if (!(form instanceof HTMLFormElement) || !(file instanceof HTMLInputElement) || !(save instanceof HTMLButtonElement) || !(remove instanceof HTMLButtonElement) || !(cancel instanceof HTMLButtonElement) || !(portrait instanceof HTMLElement)) return;
  let savedUrl = portrait.querySelector('img')?.getAttribute('src') ?? '';
  let encoded = '', busy = false, reading = 0;
  const say = message => { if (status) status.textContent = message; };
  const paint = (container, url) => {
    container.querySelector('img')?.remove();
    const initial = container.querySelector('[data-profile-initial]');
    if (initial instanceof HTMLElement) initial.hidden = false;
    if (!url) return;
    const image = document.createElement('img');
    image.className = 'profile-avatar-image'; image.alt = ''; image.hidden = true; image.dataset.ownProfilePhoto = '';
    container.append(image); showImage(image); image.src = url;
  };
  const buttons = () => { file.disabled = busy; if(picker instanceof HTMLButtonElement)picker.disabled=busy; if(actions instanceof HTMLElement)actions.hidden=!encoded; save.disabled = busy || !encoded; remove.disabled = busy || !savedUrl; remove.hidden=!savedUrl||Boolean(encoded); cancel.disabled = busy; cancel.hidden = !encoded; form.setAttribute('aria-busy', String(busy)); };
  const reset = () => { reading++; encoded = ''; file.value = ''; paint(portrait, savedUrl); buttons(); };
  if (offline) {
    form.querySelectorAll('input,button').forEach(node => { /** @type {HTMLInputElement} */(node).disabled = true; });
    say('Offline preview. Sign in on the running website to upload your photo.');
  } else {
    buttons();
    picker?.addEventListener('click',()=>{if(!busy)file.click();});
    file.addEventListener('change', () => {
      const revision = ++reading, selected = file.files?.[0];
      encoded = ''; paint(portrait, savedUrl); buttons();
      if (!selected) return;
      if (!['image/jpeg','image/png','image/webp'].includes(selected.type) || selected.size > 5 * 1024 * 1024 || !selected.size) { say('Choose a JPG, PNG or WebP photo, up to 5 MB.'); file.value = ''; return; }
      say('Preparing photo preview…');
      const reader = new window.FileReader();
      reader.addEventListener('load', () => {
        if (revision !== reading || typeof reader.result !== 'string') return;
        encoded = reader.result.slice(reader.result.indexOf(',') + 1);
        paint(portrait, reader.result); buttons(); say('Preview only. Choose Save photo to update your profile.');
      });
      reader.addEventListener('error', () => { if (revision === reading) say('This photo could not be read. Try another image.'); });
      reader.readAsDataURL(selected);
    });
    cancel.addEventListener('click', () => { reset(); say('Preview cancelled. Your saved photo is unchanged.'); });
    const update = async method => {
      if (busy || (method === 'PUT' && !encoded)) return;
      busy = true; buttons(); say(method === 'PUT' ? 'Saving your photo…' : 'Removing your photo…');
      try {
        const response = await fetch('/api/profile/photo', { method, ...(method === 'PUT' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: encoded }) } : {}) });
        const result = await response.json(); if (!response.ok) throw new Error(result.message ?? 'Your photo could not be updated.');
        savedUrl = typeof result.photoUrl === 'string' && result.photoUrl.startsWith('/api/profile/photo?') ? result.photoUrl : '';
        document.querySelectorAll('[data-profile-avatar]').forEach(container => { if (container instanceof HTMLElement) paint(container, savedUrl); });
        reset(); say(result.message);
      } catch (error) { say(error instanceof Error ? error.message : 'Your photo could not be updated.'); }
      finally { busy = false; buttons(); }
    };
    form.addEventListener('submit', event => { event.preventDefault(); void update('PUT'); });
    remove.addEventListener('click', () => { void update('DELETE'); });
  }
  document.addEventListener('profile:updated', event => {
    const name = /** @type {CustomEvent} */(event).detail?.name;
    const label = settings.querySelector('[data-profile-card-name]'); if (typeof name === 'string' && label) label.textContent = name;
  });
  // Pointer-only tilt: no device permissions and no continuous render loop.
  if (card instanceof HTMLElement) {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const neutral = () => card.classList.remove('is-pointed');
    card.addEventListener('pointermove', event => {
      if (motion.matches || event.pointerType !== 'mouse') return;
      const rect = card.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
      card.classList.add('is-pointed');
      card.style.setProperty('--profile-rx', `${(0.5-y)*7}deg`); card.style.setProperty('--profile-ry', `${(x-0.5)*7}deg`);
      card.style.setProperty('--profile-x', `${x*100}%`); card.style.setProperty('--profile-y', `${y*100}%`);
    });
    card.addEventListener('pointerleave', neutral); motion.addEventListener('change', neutral);
  }
})();
