// Membership: pay for a plan with USDT (TRC20). The server confirms the payment on-chain.
(() => {
  const found = document.querySelector('[data-usdt-panel]');
  if (!(found instanceof HTMLElement)) return;
  const panel = found;
  const $ = (/** @type {string} */ selector) => /** @type {HTMLElement} */ (document.querySelector(selector));
  const result = $('[data-usdt-result]');
  const buttons = [...document.querySelectorAll('[data-usdt-plan]')];
  let current = { amount: '', wallet: '' };
  const call = async (/** @type {string} */ url, /** @type {object|undefined} */ body = undefined) => {
    const response = await fetch(url, { method: body ? 'POST' : 'GET', credentials: 'same-origin', ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) }).catch(() => null);
    return response ? await response.json().catch(() => ({})) : { message: 'Network error. Try again.' };
  };
  function show(/** @type {any} */ invoice, /** @type {string} */ wallet) {
    current = { amount: invoice.amount, wallet };
    $('[data-usdt-amount]').textContent = invoice.amount;
    $('[data-usdt-wallet]').textContent = wallet;
    $('[data-usdt-expires]').textContent = new Date(invoice.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    panel.hidden = false;
    panel.focus();
  }
  call('/api/payments/usdt').then(data => {
    if (!data.configured) {
      buttons.forEach(b => { /** @type {HTMLButtonElement} */ (b).disabled = true; });
      result.textContent = 'USDT payment is being set up. Check back soon.';
    } else if (data.invoice) show(data.invoice, data.wallet);
  });
  buttons.forEach(button => button.addEventListener('click', async () => {
    result.textContent = 'Creating your payment request…';
    const data = await call('/api/payments/usdt', { plan: /** @type {HTMLElement} */ (button).dataset.usdtPlan });
    if (data.invoice) { result.textContent = ''; show(data.invoice, data.wallet); } else result.textContent = data.message ?? 'Could not create a payment request.';
  }));
  document.querySelectorAll('[data-usdt-copy]').forEach(button => button.addEventListener('click', async () => {
    const key = /** @type {HTMLElement} */ (button).dataset.usdtCopy === 'wallet' ? 'wallet' : 'amount';
    await window.navigator.clipboard.writeText(current[key]).then(() => { result.textContent = key === 'wallet' ? 'Address copied.' : 'Amount copied.'; }, () => { result.textContent = 'Copy failed. Select the text instead.'; });
  }));
  $('[data-usdt-check]').addEventListener('click', async () => {
    result.textContent = 'Checking the Tron network…';
    const data = await call('/api/payments/usdt/check', {});
    result.textContent = data.message ?? 'Check failed. Try again.';
    if (data.paid) window.setTimeout(() => window.location.reload(), 1500);
  });
})();
