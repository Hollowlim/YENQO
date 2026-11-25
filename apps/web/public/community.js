// Shared room only. The server authenticates every request and derives authors.
(() => {
  const root = document.querySelector('[data-community]');
  if (!(root instanceof HTMLElement)) return;
  const form = root.querySelector('[data-community-form]');
  const feed = root.querySelector('[data-community-feed]');
  if (!(form instanceof HTMLFormElement) || !(feed instanceof HTMLElement)) return;
  const composer = form;
  const list = feed;
  const viewport = root.querySelector('[data-community-scroll]');
  const status = root.querySelector('[data-community-send-status]');
  const access = root.querySelector('[data-community-access]');
  const errorBox = root.querySelector('[data-community-error]');
  const older = root.querySelector('[data-community-older]');
  const replyStatus = root.querySelector('[data-community-reply]');
  const cancel = root.querySelector('[data-community-cancel-reply]');
  const attach = root.querySelector('[data-community-attach]');
  const photoInput = /** @type {HTMLInputElement | null} */ (root.querySelector('[data-community-image-input]'));
  const photoPreview = root.querySelector('[data-community-attachment-preview]');
  const previewImage = /** @type {HTMLImageElement | null} */ (root.querySelector('[data-community-attachment-image]'));
  let selectedPhoto = null, selectingPhoto = false;
  const clearPhoto = () => { selectedPhoto = null; if (photoInput) photoInput.value = ''; if (previewImage) previewImage.removeAttribute('src'); photoPreview?.setAttribute('hidden', ''); };
  let canPost = false, admin = false, principal = '', cursor = null, replyTo = null;
  let pendingKey = '', pendingPayload = '', sending = false, loading = false, history = false;
  let timer = 0, failures = 0;
  const messages = new Map();
  const errorText = error => error instanceof Error ? error.message : 'Unable to complete the Community request.';
  const node = (tag, text, className = '') => { const element = document.createElement(tag); element.textContent = text; element.className = className; return element; };
  const setError = error => { if (errorBox) { errorBox.textContent = error; errorBox.toggleAttribute('hidden', !error); } };
  const setText = (target, text) => { if (target) target.textContent = text; };
  const disable = () => composer.querySelectorAll('input, textarea, button').forEach(control => {
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLButtonElement) control.disabled = !canPost || sending || selectingPhoto;
  });
  const resetReply = () => { replyTo = null; replyStatus?.setAttribute('hidden', ''); cancel?.setAttribute('hidden', ''); };
  cancel?.addEventListener('click', resetReply);
  attach?.addEventListener('click', () => { if (canPost && !sending) photoInput?.click(); });
  root.querySelector('[data-community-remove-image]')?.addEventListener('click', clearPhoto);
  photoInput?.addEventListener('change', async () => {
    const file = photoInput.files?.[0]; if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { clearPhoto(); setText(status, 'Choose a JPG, PNG or WebP image up to 5 MB.'); return; }
    selectingPhoto = true; disable();
    try {
      const data = await new Promise((resolve, reject) => { const reader = new window.FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read image.')); reader.readAsDataURL(file); });
      selectedPhoto = { base64: data.slice(data.indexOf(',') + 1) };
      if (previewImage) previewImage.src = data;
      photoPreview?.removeAttribute('hidden'); setText(root?.querySelector('[data-community-attachment-name]'), file.name);
      setText(status, 'Image attached. Add a caption or send it now.');
    } catch (error) { clearPhoto(); setText(status, errorText(error)); }
    finally { selectingPhoto = false; disable(); }
  });
  if (document.documentElement.dataset.offlinePreview === 'true') {
    disable();
    setText(access, 'OFFLINE PREVIEW — open the local server and sign in to read Community.');
    list.append(node('p', 'No live or stored messages are shown in this preview.', 'muted'));
    root.querySelectorAll('button').forEach(button => { if (button instanceof HTMLButtonElement) button.disabled = true; });
    composer.addEventListener('submit', event => event.preventDefault());
    return;
  }
  async function api(path, data) {
    const response = await fetch(path, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? 'Unable to connect to Community.');
    return result;
  }
  function action(label, handler) {
    const button = node('button', label, 'button button-secondary');
    button.type = 'button'; button.addEventListener('click', handler); return button;
  }
  function safeLink(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
  }
  async function moderate(item, report = false) {
    const reason = window.prompt(report ? 'Why are you reporting this message? (5–500 characters)' : 'Reason for removing this message? (5–500 characters)');
    if (reason === null) return;
    try {
      await api(`/api/community/messages/${encodeURIComponent(item.id)}/${report ? 'report' : 'remove'}`, { reason });
      setText(status, report ? 'Report sent to administrators.' : 'Message removed.');
      if (!report) { await refresh(false); if (admin) await loadReports(false); }
    } catch (error) { setError(errorText(error)); }
  }
  function render() {
    const existingImages = new Map();
    list.querySelectorAll('[data-message-id]').forEach(card => { const image = card.querySelector('img'); if (image) existingImages.set(card.getAttribute('data-message-id'), image); });
    const active = document.activeElement;
    const focusedCard = active instanceof HTMLElement && list.contains(active) ? active.closest('[data-message-id]') : null;
    const focusedId = focusedCard?.getAttribute('data-message-id');
    const focusedLabel = active?.textContent;
    const fragment = document.createDocumentFragment();
    const items = [...messages.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    let previousDay = '';
    if (!items.length) fragment.append(node('p', 'No messages yet. Verified members can start the conversation.', 'community-empty'));
    for (const item of items) {
      const day = new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium' }).format(new Date(item.createdAt));
      if (day !== previousDay) { fragment.append(node('div', day, 'chat-date-divider')); previousDay = day; }
      const card = node('article', '', 'community-message'); card.dataset.messageId = item.id;
      card.classList.toggle('is-own', item.author.id === principal);
      const meta = node('div', '', 'community-message-meta');
      meta.append(node('strong', item.author.name));
      if (item.author.role === 'ADMIN') meta.append(node('span', 'ADMIN', 'tag gold'));
      const time = node('time', new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', timeStyle: 'short' }).format(new Date(item.createdAt)));
      time.dateTime = item.createdAt; meta.append(time); card.append(meta);
      if (item.replyToId) {
        const parent = messages.get(item.replyToId);
        const preview = node('div', '', 'chat-reply-preview');
        preview.append(node('strong', parent ? parent.removed ? 'Removed message' : `Reply to ${parent.author.name}` : 'Earlier message'));
        if (parent && !parent.removed) preview.append(node('span', parent.text.slice(0, 120)));
        card.append(preview);
      }
      card.append(node('p', item.removed ? 'Message removed.' : item.text, 'community-message-text'));
      if (!item.removed && item.hasImage) {
        const image = existingImages.get(item.id) ?? document.createElement('img');
        if (!image.getAttribute('src')) { image.src = `/api/community/messages/${encodeURIComponent(item.id)}/image`; image.loading = 'lazy'; image.alt = `Image shared by ${item.author.name}`; image.className = 'chat-message-image'; }
        const link = node('a', '', 'chat-image-link'); link.href = image.src; link.target = '_blank'; link.rel = 'noopener'; link.setAttribute('aria-label', `Open image shared by ${item.author.name}`); link.append(image); card.append(link);
      }
      const href = !item.removed && item.chartUrl ? safeLink(item.chartUrl) : null;
      if (href) { const link = node('a', 'Open shared chart ↗', 'inline-link'); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer nofollow ugc'; card.append(link); }
      if (!item.removed) {
        const actions = node('div', '', 'community-actions');
        if (canPost) actions.append(action('Reply', () => { replyTo = item.id; setText(replyStatus, `Replying to ${item.author.name}`); replyStatus?.removeAttribute('hidden'); cancel?.removeAttribute('hidden'); composer.querySelector('textarea')?.focus(); }));
        if (admin || item.author.id === principal) actions.append(action(admin ? 'Hide message' : 'Remove message', () => moderate(item)));
        actions.append(action('Report', () => moderate(item, true))); card.append(actions);
      }
      fragment.append(card);
    }
    list.replaceChildren(fragment);
    if (focusedId) {
      let restored = false;
      list.querySelectorAll('[data-message-id]').forEach(card => {
        if (card.getAttribute('data-message-id') !== focusedId) return;
        card.querySelectorAll('button').forEach(button => {
          if (button.textContent === focusedLabel) { button.focus({ preventScroll: true }); restored = true; }
        });
      });
      if (!restored) list.focus({ preventScroll: true });
    }
  }
  function schedule() {
    window.clearTimeout(timer);
    if (document.hidden || history) return;
    timer = window.setTimeout(() => { if (!document.hidden) void refresh(false); }, Math.min(60000, 10000 * 2 ** failures));
  }
  async function refresh(more = false) {
    if (loading) return;
    loading = true;
    const scrollBox = viewport instanceof HTMLElement ? viewport : list;
    const oldHeight = scrollBox.scrollHeight, oldTop = scrollBox.scrollTop;
    const nearBottom = oldHeight - oldTop - scrollBox.clientHeight < 100;
    const initial = messages.size === 0;
    try {
      const response = await api(`/api/community/messages${more && cursor ? `?before=${encodeURIComponent(cursor)}` : ''}`);
      canPost = response.canPost; admin = response.isAdmin; principal = response.principalId;
      if (!more) { messages.clear(); history = false; }
      else history = true;
      for (const item of response.messages) messages.set(item.id, item);
      cursor = response.nextCursor;
      older?.toggleAttribute('hidden', !cursor);
      setText(access, canPost ? 'Community member — you can post and reply.' : 'Sign in to join the discussion.');
      if (history) setText(access, 'Viewing history. Auto-refresh paused; choose Refresh latest to return.');
      if (!canPost) { resetReply(); clearPhoto(); }
      disable(); render(); setError(''); failures = 0;
      if (more) scrollBox.scrollTop = oldTop + scrollBox.scrollHeight - oldHeight;
      else if (initial || nearBottom) scrollBox.scrollTop = scrollBox.scrollHeight;
      else scrollBox.scrollTop = oldTop;
      root?.querySelector('[data-community-reports]')?.toggleAttribute('hidden', !admin);
    } catch (error) { failures = Math.min(failures + 1, 3); setError(errorText(error)); }
    finally { loading = false; schedule(); }
  }
  composer.addEventListener('submit', async event => {
    event.preventDefault(); if (!canPost || sending || selectingPhoto) return;
    const fields = new FormData(composer);
    const text = String(fields.get('text') ?? '').trim();
    if (!text && !selectedPhoto) { setText(status, 'Write a message or attach an image.'); return; }
    const payload = { text, ...(selectedPhoto ? { image: selectedPhoto } : {}), replyToId: replyTo };
    const serialized = JSON.stringify(payload);
    if (pendingPayload !== serialized) { pendingPayload = serialized; pendingKey = window.crypto.randomUUID(); }
    sending = true; disable(); setText(status, 'Sending…');
    try {
      await api(selectedPhoto ? '/api/community/messages/photo' : '/api/community/messages', { ...payload, clientKey: pendingKey });
      composer.reset(); resetReply(); clearPhoto(); pendingPayload = pendingKey = ''; setText(status, 'Message sent.');
      await refresh(false);
    } catch (error) { setText(status, `${errorText(error)} Your draft is kept; retry with Send message.`); }
    finally { sending = false; disable(); }
  });
  let reportCursor = null;
  async function loadReports(more) {
    if (!admin) return;
    try {
      const response = await api(`/api/community/reports${more && reportCursor ? `?before=${encodeURIComponent(reportCursor)}` : ''}`);
      const target = root?.querySelector('[data-community-report-list]'); if (!target) return;
      if (!more) target.replaceChildren();
      if (!response.reports.length && !more) target.append(node('p', 'No reports.', 'muted'));
      for (const report of response.reports) {
        const card = node('article', '', 'community-message');
        card.append(node('strong', `Report from ${report.reporter.name}`), node('p', report.reason), node('p', report.message.removed ? 'Message already removed.' : report.message.text, 'community-message-text'));
        if (!report.message.removed && report.message.hasImage) {
          const imageLink = node('a', 'Open reported image ↗', 'inline-link');
          imageLink.href = `/api/community/messages/${encodeURIComponent(report.message.id)}/image`;
          imageLink.target = '_blank'; imageLink.rel = 'noopener'; card.append(imageLink);
        }
        if (!report.message.removed) card.append(action('Hide reported message', () => moderate(report.message)));
        target.append(card);
      }
      reportCursor = response.nextCursor; root?.querySelector('[data-community-report-more]')?.toggleAttribute('hidden', !reportCursor);
    } catch (error) { setError(errorText(error)); }
  }
  root.querySelector('[data-community-refresh]')?.addEventListener('click', () => { void refresh(false); });
  older?.addEventListener('click', () => { void refresh(true); });
  root.querySelector('[data-community-report-refresh]')?.addEventListener('click', () => { void loadReports(false); });
  root.querySelector('[data-community-report-more]')?.addEventListener('click', () => { void loadReports(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) window.clearTimeout(timer); else if (!history) void refresh(false); });
  window.addEventListener('pagehide', () => window.clearTimeout(timer));
  disable();
  void refresh(false).then(() => { if (admin) void loadReports(false); });
})();
