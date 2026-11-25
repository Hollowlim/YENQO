// Read-only dashboard summaries from the existing authenticated publishing APIs.
(() => {
  const root = document.querySelector('[data-client-portal]');
  if (!(root instanceof HTMLElement)) return;
  const offline = document.documentElement.dataset.offlinePreview === 'true';
  const node = (tag, text, className = '') => {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    return element;
  };
  const text = value => typeof value === 'string' ? value : '';
  const stamp = value => {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? 'Publication time unavailable' : new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };
  root.querySelectorAll('[data-client-briefing]').forEach(panel => {
    if (!(panel instanceof HTMLElement)) return;
    const kind = panel.dataset.clientBriefing;
    const status = panel.querySelector('[data-client-content-status]');
    const list = panel.querySelector('[data-client-content-items]');
    const button = panel.querySelector('[data-client-refresh]');
    if (!(list instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) return;
    if (offline) {
      if (status) status.textContent = 'Offline preview. Sign in on the running website to load published content.';
      button.disabled = true;
      return;
    }
    let busy = false;
    const load = async () => {
      if (busy) return;
      busy = true;
      button.disabled = true;
      panel.setAttribute('aria-busy', 'true');
      panel.classList.add('v6-loading');
      if (status) status.textContent = 'Loading published content...';
      try {
        const query = new URLSearchParams();
        if (kind === 'analysis') {
          const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
          query.set('date', date);
        }
        const response = await fetch(`/api/content/${kind}?${query}`, { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(text(result.message) || 'Published content is temporarily unavailable.');
        if (!Array.isArray(result.items)) throw new Error('Published content could not be read. Try again.');
        list.replaceChildren();
        for (const item of result.items.slice(0, 3)) {
          const row = node('article', '', 'v6-briefing-row');
          const metadata = node('div', '', 'v6-briefing-meta');
          const label = kind === 'analysis' ? text(item.bias) : [text(item.side), text(item.category)].filter(Boolean).join(' / ');
          metadata.append(node('span', label, 'tag'), node('time', stamp(item.publishedAt)));
          row.append(metadata, node('h3', text(item.title)));
          const description = kind === 'analysis' ? text(item.description) : text(item.notes);
          if (description) row.append(node('p', description.length > 220 ? `${description.slice(0, 217)}...` : description));
          if (kind === 'signals') row.append(node('small', 'Manual publication. View the full signal for entry zone, SL and targets.'));
          list.append(row);
        }
        if (status) status.textContent = result.items.length ? 'Latest saved publications. Refresh to check for updates.' : kind === 'analysis' ? 'No published game plan for today.' : 'No published signals yet.';
      } catch (error) {
        list.replaceChildren();
        if (status) status.textContent = error instanceof Error ? error.message : 'Published content is temporarily unavailable.';
      } finally {
        busy = false;
        button.disabled = false;
        panel.removeAttribute('aria-busy');
        panel.classList.remove('v6-loading');
      }
    };
    button.addEventListener('click', () => { void load(); });
    void load();
  });

  const chart = root.querySelector('.v6-chart-panel');
  const expand = root.querySelector('[data-client-chart-expand]');
  const chartStatus = root.querySelector('[data-client-chart-status]');
  const container = root.querySelector('[data-tradingview-chart]');
  if (chart instanceof HTMLElement && expand instanceof HTMLButtonElement) {
    if (typeof chart.requestFullscreen !== 'function') expand.hidden = true;
    else expand.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement === chart) await document.exitFullscreen();
        else await chart.requestFullscreen();
      } catch {
        if (chartStatus) chartStatus.textContent = 'Fullscreen is unavailable in this browser. The chart remains usable below.';
      }
    });
    document.addEventListener('fullscreenchange', () => {
      expand.textContent = document.fullscreenElement === chart ? 'Exit fullscreen' : 'Expand chart';
      expand.setAttribute('aria-pressed', String(document.fullscreenElement === chart));
    });
  }
  if (container instanceof HTMLElement && chartStatus) {
    const update = () => {
      if (container.hasAttribute('data-chart-error')) chartStatus.textContent = 'The external chart could not load. Retry it or open TradingView directly.';
      else if (container.querySelector('iframe')) chartStatus.textContent = 'TradingView chart frame loaded. Market availability and any delay are shown by the provider.';
    };
    const observer = new window.MutationObserver(update);
    observer.observe(container, { attributes: true, childList: true, subtree: true });
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
    update();
  }
})();
