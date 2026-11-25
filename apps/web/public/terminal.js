// YENQO Tools terminal. The chart draws a seeded DEMO series because no licensed
// market-data feed is connected; account values render only from server responses.
(() => {
  const root = document.querySelector('[data-yq-terminal]');
  if (!(root instanceof HTMLElement)) return;
  const canvas = /** @type {HTMLCanvasElement} */ (root.querySelector('[data-yq-chart]'));
  const $ = (/** @type {string} */ selector) => /** @type {HTMLElement} */ (root.querySelector(selector));
  const fmt = (/** @type {number} */ n) => n.toFixed(2);
  const SECONDS = { M5: 300, M15: 900, H1: 3600, H4: 14400 };
  let timeframe = 'M15';

  // ---- Demo data (deterministic, labelled as demonstration everywhere it appears).
  function demoSeries(/** @type {string} */ tf) {
    let seed = [...tf].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
    const rand = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const step = Math.sqrt(SECONDS[tf] / 300) * 1.6;
    let close = 4000;
    return Array.from({ length: 90 }, () => {
      const open = close;
      close = open + (rand() - 0.5) * step * 2.2;
      return { open, close, high: Math.max(open, close) + rand() * step, low: Math.min(open, close) - rand() * step };
    });
  }
  function demoPlan(/** @type {{high:number,low:number}[]} */ candles) {
    const high = Math.max(...candles.map(c => c.high)), low = Math.min(...candles.map(c => c.low)), span = high - low;
    const layers = [0.32, 0.24, 0.16].map((f, i) => ({ name: `L${i + 1}`, price: low + span * f }));
    return { buyZone: [low + span * 0.12, low + span * 0.34], sellZone: [low + span * 0.8, low + span * 0.95], layers, sl: low + span * 0.05, tp: low + span * 0.62, active: layers.slice(0, 2) };
  }

  function draw() {
    const candles = demoSeries(timeframe), plan = demoPlan(candles);
    const ratio = window.devicePixelRatio || 1, width = canvas.clientWidth, height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx || !width || !height) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const css = window.getComputedStyle(canvas), color = (/** @type {string} */ name, fallback) => css.getPropertyValue(name).trim() || fallback;
    const c = { grid: color('--yq-line', '#2a3140'), text: color('--yq-muted', '#A6ADB8'), buy: color('--yq-buy', '#3FBF8F'), sell: color('--yq-sell', '#D66B6B'), gold: color('--yq-gold', '#D6B77A'), ink: color('--yq-ink', '#F5F3EF') };
    const axis = 64, top = 12, bottom = 18, plotW = width - axis, plotH = height - top - bottom;
    const max = Math.max(...candles.map(k => k.high), plan.sellZone[1]), min = Math.min(...candles.map(k => k.low), plan.sl);
    const y = (/** @type {number} */ p) => top + (max - p) / (max - min) * plotH;
    ctx.clearRect(0, 0, width, height);
    ctx.font = '11px Manrope, system-ui, sans-serif'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const p = min + (max - min) * i / 5;
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y(p)); ctx.lineTo(plotW, y(p)); ctx.stroke();
      ctx.fillStyle = c.text; ctx.fillText(fmt(p), plotW + 8, y(p));
    }
    const zone = (/** @type {number[]} */ [lo, hi], /** @type {string} */ fill, /** @type {string} */ label) => {
      ctx.globalAlpha = 0.12; ctx.fillStyle = fill; ctx.fillRect(0, y(hi), plotW, y(lo) - y(hi)); ctx.globalAlpha = 1;
      ctx.fillStyle = fill; ctx.fillText(label, 8, y(hi) + 10);
    };
    zone(plan.buyZone, c.buy, 'BUY ZONE · DEMO'); zone(plan.sellZone, c.sell, 'SELL ZONE · DEMO');
    const line = (/** @type {number} */ p, /** @type {string} */ stroke, /** @type {string} */ label, dash = [6, 4]) => {
      ctx.setLineDash(dash); ctx.strokeStyle = stroke; ctx.beginPath(); ctx.moveTo(0, y(p)); ctx.lineTo(plotW, y(p)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = stroke; ctx.fillText(label, plotW - ctx.measureText(label).width - 6, y(p) - 8);
    };
    plan.layers.forEach(l => line(l.price, c.gold, `${l.name} ${fmt(l.price)}`, [2, 3]));
    line(plan.sl, c.sell, `SL ${fmt(plan.sl)}`); line(plan.tp, c.buy, `TP ${fmt(plan.tp)}`);
    const slot = plotW / candles.length, body = Math.max(2, slot * 0.6);
    candles.forEach((k, i) => {
      const x = i * slot + slot / 2, up = k.close >= k.open;
      ctx.strokeStyle = ctx.fillStyle = up ? c.buy : c.sell;
      ctx.beginPath(); ctx.moveTo(x, y(k.high)); ctx.lineTo(x, y(k.low)); ctx.stroke();
      ctx.fillRect(x - body / 2, Math.min(y(k.open), y(k.close)), body, Math.max(1, Math.abs(y(k.open) - y(k.close))));
    });
    // Demo position markers: triangles at the right edge for the first two layers.
    plan.active.forEach(l => { ctx.fillStyle = c.ink; ctx.beginPath(); ctx.moveTo(plotW - 4, y(l.price)); ctx.lineTo(plotW - 14, y(l.price) - 6); ctx.lineTo(plotW - 14, y(l.price) + 6); ctx.fill(); });
    const rows = [['BUY zone', `${fmt(plan.buyZone[0])} – ${fmt(plan.buyZone[1])}`], ['SELL zone', `${fmt(plan.sellZone[0])} – ${fmt(plan.sellZone[1])}`], ...plan.layers.map(l => [`Entry ${l.name}`, fmt(l.price)]), ['Stop loss', fmt(plan.sl)], ['Take profit', fmt(plan.tp)]];
    $('[data-yq-levels]').replaceChildren(...rows.map(cells => tableRow(cells)));
    $('[data-yq-layer-rows]').replaceChildren(...plan.layers.map(l => tableRow([l.name, 'BUY (demo)', fmt(l.price), fmt(plan.sl), fmt(plan.tp)])));
  }
  function tableRow(/** @type {string[]} */ cells) {
    const tr = document.createElement('tr');
    cells.forEach((text, i) => { const cell = document.createElement(i ? 'td' : 'th'); if (!i) cell.setAttribute('scope', 'row'); cell.textContent = text; tr.append(cell); });
    return tr;
  }
  root.querySelectorAll('[data-yq-tf]').forEach(button => button.addEventListener('click', () => {
    timeframe = /** @type {HTMLElement} */ (button).dataset.yqTf ?? 'M15';
    root.querySelectorAll('[data-yq-tf]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('[data-yq-tf-label]').textContent = timeframe;
    draw();
  }));
  new window.ResizeObserver(() => draw()).observe(canvas);

  // ---- Server-confirmed status only.
  const getJson = (/** @type {string} */ url) => fetch(url, { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const setPill = (/** @type {HTMLElement} */ el, /** @type {string} */ text, /** @type {string} */ tone) => { el.textContent = text; el.className = `yq-pill yq-pill-${tone}`; };
  getJson('/api/ea/status').then(status => {
    $('[data-yq-stat="ea"]').textContent = status ? 'Not deployed' : 'Unavailable';
    setPill($('[data-yq-connection]'), status?.connector === 'PENDING' ? 'Cloud connector pending' : 'Status unavailable', 'pending');
  });
  getJson('/api/broker/connection').then(data => {
    const state = data?.connection?.state;
    $('[data-yq-stat="history"]').textContent = state ? String(state).toLowerCase().replaceAll('_', ' ') : 'Not connected';
    if (data?.connection?.currency) $('[data-yq-stat="currency"]').textContent = data.connection.currency;
  });
  getJson('/api/news/usd').then(news => {
    const guard = news?.guard;
    const state = guard?.state ?? 'UNKNOWN';
    setPill($('[data-yq-guard-state]'), state === 'PAUSE_NEW_ENTRIES' ? 'Pause new entries' : state === 'NO_ACTIVE_RESTRICTION' ? 'No active restriction' : 'Calendar unavailable', state === 'NO_ACTIVE_RESTRICTION' ? 'ok' : 'pending');
    $('[data-yq-guard-note]').textContent = guard?.reason ?? 'News data unavailable. Treat new entries as paused.';
  });

  // ---- EA requests: explicit confirmation, then a server decision. Never shown as executed.
  const result = $('[data-yq-ea-result]');
  async function request(/** @type {string} */ action, /** @type {string} */ label, /** @type {object|undefined} */ settings = undefined) {
    if (!window.confirm(`Send a "${label}" request? It will be recorded. Execution is currently disabled, so nothing is sent to a broker.`)) return;
    result.textContent = `${label}: sending request…`;
    const response = await fetch('/api/ea/commands', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, clientKey: window.crypto.randomUUID(), ...(settings ? { settings } : {}) }) }).catch(() => null);
    const body = response ? await response.json().catch(() => ({})) : {};
    result.textContent = `${label}: ${body.status === 'REJECTED' ? 'request rejected, not broker-confirmed. ' : ''}${body.message ?? 'Service unavailable. No command was sent.'}`;
  }
  root.querySelectorAll('[data-yq-ea]').forEach(button => button.addEventListener('click', () => request(/** @type {HTMLElement} */ (button).dataset.yqEa ?? '', button.textContent ?? '')));
  const form = /** @type {HTMLFormElement} */ ($('[data-yq-settings]'));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form), num = (/** @type {string} */ k) => Number(data.get(k)), opt = (/** @type {string} */ k) => (data.get(k) === '' ? null : num(k));
    request('UPDATE_SETTINGS', 'Settings update', { lotSize: num('lotSize'), riskPercent: num('riskPercent'), maxExposureLots: num('maxExposureLots'), maxLayers: num('maxLayers'), stopLossPoints: opt('stopLossPoints'), takeProfitPoints: opt('takeProfitPoints'), breakevenTriggerPoints: opt('breakevenTriggerPoints'), partialClosePercent: num('partialClosePercent') });
  });

  // ---- Bottom tabs (WAI-ARIA tabs pattern with arrow keys).
  const tabs = [...root.querySelectorAll('[data-yq-tab]')];
  const select = (/** @type {Element} */ tab) => tabs.forEach(t => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on)); t.setAttribute('tabindex', on ? '0' : '-1');
    /** @type {HTMLElement} */ (document.getElementById(t.getAttribute('aria-controls') ?? '')).hidden = !on;
  });
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      const key = /** @type {KeyboardEvent} */ (event).key;
      if (key !== 'ArrowRight' && key !== 'ArrowLeft') return;
      const next = tabs[(i + (key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(next); /** @type {HTMLElement} */ (next).focus();
    });
  });
})();
