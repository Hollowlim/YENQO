// Manual admin-authored content only. Authorization and validation are server-side.
(() => {
  const element = document.querySelector('[data-editorial-admin], [data-editorial-public]');
  if (!(element instanceof HTMLElement)) return;
  const root = element;
  const admin = Boolean(root.dataset.editorialAdmin);
  const kind = root.dataset.editorialAdmin ?? root.dataset.editorialPublic;
  const formElement = root.querySelector('[data-editorial-form]');
  const form = formElement instanceof HTMLFormElement ? formElement : null;
  const target = root.querySelector('[data-editorial-items]');
  const status = root.querySelector('[data-editorial-status]');
  const dateInput = root.querySelector('[data-analysis-date]');
  const moreButton = root.querySelector('[data-editorial-more]');
  if (!(target instanceof HTMLElement)) return;
  const list = target;
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const node = (tag, text, className = '') => { const item = document.createElement(tag); item.textContent = text; item.className = className; return item; };
  const setStatus = text => { if (status) status.textContent = text; };
  const errorText = error => error instanceof Error ? error.message : 'Unable to load content.';
  const stamp = value => value ? new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not published';
  let record = null, cursor = null, category = '', busy = false, requestKey = '', initialized = false;
  const api = async (url, body) => {
    const response = await fetch(url, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? 'Unable to complete publishing request.');
    return result;
  };
  const changedCards = () => document.dispatchEvent(new window.Event('cards:updated'));
  const control = name => form?.elements.namedItem(name);
  function field(name, value) {
    const item = control(name);
    if (item instanceof HTMLInputElement || item instanceof HTMLTextAreaElement || item instanceof HTMLSelectElement) item.value = value == null ? '' : String(value);
  }
  function lock(locked) {
    form?.querySelectorAll('input, textarea, select, button').forEach(item => {
      if (item instanceof HTMLInputElement || item instanceof HTMLTextAreaElement || item instanceof HTMLSelectElement || item instanceof HTMLButtonElement) item.disabled = locked || (item.hasAttribute('data-editorial-archive') && !record);
    });
  }
  function edit(item) {
    if (!form) return;
    form.reset(); record = item;
    requestKey = item.requestKey ?? window.crypto.randomUUID();
    for (const [name, value] of Object.entries(item)) field(name, value);
    const current = root.querySelector('[data-editorial-current]');
    if (current) current.textContent = `${item.status} · Revision ${item.version} · Updated ${stamp(item.updatedAt)}`;
    lock(false);
  }
  function fresh() {
    form?.reset(); record = null; requestKey = window.crypto.randomUUID();
    field('planDate', today()); field('title', kind === 'analysis' ? 'XAUUSD daily game plan' : 'XAUUSD');
    const current = root.querySelector('[data-editorial-current]'); if (current) current.textContent = 'New draft — not saved';
    lock(false);
  }
  function levels(item) {
    const dl = node('dl', '', 'signal-levels editorial-levels');
    for (const [label, value] of [['ZONE', `${item.zoneLow} – ${item.zoneHigh}`], ['SL', item.sl], ['TP1', item.tp1], ['TP2', item.tp2], ['TP3', item.tp3]]) {
      const cell = node('div', ''); cell.append(node('dt', label), node('dd', String(value))); dl.append(cell);
    }
    return dl;
  }
  function publicCard(item) {
    const card = node('article', '', 'card editorial-public-card'); card.dataset.recordId = item.id;
    const meta = node('div', '', 'editorial-meta');
    meta.append(node('span', kind === 'analysis' ? item.planDate : `XAUUSD · ${item.side} · ${item.category}`, 'eyebrow'));
    if (kind === 'analysis') meta.append(node('span', item.bias, `tag bias-${item.bias.toLowerCase()}`));
    card.append(meta, node('h2', item.title));
    if (kind === 'analysis') card.append(node('h3', "Today's Game Plan", 'editorial-section-label'), node('p', item.description, 'editorial-description'));
    else { card.append(levels(item)); if (item.notes) card.append(node('p', item.notes, 'editorial-description')); }
    card.append(node('p', `Manually published ${stamp(item.publishedAt)} · Updated ${stamp(item.updatedAt)} · Revision ${item.version}`, 'editorial-timestamp'));
    if (kind === 'analysis' && dateInput instanceof HTMLInputElement && dateInput.value !== today()) card.append(node('p', 'Dated plan — this is not today’s analysis.', 'muted'));
    return card;
  }
  async function load(more = false) {
    if (busy) return;
    busy = true;
    try {
      const query = new URLSearchParams();
      if (!admin && kind === 'analysis' && dateInput instanceof HTMLInputElement) query.set('date', dateInput.value || today());
      if (!admin && category) query.set('category', category);
      if (more && cursor) query.set('before', cursor);
      const result = await api(`/api/${admin ? 'admin' : 'content'}/${kind}?${query}`);
      if (!more) list.replaceChildren();
      for (const item of result.items) {
        if (admin) {
          const card = node('article', '', 'card editorial-record');
          const info = node('div', ''); info.append(node('strong', item.title), node('p', `${kind === 'analysis' ? `${item.planDate} · ${item.bias}` : `${item.side} · ${item.category}`} · ${item.status} · Revision ${item.version}`, 'muted'));
          const button = node('button', 'Edit', 'button button-secondary'); button.type = 'button';
          button.addEventListener('click', () => { edit(item); setStatus('Record loaded. Changes are saved only when you choose an action.'); form?.scrollIntoView({ behavior: 'auto', block: 'start' }); });
          card.append(info, button); list.append(card);
        } else list.append(publicCard(item));
      }
      cursor = result.nextCursor;
      moreButton?.toggleAttribute('hidden', !cursor);
      setStatus(result.items.length ? (admin ? 'Records loaded.' : 'Published content loaded. Use Refresh/Load to check for updates.') : admin ? 'No records yet. Create your first draft.' : kind === 'analysis' ? 'No published game plan for this date.' : 'No published signals in this category.');
      if (admin && !initialized) {
        fresh();
        if (kind === 'analysis') { const current = result.items.find(item => item.planDate === today()); if (current) edit(current); }
        initialized = true;
      }
      changedCards();
    } catch (error) { setStatus(errorText(error)); }
    finally { busy = false; }
  }
  if (document.documentElement.dataset.offlinePreview === 'true') {
    root.querySelectorAll('input, textarea, select, button').forEach(item => { if (item instanceof HTMLInputElement || item instanceof HTMLTextAreaElement || item instanceof HTMLSelectElement || item instanceof HTMLButtonElement) item.disabled = true; });
    form?.addEventListener('submit', event => event.preventDefault());
    setStatus('OFFLINE PREVIEW — sign in on the local server to load or publish saved content.');
    return;
  }
  if (dateInput instanceof HTMLInputElement) dateInput.value = today();
  root.querySelector('[data-editorial-new]')?.addEventListener('click', () => { if (!busy) { fresh(); setStatus('New record. Complete the fields, then save a draft or publish.'); } });
  root.querySelector('[data-editorial-refresh]')?.addEventListener('click', () => { void load(false); });
  moreButton?.addEventListener('click', () => { void load(true); });
  root.querySelectorAll('[data-content-category]').forEach(button => button.addEventListener('click', () => {
    if (!(button instanceof HTMLElement) || busy) return;
    category = button.dataset.contentCategory ?? '';
    root.querySelectorAll('[data-content-category]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    void load(false);
  }));
  form?.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const submitter = event.submitter;
    if (!(submitter instanceof HTMLButtonElement) || !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(submitter.value)) return;
    const body = Object.fromEntries(new FormData(form));
    const payload = { ...body, version: record?.version ?? 0, ...(record ? { id: record.id } : {}), status: submitter.value, ...(kind === 'signals' ? { requestKey } : {}) };
    busy = true; lock(true); setStatus('Saving…');
    try {
      const result = await api(`/api/admin/${kind}`, payload);
      edit(result.item); busy = false;
      await load(false);
      setStatus(`${result.item.status === 'PUBLISHED' ? 'Published for all registered members.' : result.item.status === 'ARCHIVED' ? 'Archived. Removed from the client portal.' : 'Draft saved. Not visible to members.'} Revision ${result.item.version}.`);
    } catch (error) { setStatus(`${errorText(error)} Your form content is kept. If the record changed, refresh records and use Edit to reload it.`); }
    finally { busy = false; lock(false); }
  });
  lock(true);
  void load(false);
})();
