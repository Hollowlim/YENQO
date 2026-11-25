// Pure in-memory demonstration. No networking, account identifiers or broker adapter.
(() => {
  const copy = value => JSON.parse(JSON.stringify(value));
  const units = value => Math.round(value * 100);
  const initial = () => ({ connected: false, revision: 0, pendingOrders: 2, used: [], positions: [
    { id: 'DEMO-B1', side: 'BUY', entry: 2980, volume: .03, pl: 12, sl: 2960, tp: null },
    { id: 'DEMO-B2', side: 'BUY', entry: 3010, volume: .01, pl: -4, sl: 2960, tp: null },
    { id: 'DEMO-S1', side: 'SELL', entry: 3000, volume: .02, pl: 5, sl: 3020, tp: null },
    { id: 'DEMO-S2', side: 'SELL', entry: 2970, volume: .02, pl: -6, sl: 3020, tp: null },
  ] });
  function preview(state, action, options = {}, now = Date.now(), id = 'demo') {
    const allowed = ['secure','close-position','close-all','breakeven','set-tp','set-sl','clear','derisk','trim','cut-sl','cancel-pending'];
    if (!allowed.includes(action)) throw new Error('Unknown simulation action.');
    const target = state.positions.filter(p => (!options.side || p.side === options.side) && (!options.positionId || p.id === options.positionId));
    if (!target.length && action !== 'cancel-pending') throw new Error('No eligible demo positions. Reset the simulation.');
    if (options.side && !['BUY','SELL'].includes(options.side)) throw new Error('Invalid side.');
    const changes = [];
    if (['secure','derisk','trim','close-position','close-all'].includes(action)) {
      const total = target.reduce((sum, p) => sum + units(p.volume), 0);
      let budget = ['close-position','close-all'].includes(action) ? total : action === 'trim' ? units(target[0].volume) : Math.floor(total * (action === 'derisk' ? 50 : options.percent) / 100);
      if (action === 'secure' && ![25,50,75,90].includes(options.percent)) throw new Error('Choose 25, 50, 75 or 90%.');
      if (budget < 1) throw new Error('Target below the synthetic 0.01 lot step. No volume changed.');
      const sorted = [...target].sort((a,b) => a.side.localeCompare(b.side) || (a.side === 'BUY' ? b.entry - a.entry : a.entry - b.entry));
      for (const p of sorted) { const close = Math.min(budget, units(p.volume)); if (close > 0) { changes.push({ id: p.id, close: close / 100 }); budget -= close; } }
    } else if (action !== 'cancel-pending') {
      const value = options.value ?? 0;
      if (['set-tp','set-sl','cut-sl'].includes(action) && (!Number.isFinite(value) || value <= 0 || value > 1000000)) throw new Error('Enter a positive finite value up to 1,000,000.');
      if (['set-tp','set-sl'].includes(action) && !['price','pips'].includes(options.mode)) throw new Error('Choose price or pips.');
      if (action === 'breakeven' && (!Number.isFinite(value) || value < 0 || value > 10000)) throw new Error('Invalid breakeven buffer.');
      for (const p of target) {
        const direction = p.side === 'BUY' ? 1 : -1;
        if (action === 'clear') changes.push({ id: p.id, sl: null, tp: null });
        else if (action === 'breakeven') {
          if (p.pl > 0) changes.push({ id: p.id, sl: Number((p.entry + direction * value * .1).toFixed(2)) });
        } else if (action === 'cut-sl') {
          if (p.sl !== null) changes.push({ id: p.id, sl: Number((p.sl + direction * value * .1).toFixed(2)) });
        } else {
          const price = options.mode === 'price' ? value : p.entry + direction * (action === 'set-tp' ? 1 : -1) * value * .1;
          if (price <= 0 || !Number.isFinite(price)) throw new Error('Calculated price is invalid.');
          changes.push({ id: p.id, [action === 'set-tp' ? 'tp' : 'sl']: Number(price.toFixed(2)) });
        }
      }
      if (!changes.length) throw new Error('No eligible profitable demo layers or stop levels.');
    }
    return { id, action, revision: state.revision, expiresAt: now + 30000, changes, volume: Number(changes.reduce((n,p) => n + (p.close ?? 0),0).toFixed(2)), demo: true };
  }
  function confirm(state, plan, now = Date.now()) {
    if (!plan.demo || plan.revision !== state.revision || now > plan.expiresAt || state.used.includes(plan.id)) throw new Error('Preview expired or already used. Preview again.');
    const next = copy(state);
    next.positions = next.positions.flatMap(p => {
      const change = plan.changes.find(item => item.id === p.id);
      if (!change) return [p];
      if (change.close) { const remaining = units(p.volume) - units(change.close); return remaining > 0 ? [{ ...p, volume: remaining / 100, pl: p.pl * remaining / units(p.volume) }] : []; }
      const { id: _id, ...fields } = change; void _id; return [{ ...p, ...fields }];
    });
    if (plan.action === 'cancel-pending') next.pendingOrders = 0;
    next.revision++; next.used.push(plan.id);
    return { state: next, receipt: { id: plan.id, action: plan.action, volume: plan.volume, status: 'SIMULATED_COMPLETED', brokerAcknowledged: false } };
  }
  Object.defineProperty(globalThis, 'YengfxTradeDemo', { value: { initial, preview, confirm }, configurable: true });
})();
