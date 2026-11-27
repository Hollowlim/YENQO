// YENQO Tools terminal. With a connected read-only MT5 account the chart shows broker
// candles and the account's open positions; otherwise it draws a labelled DEMO series.
(() => {
  const root = document.querySelector('[data-yq-terminal]');
  if (!(root instanceof HTMLElement)) return;
  const canvas = /** @type {HTMLCanvasElement} */ (root.querySelector('[data-yq-chart]'));
  const $ = (/** @type {string} */ selector) => /** @type {HTMLElement} */ (root.querySelector(selector));
  const fmt = (/** @type {number} */ n) => n.toFixed(Math.abs(n) >= 100 ? 2 : 5);
  const SECONDS = { M5: 300, M15: 900, H1: 3600, H4: 14400 };
  let timeframe = 'M15', symbol = 'XAUUSD';
  /** @type {any} */ let live = null;

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
    return { buyZone: [low + span * 0.12, low + span * 0.34], sellZone: [low + span * 0.8, low + span * 0.95], layers, sl: low + span * 0.05, tp: low + span * 0.62 };
  }

  function draw() {
    const ratio = window.devicePixelRatio || 1, width = canvas.clientWidth, height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx || !width || !height) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const css = window.getComputedStyle(canvas), color = (/** @type {string} */ name, /** @type {string} */ fallback) => css.getPropertyValue(name).trim() || fallback;
    const c = { grid: color('--yq-line', '#2a3140'), text: color('--yq-muted', '#A6ADB8'), buy: color('--yq-buy', '#3FBF8F'), sell: color('--yq-sell', '#D66B6B'), gold: color('--yq-gold', '#D6B77A'), ink: color('--yq-ink', '#F5F3EF') };
    const isLive = Boolean(live?.candles?.length);
    /** @type {{open:number,high:number,low:number,close:number}[]} */ const candles = isLive ? live.candles : demoSeries(timeframe);
    /** @type {{price:number,stroke:string,label:string,dash:number[]}[]} */ const lines = [];
    /** @type {{range:number[],fill:string,label:string}[]} */ const zones = [];
    /** @type {string[][]} */ let rows = [], layerRows = [];
    if (isLive) {
      live.positions.forEach((/** @type {any} */ p, /** @type {number} */ i) => {
        const name = `L${i + 1}`, side = p.side === 'BUY' ? c.buy : c.sell;
        lines.push({ price: p.openPrice, stroke: side, label: `${name} ${p.side} ${p.volume} @ ${fmt(p.openPrice)}`, dash: [2, 3] });
        if (p.stopLoss) lines.push({ price: p.stopLoss, stroke: c.sell, label: `${name} SL ${fmt(p.stopLoss)}`, dash: [6, 4] });
        if (p.takeProfit) lines.push({ price: p.takeProfit, stroke: c.buy, label: `${name} TP ${fmt(p.takeProfit)}`, dash: [6, 4] });
        layerRows.push([name, p.side, fmt(p.openPrice), p.stopLoss ? fmt(p.stopLoss) : '—', p.takeProfit ? fmt(p.takeProfit) : '—']);
      });
      const last = candles[candles.length - 1].close;
      lines.push({ price: last, stroke: c.ink, label: `Now ${fmt(last)}`, dash: [] });
      rows = [['Last price', fmt(last)], ...layerRows.map(r => [`${r[0]} ${r[1]} entry`, r[2]])];
    } else {
      const plan = demoPlan(candles);
      zones.push({ range: plan.buyZone, fill: c.buy, label: 'BUY ZONE · DEMO' }, { range: plan.sellZone, fill: c.sell, label: 'SELL ZONE · DEMO' });
      plan.layers.forEach(l => lines.push({ price: l.price, stroke: c.gold, label: `${l.name} ${fmt(l.price)}`, dash: [2, 3] }));
      lines.push({ price: plan.sl, stroke: c.sell, label: `SL ${fmt(plan.sl)}`, dash: [6, 4] }, { price: plan.tp, stroke: c.buy, label: `TP ${fmt(plan.tp)}`, dash: [6, 4] });
      rows = [['BUY zone', `${fmt(plan.buyZone[0])} – ${fmt(plan.buyZone[1])}`], ['SELL zone', `${fmt(plan.sellZone[0])} – ${fmt(plan.sellZone[1])}`], ...plan.layers.map(l => [`Entry ${l.name}`, fmt(l.price)]), ['Stop loss', fmt(plan.sl)], ['Take profit', fmt(plan.tp)]];
      layerRows = plan.layers.map(l => [l.name, 'BUY (demo)', fmt(l.price), fmt(plan.sl), fmt(plan.tp)]);
    }
    const axis = 72, top = 12, bottom = 18, plotW = width - axis, plotH = height - top - bottom;
    const prices = [...candles.flatMap(k => [k.high, k.low]), ...lines.map(l => l.price), ...zones.flatMap(z => z.range)];
    let max = Math.max(...prices), min = Math.min(...prices);
    const pad = (max - min) * 0.04 || 1; max += pad; min -= pad;
    const y = (/** @type {number} */ p) => top + (max - p) / (max - min) * plotH;
    ctx.clearRect(0, 0, width, height);
    ctx.font = '11px Manrope, system-ui, sans-serif'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const p = min + (max - min) * i / 5;
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y(p)); ctx.lineTo(plotW, y(p)); ctx.stroke();
      ctx.fillStyle = c.text; ctx.fillText(fmt(p), plotW + 8, y(p));
    }
    zones.forEach(({ range: [lo, hi], fill, label }) => {
      ctx.globalAlpha = 0.12; ctx.fillStyle = fill; ctx.fillRect(0, y(hi), plotW, y(lo) - y(hi)); ctx.globalAlpha = 1;
      ctx.fillStyle = fill; ctx.fillText(label, 8, y(hi) + 10);
    });
    const slot = plotW / candles.length, body = Math.max(2, slot * 0.6);
    candles.forEach((k, i) => {
      const x = i * slot + slot / 2, up = k.close >= k.open;
      ctx.strokeStyle = ctx.fillStyle = up ? c.buy : c.sell;
      ctx.beginPath(); ctx.moveTo(x, y(k.high)); ctx.lineTo(x, y(k.low)); ctx.stroke();
      ctx.fillRect(x - body / 2, Math.min(y(k.open), y(k.close)), body, Math.max(1, Math.abs(y(k.open) - y(k.close))));
    });
    lines.forEach(({ price, stroke, label, dash }) => {
      ctx.setLineDash(dash); ctx.strokeStyle = stroke; ctx.beginPath(); ctx.moveTo(0, y(price)); ctx.lineTo(plotW, y(price)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = stroke; ctx.fillText(label, plotW - ctx.measureText(label).width - 6, y(price) - 8);
    });
    $('[data-yq-levels]').replaceChildren(...rows.map(cells => tableRow(cells)));
    $('[data-yq-layer-rows]').replaceChildren(...layerRows.map(cells => tableRow(cells)));
  }
  function tableRow(/** @type {string[]} */ cells) {
    const tr = document.createElement('tr');
    cells.forEach((text, i) => { const cell = document.createElement(i ? 'td' : 'th'); if (!i) cell.setAttribute('scope', 'row'); cell.textContent = text; tr.append(cell); });
    return tr;
  }

  // ---- Server-confirmed status only.
  const getJson = (/** @type {string} */ url) => fetch(url, { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const setPill = (/** @type {HTMLElement} */ el, /** @type {string} */ text, /** @type {string} */ tone) => { el.textContent = text; el.className = `yq-pill yq-pill-${tone}`; };
  const money = (/** @type {number|null} */ n, /** @type {string} */ cur) => n == null ? '—' : `${cur} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  let feedMessage = '', retry = false;
  async function loadLive() {
    const response = await fetch(`/api/broker/live?symbol=${encodeURIComponent(symbol)}&tf=${timeframe}`, { credentials: 'same-origin' }).catch(() => null);
    const body = response ? await response.json().catch(() => null) : null;
    live = body?.live && body.symbol === symbol ? body : null;
    // Broker error codes carry a customer-readable reason; anything else gets plain words.
    const status = response?.status ?? 0, client = status >= 400 && status < 500;
    feedMessage = body?.available === false ? 'Live charts are being switched on. Check back soon.' : body?.live === false ? '' : (client || body?.errorCode) && typeof body?.message === 'string' ? body.message : live ? '' : 'Could not reach your broker just now. Trying again shortly.';
    retry = !live && !client && Boolean(feedMessage) && body?.available !== false;
    render();
  }
  // Order counts for the charted symbol, from broker-confirmed positions only.
  function renderOrders() {
    const set = (/** @type {string} */ key, /** @type {string} */ text) => { $(`[data-yq-orders="${key}"]`).textContent = text; };
    set('symbol', symbol);
    setPill($('[data-yq-connection]'), live ? 'Live' : 'Not connected', live ? 'ok' : 'pending');
    if (!live) { ['total', 'buy', 'sell', 'buyLots', 'sellLots', 'pl'].forEach(key => set(key, '—')); return; }
    const side = (/** @type {string} */ name) => live.positions.filter((/** @type {any} */ p) => p.side === name);
    const lots = (/** @type {any[]} */ list) => list.reduce((sum, p) => sum + p.volume, 0).toFixed(2) + ' lots';
    const buys = side('BUY'), sells = side('SELL'), pl = live.positions.reduce((/** @type {number} */ sum, /** @type {any} */ p) => sum + (p.profit ?? 0), 0);
    set('total', String(live.positions.length)); set('buy', String(buys.length)); set('sell', String(sells.length));
    set('buyLots', lots(buys)); set('sellLots', lots(sells)); set('pl', money(pl, live.account.currency));
    $('[data-yq-orders="pl"]').className = pl > 0 ? 'yq-up' : pl < 0 ? 'yq-down' : '';
  }
  function render() {
    renderOrders();
    if (live) {
      const a = live.account, time = new Date(live.asOf).toLocaleTimeString();
      setPill($('[data-yq-source]'), 'Live · MT5 read-only', 'ok');
      $('[data-yq-feed]').textContent = live.candles.length ? `Live from your MT5 account · updated ${time} · refreshes every 10 seconds` : `Your broker returned no candles for ${symbol}. Check the exact symbol name in MT5 (for example XAUUSD.m).`;
      $('[data-yq-connect]').hidden = true;
      $('[data-yq-stat="balance"]').textContent = money(a.balance, a.currency);
      $('[data-yq-stat="equity"]').textContent = money(a.equity, a.currency);
      const floating = $('[data-yq-stat="floating"]');
      floating.textContent = money(a.floating, a.currency);
      floating.className = a.floating > 0 ? 'yq-up' : a.floating < 0 ? 'yq-down' : '';
      $('[data-yq-stat="positions"]').textContent = String(a.openPositions);
      $('[data-yq-stat="margin"]').textContent = money(a.margin, a.currency);
      $('[data-yq-stat="currency"]').textContent = a.currency;
      $('[data-yq-levels-caption]').textContent = `Live levels from your MT5 account, ${symbol}`;
      $('[data-yq-layers-note]').textContent = `Your open ${symbol} positions, read-only from MT5.`;
      const list = $('[data-yq-positions]');
      list.style.whiteSpace = 'pre-line';
      list.textContent = live.positions.length ? live.positions.map((/** @type {any} */ p, /** @type {number} */ i) => `L${i + 1} ${p.side} ${p.volume} lots @ ${fmt(p.openPrice)} · P/L ${money(p.profit, a.currency)}`).join('\n') : `No open ${symbol} positions.`;
    } else {
      setPill($('[data-yq-source]'), 'Chart: demo data, not market prices', 'demo');
      $('[data-yq-feed]').textContent = feedMessage ? `Demo chart. ${feedMessage}` : 'Demo chart. Connect your MT5 account to see live prices and your open trades on the chart.';
      $('[data-yq-connect]').hidden = false;
    }
    draw();
  }
  root.querySelectorAll('[data-yq-tf]').forEach(button => button.addEventListener('click', () => {
    timeframe = /** @type {HTMLElement} */ (button).dataset.yqTf ?? 'M15';
    root.querySelectorAll('[data-yq-tf]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('[data-yq-tf-label]').textContent = timeframe;
    loadLive();
  }));
  const symbolForm = /** @type {HTMLFormElement} */ ($('[data-yq-symbol]'));
  symbolForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!symbolForm.reportValidity()) return;
    symbol = String(new FormData(symbolForm).get('symbol')).trim().toUpperCase();
    $('[data-yq-symbol-label]').textContent = symbol;
    loadLive();
  });
  new window.ResizeObserver(() => draw()).observe(canvas);
  loadLive();
  // Poll while live (or after a temporary error), only while the tab is visible.
  window.setInterval(() => { if ((live || retry) && !document.hidden) loadLive(); }, 10000);

  getJson('/api/broker/connection').then(data => {
    const state = data?.connection?.state;
    $('[data-yq-stat="history"]').textContent = state ? String(state).toLowerCase().replaceAll('_', ' ') : 'Not connected';
    if (data?.connection?.currency && !live) $('[data-yq-stat="currency"]').textContent = data.connection.currency;
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
