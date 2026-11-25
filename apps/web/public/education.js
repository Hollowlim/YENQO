(() => {
  const root = document.querySelector('[data-education]');
  if (!root) return;
  const admin = root.getAttribute('data-education') === 'admin';
  const form = /** @type {HTMLFormElement | null} */ (root.querySelector('form'));
  const status = root.querySelector('[data-education-status]');
  const list = root.querySelector('[data-lessons]');
  const more = /** @type {HTMLButtonElement} */ (root.querySelector('[data-more-lessons]'));
  const uploadButton = /** @type {HTMLButtonElement | null} */ (root.querySelector('[data-upload-video]'));
  let current = null, cursor = null, busy = false;
  const say = text => { if (status) status.textContent = text; };
  const el = (tag, text = '', className = '') => { const node = document.createElement(tag); node.textContent = text; node.className = className; return node; };
  const input = name => /** @type {HTMLInputElement} */ (form?.elements.namedItem(name));
  const api = admin ? '/api/admin/lessons' : '/api/content/lessons';
  if (window.location.protocol === 'file:' || document.documentElement.dataset.offlinePreview === 'true') {
    root.querySelectorAll('input,textarea,button').forEach(node => { /** @type {HTMLInputElement} */ (node).disabled = true; });
    say('Offline preview. Sign in through the local server to upload or watch lessons.');
    return;
  }
  const request = async (url, options = {}) => {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? 'Request failed. Try again.');
    return data;
  };
  const lock = value => {
    busy = value;
    form?.querySelectorAll('button,input,textarea').forEach(node => { /** @type {HTMLInputElement} */ (node).disabled = value; });
    root.querySelectorAll('[data-edit-lesson], [data-new-lesson]').forEach(node => { /** @type {HTMLButtonElement} */ (node).disabled = value; });
  };
  function edit(item) {
    current = item;
    input('title').value = item?.title ?? '';
    input('description').value = item?.description ?? '';
    input('video').value = '';
    if (uploadButton) uploadButton.disabled = !item || item.status !== 'DRAFT';
    say(item ? `Editing ${item.title} · ${item.status} · Revision ${item.version}${item.bytes ? ' · Video uploaded' : ' · No video yet'}` : 'New lesson. Save a draft before uploading its video.');
  }
  function card(item) {
    const card = el('article', '', 'card education-video-card');
    card.setAttribute('aria-label', item.title);
    card.append(el('span', admin ? item.status : 'VIDEO LESSON', 'eyebrow'), el('h2', item.title), el('p', item.description, 'lesson-description'));
    card.append(el('small', `Updated ${new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(item.updatedAt))} MYT · Revision ${item.version}`));
    if (item.bytes) {
      const video = document.createElement('video'); video.controls = true; video.preload = 'none'; video.playsInline = true;
      video.src = `${api}/${encodeURIComponent(item.id)}/video`; video.setAttribute('aria-label', `${item.title} video`);
      const error = el('p', 'Video cannot be played. Your session/access may have changed, or the file codec is unsupported. Refresh or contact the administrator.', 'notice'); error.hidden = true;
      video.addEventListener('error', () => { error.hidden = false; });
      video.append(el('p', 'Your browser does not support HTML video.'));
      card.append(video, error);
    } else card.append(el('p', 'No video uploaded yet.', 'muted'));
    if (admin) {
      const button = el('button', 'Edit lesson', 'button button-outline'); button.type = 'button'; button.dataset.editLesson = item.id;
      button.addEventListener('click', () => { if (!busy) { edit(item); form?.scrollIntoView({ block: 'start', behavior: 'smooth' }); } }); card.append(button);
    }
    return card;
  }
  async function load(append = false) {
    const data = await request(api + (append && cursor ? `?before=${encodeURIComponent(cursor)}` : ''));
    if (!append) list?.replaceChildren();
    for (const item of data.items) list?.append(card(item));
    cursor = data.nextCursor; more.hidden = !cursor;
    if (!list?.children.length) list?.append(el('p', admin ? 'No lessons yet. Create your first video lesson.' : 'No published video lessons yet.', 'notice'));
    document.dispatchEvent(new window.Event('cards:updated'));
  }
  more?.addEventListener('click', async () => { more.disabled = true; try { await load(true); } catch (error) { say(error instanceof Error ? error.message : 'Request failed.'); } finally { more.disabled = false; } });
  root.querySelector('[data-new-lesson]')?.addEventListener('click', () => { if (!busy) edit(null); });
  form?.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const submitter = /** @type {HTMLButtonElement | null} */ (/** @type {SubmitEvent} */ (event).submitter);
    const nextStatus = submitter?.value ?? 'DRAFT';
    lock(true);
    try {
      const data = await request(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(current ? { id: current.id } : {}), version: current?.version ?? 0, title: input('title').value, description: input('description').value, status: nextStatus }) });
      current = data.item; await load(); say(`${nextStatus === 'PUBLISHED' ? 'Published' : nextStatus === 'ARCHIVED' ? 'Archived' : 'Draft saved'}. Revision ${current.version}${current.bytes ? ' · Video uploaded' : ' · Upload your MP4 next'}`);
    } catch (error) { say(error instanceof Error ? error.message : 'Request failed.'); }
    finally { lock(false); if (uploadButton) uploadButton.disabled = !current || current.status !== 'DRAFT'; }
  });
  uploadButton?.addEventListener('click', async () => {
    if (busy || !current) return;
    const file = input('video').files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.mp4')) { say('Choose an MP4 video.'); return; }
    if (file.size > 500 * 1024 * 1024) { say('Maximum video size is 500 MB.'); return; }
    lock(true);
    const progress = /** @type {HTMLProgressElement} */ (root.querySelector('progress')); progress.hidden = false; progress.value = 0;
    const lesson = current;
    try {
      const result = await new Promise((resolve, reject) => {
        const xhr = new window.XMLHttpRequest(); xhr.open('PUT', `${api}/${encodeURIComponent(lesson.id)}/video`); xhr.timeout = 10 * 60 * 1000;
        xhr.setRequestHeader('Content-Type', 'video/mp4'); xhr.setRequestHeader('If-Match', String(lesson.version));
        xhr.upload.addEventListener('progress', event => { if (event.lengthComputable) { progress.value = event.loaded / event.total * 100; say(`Uploading ${Math.round(progress.value)}%${event.loaded === event.total ? ' · Validating video…' : ''}`); } });
        xhr.addEventListener('load', () => { try { const data = JSON.parse(xhr.responseText); if (xhr.status >= 200 && xhr.status < 300) resolve(data); else reject(new Error(data.message ?? 'Upload failed.')); } catch { reject(new Error('Upload failed. Reload before retrying.')); } });
        for (const type of ['error', 'abort', 'timeout']) xhr.addEventListener(type, () => reject(new Error('Upload interrupted. Reload the lesson before retrying.')));
        xhr.send(file);
      });
      current = result.item; input('video').value = ''; await load(); say('Video uploaded. Preview it below, then Publish when ready.');
    } catch (error) { say(error instanceof Error ? error.message : 'Upload failed.'); }
    finally { progress.hidden = true; lock(false); if (uploadButton) uploadButton.disabled = !current || current.status !== 'DRAFT'; }
  });
  if (admin) edit(null);
  load().catch(error => say(error.message));
})();
