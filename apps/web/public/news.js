// USD calendar view. Missing data is shown as unavailable, never as "safe".
(() => {
  const root = document.querySelector('[data-yq-news]');
  if (!(root instanceof HTMLElement)) return;
  const $ = (/** @type {string} */ s) => /** @type {HTMLElement} */ (root.querySelector(s));
  const zone = { timeZone: 'Asia/Kuala_Lumpur' };
  const day = new Intl.DateTimeFormat('en-MY', { ...zone, weekday: 'short', day: '2-digit', month: 'short' });
  const time = new Intl.DateTimeFormat('en-MY', { ...zone, hour: '2-digit', minute: '2-digit', hour12: false });
  /** @type {number|undefined} */ let timer;

  function render(data) {
    const pill = $('[data-yq-news-state]');
    const live = data?.status === 'ok';
    pill.textContent = live ? 'Provider connected' : data?.status === 'error' ? 'Provider error' : 'Unavailable';
    pill.className = `yq-pill yq-pill-${live ? 'ok' : 'pending'}`;
    const guard = data?.guard;
    $('[data-yq-guard]').textContent = guard?.state === 'PAUSE_NEW_ENTRIES' ? `Pause new entries: ${guard.event}. ${guard.reason}` : guard?.state === 'NO_ACTIVE_RESTRICTION' ? guard.reason : 'News data unavailable. Treat new entries as paused.';
    $('[data-yq-freshness]').textContent = data?.fetchedAt ? `Calendar updated ${Math.max(0, Math.round((Date.now() - Date.parse(data.fetchedAt)) / 60000))} min ago.` : 'Feed freshness: no calendar data received.';
    if (data?.rules) $('[data-yq-rules]').textContent = `Rule: pause new entries ${data.rules.pauseBeforeMinutes} min before to ${data.rules.resumeAfterMinutes} min after high-impact USD releases. Existing SL/TP stay active; positions are never closed automatically.`;
    const events = data?.events ?? [];
    $('[data-yq-unavailable]').hidden = events.length > 0;
    $('[data-yq-events]').hidden = events.length === 0;
    $('[data-yq-event-rows]').replaceChildren(...events.map(event => {
      const tr = document.createElement('tr');
      if (event.major) tr.className = 'yq-row-major';
      const at = new Date(event.time);
      for (const [i, text] of [day.format(at), time.format(at), event.title + (event.major ? ' ★' : ''), event.impact === 'HIGH' ? 'High' : 'Medium', event.forecast ?? '—', event.previous ?? '—', event.actual ?? '—'].entries()) {
        const cell = document.createElement(i === 2 ? 'th' : 'td');
        if (i === 2) cell.setAttribute('scope', 'row');
        cell.textContent = text;
        if (i === 3) cell.className = event.impact === 'HIGH' ? 'yq-impact-high' : 'yq-impact-medium';
        tr.append(cell);
      }
      return tr;
    }));
    const next = events.find(event => event.impact === 'HIGH' && Date.parse(event.time) > Date.now());
    $('[data-yq-next-name]').textContent = next ? `${next.title} · ${day.format(new Date(next.time))} ${time.format(new Date(next.time))} MYT` : 'No upcoming high-impact event in the available data.';
    window.clearInterval(timer);
    const tick = () => {
      const left = next ? Date.parse(next.time) - Date.now() : NaN;
      if (!(left > 0)) { $('[data-yq-countdown]').textContent = '—'; return; }
      const h = Math.floor(left / 3600000), m = Math.floor(left / 60000) % 60, s = Math.floor(left / 1000) % 60;
      $('[data-yq-countdown]').textContent = `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    };
    tick(); if (next) timer = window.setInterval(tick, 1000);
  }
  const load = () => fetch('/api/news/usd', { credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)).catch(() => null).then(render);
  load(); window.setInterval(() => { if (!document.hidden) load(); }, 5 * 60000);
})();
