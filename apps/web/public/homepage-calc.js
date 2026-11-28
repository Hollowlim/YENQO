// Homepage gold lot-size calculator and market-session clock. Runs only in the browser; nothing is sent anywhere.
export const GOLD_USD_PER_PIP_PER_LOT = 10; // XAUUSD: 100 oz contract, 1 pip = 0.10

/** Lots rounded DOWN to 0.01 so the loss at the stop never exceeds the chosen risk. */
export function goldLotSize(balance, riskPercent, stopPips) {
  if (![balance, riskPercent, stopPips].every((n) => Number.isFinite(n) && n > 0) || riskPercent > 100) return null;
  const risk = balance * riskPercent / 100;
  const lots = Math.floor(Math.round(risk / (stopPips * GOLD_USD_PER_PIP_PER_LOT) * 1e6) / 1e4) / 100;
  return { risk, lots, loss: lots * stopPips * GOLD_USD_PER_PIP_PER_LOT, pipValue: lots * GOLD_USD_PER_PIP_PER_LOT };
}

// shortcut: fixed UTC hours ignore daylight saving, so times can be 1 hour off in summer; label says "approximate".
/** @type {Array<[string, number, number]>} */
export const SESSIONS = [['Sydney', 21, 6], ['Tokyo', 0, 9], ['London', 8, 17], ['New York', 13, 22]];

export function sessionState(date) {
  const day = date.getUTCDay(), hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  // Week runs Sunday 21:00 to Friday 22:00 UTC; an overnight session opening on Friday night belongs to Saturday, so it stays shut.
  const isOpen = (open, close) => open < close
    ? day >= 1 && day <= 5 && hour >= open && hour < close
    : (hour >= open && day >= 0 && day <= 4) || (hour < close && day >= 1 && day <= 5);
  return SESSIONS.map(([name, open, close]) => ({ name, open, close, isOpen: isOpen(open, close) }));
}

if (typeof document !== 'undefined') {
  const form = document.querySelector('[data-home-calc]');
  if (form instanceof HTMLFormElement) {
    const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    const out = (name) => /** @type {HTMLElement} */ (form.querySelector(`[data-out="${name}"]`));
    const input = (name) => /** @type {HTMLInputElement} */ (form.elements.namedItem(name));
    const update = () => {
      const r = goldLotSize(Number(input('balance').value), Number(input('risk').value), Number(input('stop').value));
      out('lots').textContent = r && r.lots >= 0.01 ? r.lots.toFixed(2) : '—';
      out('note').textContent = !r ?'Enter numbers above zero.' : r.lots < 0.01 ? `Your risk of ${money(r.risk)} is below the smallest trade (0.01 lots). Use a wider budget or a smaller stop.` : `If the stop is hit you lose about ${money(r.loss)}. Each pip is worth ${money(r.pipValue)} at this size.`;
    };
    form.addEventListener('input', update);
    form.addEventListener('submit', (e) => e.preventDefault());
    form.querySelectorAll('button[data-risk]').forEach((b) => b.addEventListener('click', () => { input('risk').value = /** @type {HTMLButtonElement} */ (b).dataset.risk ?? ''; update(); }));
    update();
  }
  const list = document.querySelector('[data-home-sessions]');
  if (list instanceof HTMLElement) {
    const time = (utcHour) => { const d = new Date(); d.setUTCHours(utcHour, 0, 0, 0); return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
    const draw = () => list.replaceChildren(...sessionState(new Date()).map((s) => {
      const li = document.createElement('li');
      li.className = s.isOpen ? 'is-open' : '';
      li.innerHTML = '<strong></strong><span></span><em></em>';
      li.children[0].textContent = s.name;
      li.children[1].textContent = `${time(s.open)} – ${time(s.close)}`;
      li.children[2].textContent = s.isOpen ? 'Open now' : 'Closed';
      return li;
    }));
    draw();
    window.setInterval(draw, 60000);
  }
}
