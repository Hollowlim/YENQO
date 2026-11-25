// V2 presentation and explicitly local simulations. Never submits trade commands.
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
  const offline = document.documentElement.dataset.offlinePreview === 'true';
  const clientView = document.body.dataset.clientView === 'true';
  // AnimatedContent-style reveals without React, GSAP or hiding content before JS.
  if ('IntersectionObserver' in window) {
    const reducedReveal=window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations=new Set();
    const revealObserver=new window.IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        revealObserver.unobserve(entry.target);
        if(reducedReveal.matches)continue;
        Array.from(entry.target.children).forEach((child,index)=>{
          if(!(child instanceof HTMLElement)||!child.animate)return;
          const animation=child.animate([{opacity:0,transform:'translateY(28px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:720,delay:Math.min(index,5)*80,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
          animations.add(animation);
          animation.finished.then(()=>animations.delete(animation),()=>animations.delete(animation));
        });
      }
    },{threshold:.08});
    document.querySelectorAll('[data-animated-content]').forEach(node=>revealObserver.observe(node));
    reducedReveal.addEventListener('change',()=>{if(reducedReveal.matches){for(const animation of animations)animation.cancel();animations.clear();}});
    window.addEventListener('pagehide',()=>{revealObserver.disconnect();for(const animation of animations)animation.cancel();animations.clear();});
  }
  const cinema = document.querySelector('[data-cinematic-home]');
  if (cinema) {
    const sequence = /** @type {HTMLElement} */ (cinema.querySelector('.cinema-sequence'));
    const stage = /** @type {HTMLElement} */ (cinema.querySelector('.cinema-stage'));
    const header = /** @type {HTMLElement} */ (cinema.querySelector('.cinema-header'));
    const logo = /** @type {HTMLElement} */ (cinema.querySelector('.cinema-logo-turntable'));
    const slides = Array.from(cinema.querySelectorAll('[data-cinema-chapter]'));
    const links = Array.from(cinema.querySelectorAll('.cinema-chapters a, .cinema-rail a, .cinema-stage-footer a'));
    const chapterCaption=cinema.querySelector('.cinema-stage-footer>span');
    const nextChapter=cinema.querySelector('.cinema-stage-footer a');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let scheduled = false;
    const dimensions = () => ({start: sequence.getBoundingClientRect().top + window.scrollY - header.clientHeight,range: Math.max(1,sequence.clientHeight-stage.clientHeight)});
    const update = () => {
      scheduled = false;
      if (!cinema.classList.contains('cinema-scroll-enabled')) return;
      const {start,range} = dimensions();
      const progress = Math.min(1,Math.max(0,(window.scrollY-start)/range));
      const phase = progress*(slides.length-1);
      const index = Math.min(slides.length-1,Math.max(0,Math.round(phase)));
      if(chapterCaption)chapterCaption.textContent=`0${index+1} / 04 · ${['VISION','TRADE MANAGER','EDUCATION','LEGACY'][index]}`;
      if(nextChapter){
        nextChapter.setAttribute('href',index<slides.length-1?`#${slides[index+1].id}`:'#cinema-features');
        nextChapter.textContent=index<slides.length-1?'NEXT CHAPTER ↓':'EXPLORE THE HUB ↓';
      }
      // Chapter stops always face forward; CSS gives each turn a full two seconds.
      // Repeated scroll events inside a chapter do not restart the spin.
      logo.style.setProperty('--cinema-turn',`${index*360}deg`);
      cinema.dispatchEvent(new window.CustomEvent('cinema:progress',{detail:{index,progress}}));
      cinema.setAttribute('data-chapter',String(index));
      slides.forEach((slide,i) => {
        slide.classList.toggle('is-current',i === index);
        if (i === index) slide.removeAttribute('inert'); else slide.setAttribute('inert','');
      });
      links.forEach(link => {
        if (link.getAttribute('href') === `#${slides[index].id}`) link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      });
    };
    const configure = () => {
      const enabled = !reduced.matches && window.innerHeight >= 740 && (window.innerWidth >= 360 || window.innerHeight >= 840);
      const entering = enabled && !cinema.classList.contains('cinema-scroll-enabled');
      if(entering)cinema.classList.remove('cinema-transition-ready');
      cinema.classList.toggle('cinema-scroll-enabled',enabled);
      if (!enabled) slides.forEach(slide => slide.removeAttribute('inert'));
      else update();
      if(entering)window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
        if(cinema.classList.contains('cinema-scroll-enabled'))cinema.classList.add('cinema-transition-ready');
      }));
    };
    links.forEach(link => link.addEventListener('click',event => {
      if (!cinema.classList.contains('cinema-scroll-enabled') || !(event instanceof window.MouseEvent) || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const index = slides.findIndex(slide => `#${slide.id}` === link.getAttribute('href'));
      if (index < 0) return;
      event.preventDefault();
      const {start,range} = dimensions();
      // Instant chapter selection avoids scrolling past several hidden focus targets.
      window.scrollTo({top:start+range*index/(slides.length-1),behavior:'instant'});
      update();
      const heading = slides[index].querySelector('h1,h2');
      if (heading instanceof HTMLElement) { heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true}); }
    }));
    window.addEventListener('scroll',() => {if (!scheduled) {scheduled=true;window.requestAnimationFrame(update);}},{passive:true});
    window.addEventListener('resize',configure,{passive:true});
    reduced.addEventListener('change',configure);configure();
  }
  document.querySelectorAll('[data-animated-notifications]').forEach(list => {
    const rows = Array.from(list.querySelectorAll('a'));
    const updateEdges = () => {
      list.classList.toggle('has-scroll-above',list.scrollTop > 2);
      list.classList.toggle('has-scroll-below',list.scrollTop + list.clientHeight < list.scrollHeight - 2);
    };
    list.addEventListener('scroll',updateEdges,{passive:true});
    window.addEventListener('resize',updateEdges,{passive:true});
    list.addEventListener('keydown',event => {
      if (!(event instanceof window.KeyboardEvent) || event.altKey || event.ctrlKey || event.metaKey) return;
      const index = rows.findIndex(row => row === document.activeElement);
      if (index < 0) return;
      const next = event.key === 'ArrowDown' ? Math.min(index+1,rows.length-1) : event.key === 'ArrowUp' ? Math.max(index-1,0) : event.key === 'Home' ? 0 : event.key === 'End' ? rows.length-1 : -1;
      if (next < 0) return;
      event.preventDefault();rows[next].focus();
    });
    updateEdges();
  });
  if (clientView) document.querySelectorAll('[data-v2-courses], [data-v2-social], [data-v2-signal-demo], [data-v2-local-form]').forEach(node => node.remove());
  const scope = document.body.dataset.demoScope || 'offline';
  const prefix = `yengfx-v2-demo:${scope}:`;
  const read = (key, fallback) => { try { const raw = window.localStorage.getItem(prefix + key); if (!raw || raw.length > 150000) return fallback; return JSON.parse(raw); } catch { return fallback; } };
  const save = (key, value) => { try { window.localStorage.setItem(prefix + key, JSON.stringify(value)); return true; } catch { toast('Browser storage is unavailable. Changes last for this page only.'); return false; } };
  const stamp = () => new Intl.DateTimeFormat('en-MY', { timeZone:'Asia/Kuala_Lumpur',hour:'2-digit',minute:'2-digit' }).format(new Date());
  let toastTimer;
  function toast(message) {
    let box = document.querySelector('[data-v2-toast]');
    if (!box) { box = document.createElement('div'); box.className = 'v2-toast'; box.setAttribute('data-v2-toast',''); box.setAttribute('role','status'); document.body.append(box); }
    box.textContent = message; box.removeAttribute('hidden'); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => box?.setAttribute('hidden',''),4500);
  }
  const metric = (name,value,sub) => `<div class="card v2-metric"><small>${name}</small><strong>${value}</strong><span>${sub}</span></div>`;
  const tile = (title,sub,action,extra='') => `<button type="button" class="v2-action ${extra}" data-demo-action="${action}"><strong>${title}</strong><small>${sub}</small></button>`;
  function dialog(title,body,onConfirm,label='Confirm simulation') {
    const modal = document.createElement('dialog'); modal.className = 'v2-dialog'; modal.setAttribute('aria-label', title);
    modal.innerHTML = `<h2>${esc(title)}</h2>${body}<div class="actions section-gap"><button class="button button-secondary" data-cancel>Cancel</button><button class="button button-gold" data-confirm>${label}</button></div><p role="status" data-result></p>`;
    document.body.append(modal);
    modal.querySelector('[data-cancel]')?.addEventListener('click',() => modal.close());
    modal.addEventListener('close',() => modal.remove());
    modal.querySelector('[data-confirm]')?.addEventListener('click',async event => {
      const button = /** @type {HTMLButtonElement} */ (event.currentTarget); button.disabled = true;
      try { await onConfirm(modal); modal.close(); } catch (error) { const result = modal.querySelector('[data-result]'); if (result) result.textContent = error instanceof Error ? error.message : 'Simulation failed.'; button.disabled = false; }
    });
    modal.showModal(); return modal;
  }
  const collapse = document.querySelector('[data-v2-collapse]');
  const syncSidebar = () => { const sidebar = document.querySelector('.sidebar'); const hidden = document.body.classList.contains('v2-sidebar-collapsed') && window.innerWidth >= 1200; if (sidebar instanceof HTMLElement) sidebar.inert = hidden; collapse?.setAttribute('aria-expanded',String(!hidden)); };
  collapse?.addEventListener('click',() => { document.body.classList.toggle('v2-sidebar-collapsed'); syncSidebar(); });
  window.addEventListener('resize',syncSidebar);

  const tradeElement = document.querySelector('[data-v2-trade]');
  if (tradeElement instanceof HTMLElement) {
    const trade = tradeElement;
    if (clientView) {
      trade.innerHTML = `<div class="v2-demo-note"><strong>EA NOT CONNECTED</strong><br>Your account information and positions will appear after a secure EA connection is available. Trading controls are unavailable until then.</div><div class="v2-metrics">${metric('Account balance','—','Awaiting EA connection')}${metric('Equity','—','Awaiting account snapshot')}${metric('Floating P/L','—','No position data')}${metric('Open positions','—','Not connected')}</div><section class="v2-terminal"><div class="v2-heading"><h2>YENQO <span class="v2-gold">Manager</span></h2><span class="v2-pill v2-pill-off">DISCONNECTED</span></div><fieldset disabled><legend>Trade controls · requires EA connection</legend><div class="v2-control-heading">PROTECT &amp; SECURE VOLUME</div><div class="v2-action-grid">${['Breakeven','BE +2 pips','Custom BE','Secure 25%','Secure 50%','Secure 75%','Secure 90%','De-risk','Trim positions','Cut SL','Cancel pending orders','Clear TP / SL'].map(title => `<button type="button" class="v2-action" disabled><strong>${title}</strong><small>EA connection required</small></button>`).join('')}</div><div class="v2-control-heading">TAKE PROFIT &amp; STOP LOSS</div><div class="v2-form-grid"><label>Value mode<select disabled><option>Exact price</option><option>Pips</option></select></label><label>TP value<input type="number" disabled placeholder="Not available"></label><label>SL value<input type="number" disabled placeholder="Not available"></label><button class="button button-secondary" disabled>Set TP</button><button class="button button-secondary" disabled>Set SL</button></div><button class="v2-hold" disabled>Close All<small>EA connection required</small></button></fieldset></section><section class="card v2-panel section-gap"><h2>Open positions</h2><p>No account is connected. No positions or prices are available.</p></section>`;
    }
    if (!clientView) {
    const model = /** @type {any} */ (globalThis).YengfxTradeDemo;
    let state = model.initial(), busy = false, mode = 'price', side = '', receipts = [];
    function renderTrade() {
      const volume = state.positions.reduce((n,p) => n + p.volume,0), pl = state.positions.reduce((n,p) => n + p.pl,0);
      const breakdown = ['BUY','SELL'].map(direction => { const rows = state.positions.filter(p => p.side === direction); const lots = rows.reduce((n,p) => n + p.volume,0); const average = lots ? (rows.reduce((n,p) => n + p.entry * p.volume,0) / lots).toFixed(2) : 'N/A'; return `${direction}: ${lots.toFixed(2)} lots ? average demo entry ${average}`; }).join('<br>');
      trade.innerHTML = `<div class="v2-demo-note"><strong>LOCAL SIMULATION ONLY</strong> · Synthetic account DEMO-001 · XAUUSD · 1 demo pip = $0.10 · Synthetic lot step 0.01. Nothing is sent to MT5. Example P/L is not broker-verified.</div><div class="v2-metrics">${metric('Demo account','DEMO-001','Not a broker account')}${metric('Demo open lots',volume.toFixed(2),'Synthetic eligible volume')}${metric('Demo positions',String(state.positions.length),'Simulated layers')}${metric('Example floating P/L',`$${pl.toFixed(2)}`,'Illustration, not performance')}</div><div class="v2-grid"><section class="v2-terminal"><div class="v2-heading"><h2>YENQO <span class="v2-gold">Manager</span></h2><span class="v2-pill">MT5 · DEMO</span></div><svg class="v2-chart" viewBox="0 0 600 120" role="img" aria-label="Decorative chart illustration, no market feed"><path d="M0 90H600M0 60H600M0 30H600" stroke="#35353d" stroke-dasharray="3 5"/><path d="M10 82 35 72 60 84 85 50 110 60 135 42 160 58 185 30 210 45 235 22 260 40 285 35 310 65 335 40 360 52 385 30 410 38 435 20 460 42 485 25 510 40 535 16 560 28 590 10" fill="none" stroke="#b79756" stroke-width="3"/></svg><div class="v2-chart-label">ILLUSTRATIVE · NO MARKET FEED</div><label class="field">Simulation scope<select data-demo-side><option value="">All demo BUY &amp; SELL</option value="BUY" ${side === 'BUY' ? 'selected' : ''}>BUY only</option><option value="SELL" ${side === 'SELL' ? 'selected' : ''}>SELL only</option></select></label><div class="v2-control-heading"><span>01 / PROTECT</span><span>MOVE STOP LOSS</span></div><div class="v2-action-grid">${tile('Breakeven','Profitable demo layers only','breakeven','v2-action-primary')}${tile('BE +2 pips','Synthetic buffer','be2')}${tile('Custom BE','Choose your pip buffer','be-custom')}${tile('Clear TP / SL','Remove demo stops and targets','clear')}</div><div class="v2-control-heading"><span>02 / SECURE VOLUME</span><span>NOT GUARANTEED PROFIT</span></div><div class="v2-action-grid">${[25,50,75,90].map(p => tile(`Secure ${p}%`,'Of eligible open volume',`secure-${p}`)).join('')}</div><div class="v2-control-heading"><span>03 / CUT RISK</span><span>EXPOSURE</span></div><div class="v2-action-grid">${tile('De-risk','Reduce demo volume by 50%','derisk')}${tile('Trim positions','Reduce eligible demo layers','trim')}${tile('Cut SL','Move SL by chosen pips','cut-sl')}${tile('Cancel pending','Remove synthetic pending orders','cancel-pending')}</div><div class="v2-control-heading"><span>04 / TAKE PROFIT &amp; STOP LOSS</span><span>CUSTOM VALUES</span></div><div class="v2-tabs"><button class="v2-tab" aria-pressed="${mode === 'price'}" data-tp-mode="price">Exact price</button><button class="v2-tab" aria-pressed="${mode === 'pips'}" data-tp-mode="pips">Pips</button></div><div class="v2-form-grid"><label>Take profit (${mode})<input data-tp-value type="number" min="0.01" step="0.01" placeholder="${mode === 'price' ? 'e.g. 3050.00' : 'e.g. 50'}"></label><label>Stop loss (${mode})<input data-sl-value type="number" min="0.01" step="0.01" placeholder="${mode === 'price' ? 'e.g. 2950.00' : 'e.g. 30'}"></label><button class="button button-secondary" data-demo-action="set-tp">Preview TP</button><button class="button button-secondary" data-demo-action="set-sl">Preview SL</button></div><div class="v2-demo-note">Destructive action: hold for 1.2 seconds, then review and confirm. Secure volume can include losing layers.</div><button class="v2-hold" data-hold-close>Hold to CLOSE ALL<small>1.2 seconds · then a second confirmation · DEMO</small></button></section><aside class="v2-stack"><section class="card v2-panel"><div class="v2-row"><h2>Account controls</h2><span class="v2-pill v2-pill-off">DISCONNECTED</span></div><p>This synthetic account is isolated from your membership MT5 account. No real account is paired.</p><p class="section-gap">Demo pending orders: ${state.pendingOrders}</p><p class="section-gap">${breakdown}</p><a class="button button-secondary section-gap" href="${offline ? 'devices.html' : '/app/mt5/devices'}">EA connection settings</a></section><section class="card v2-panel"><div class="v2-row"><h2>Simulation activity</h2><button class="button button-secondary" data-reset-demo>Reset demo</button></div><ul class="v2-activity">${receipts.length ? receipts.slice(-6).reverse().map(r => `<li><strong>${esc(r.action)} · ${esc(r.status)}</strong><small>${esc(r.when)} MYT · ${r.volume.toFixed(2)} lots · No broker ACK</small><small>${esc(r.id)}</small></li>`).join('') : '<li>No simulated commands yet.</li>'}</ul></section><section class="card v2-panel"><h2>Risk-first by design</h2><p>Secure percentages refer to eligible open lot volume. BUY highest entry first; SELL lowest entry first. Synthetic rounding does not validate a broker’s minimum-lot, stop, netting or execution rules.</p></section></aside></div><section class="card v2-panel"><h2>Demo positions</h2><p>All prices, layers and P/L below are synthetic examples.</p><div class="v2-table-wrap"><table class="v2-table"><thead><tr><th>Demo ticket</th><th>Side</th><th>Entry</th><th>Lots</th><th>SL</th><th>TP</th><th>Example P/L</th><th>Action</th></tr></thead><tbody>${state.positions.map(p => `<tr><td>${p.id}</td><td>${p.side}</td><td>${p.entry.toFixed(2)}</td><td>${p.volume.toFixed(2)}</td><td>${p.sl?.toFixed(2) ?? '—'}</td><td>${p.tp?.toFixed(2) ?? '—'}</td><td class="${p.pl >= 0 ? 'v2-positive' : 'v2-negative'}">${p.pl.toFixed(2)}</td><td><button class="button button-secondary" data-close-position="${p.id}">Close ${p.id}</button></td></tr>`).join('')}</tbody></table></div></section>`;
      trade.querySelector('[data-demo-side]')?.addEventListener('change', e => { side = /** @type {HTMLSelectElement} */ (e.target).value; });
      trade.querySelectorAll('[data-tp-mode]').forEach(button => button.addEventListener('click',() => { mode = button.getAttribute('data-tp-mode') ?? 'price'; renderTrade(); }));
      trade.querySelectorAll('[data-demo-action]').forEach(button => button.addEventListener('click',() => prepare(button.getAttribute('data-demo-action') ?? '')));
      trade.querySelectorAll('[data-close-position]').forEach(button => button.addEventListener('click',() => prepare('close-position',button.getAttribute('data-close-position'))));
      trade.querySelector('[data-reset-demo]')?.addEventListener('click',() => { if (busy) return; state = model.initial(); receipts = []; renderTrade(); toast('Synthetic account reset. Real accounts were not changed.'); });
      const hold = /** @type {HTMLButtonElement} */ (trade.querySelector('[data-hold-close]'));
      let timer = 0;
      const stop = () => { window.clearTimeout(timer); timer = 0; hold.classList.remove('is-holding'); };
      const start = () => { if (timer || busy || !state.positions.length) return; hold.classList.add('is-holding'); timer = window.setTimeout(() => { stop(); prepare('close-all'); },1200); };
      hold.addEventListener('pointerdown',e => { if (e.button !== 0) return; hold.setPointerCapture(e.pointerId); start(); });
      for (const event of ['pointerup','pointercancel','lostpointercapture','blur']) hold.addEventListener(event,stop);
      hold.addEventListener('pointerleave',stop);
      hold.addEventListener('pointermove',e => { const r = hold.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) stop(); });
      hold.addEventListener('keydown',e => { if ([' ','Enter'].includes(e.key)) { e.preventDefault(); if (!e.repeat) start(); } });
      hold.addEventListener('keyup',e => { if ([' ','Enter'].includes(e.key)) { e.preventDefault(); stop(); } });
      hold.disabled = !state.positions.length;
    }
    /** @param {string} action @param {string | null} positionId */
    function prepare(action,positionId = null) {
      if (busy) return;
      if (action === 'be-custom' || action === 'cut-sl') {
        dialog(action === 'be-custom' ? 'Custom breakeven buffer' : 'Cut stop loss', '<p>Simulation only. Enter the number of synthetic pips.</p><label class="field">Pip buffer<input type="number" min="0.1" max="10000" step="0.1" data-buffer required></label>',modal => { const value = Number(/** @type {HTMLInputElement} */ (modal.querySelector('[data-buffer]')).value); if (!Number.isFinite(value) || value <= 0 || value > 10000) throw new Error('Enter a positive pip buffer up to 10,000.'); window.setTimeout(() => preview(action === 'be-custom' ? 'breakeven' : 'cut-sl',{ value }),0); },'Review preview'); return;
      }
      const options = action.startsWith('secure-') ? { percent:Number(action.split('-')[1]) } : action === 'be2' ? { value:2 } : ['set-tp','set-sl'].includes(action) ? { value:Number(/** @type {HTMLInputElement} */ (trade.querySelector(action === 'set-tp' ? '[data-tp-value]' : '[data-sl-value]')).value),mode } : {};
      preview(action.startsWith('secure-') ? 'secure' : action === 'be2' ? 'breakeven' : action, { ...options,...(positionId ? { positionId } : {}) });
    }
    function preview(action,options) {
      let plan; try { plan = model.preview(state,action,{ side,...options },Date.now(),window.crypto.randomUUID()); } catch (error) { toast(error instanceof Error ? error.message : 'Unable to preview.'); return; }
      dialog('Review simulated command', `<p><strong>DEMO-001 / XAUUSD / no device connected</strong><br>Action: ${esc(action)} · Scope: ${esc(side || 'BUY & SELL')}<br>Projected closing volume: ${plan.volume.toFixed(2)} lots<br>Preview expires in 30 seconds. No execution request leaves this browser.</p><pre>${esc(JSON.stringify(plan.changes,null,2))}</pre><label class="field">Simulated result<select data-demo-outcome><option value="completed">Completed (simulation)</option><option value="rejected">Rejected (simulation)</option><option value="failed">Failed (simulation)</option></select></label>`,async modal => {
        if (busy) throw new Error('A simulation is already pending.');
        busy = true; const result = modal.querySelector('[data-result]'); if (result) result.textContent = 'SIMULATED_PENDING — no server queue or broker call.';
        const outcome = /** @type {HTMLSelectElement} */ (modal.querySelector('[data-demo-outcome]')).value;
        try {
          await new Promise(resolve => window.setTimeout(resolve,300));
          const confirmed = model.confirm(state,plan);
          if (outcome === 'completed') state = confirmed.state;
          else { state.revision++; state.used.push(plan.id); }
          receipts.push({ ...confirmed.receipt,status:outcome === 'completed' ? 'SIMULATED_COMPLETED' : outcome === 'rejected' ? 'SIMULATED_REJECTED' : 'SIMULATED_FAILED',when:stamp() });
          renderTrade(); toast(`SIMULATED_${outcome.toUpperCase()}. No broker operation occurred.`);
        } finally { busy = false; }
      },'Confirm simulation');
    }
    renderTrade();
    }
  }

  const chatElement = document.querySelector('[data-v2-chat]');
  if (chatElement instanceof HTMLElement) {
    const chat = chatElement;
    const names = { mentor:'Mentor Desk',lounge:'Legacy Member Lounge',support:'EA Technical Support',community:'Community room' };
    let thread = 'mentor', messages = read('chat',{});
    if (!messages || typeof messages !== 'object' || Array.isArray(messages)) messages = {};
    function renderChat() {
      const rows = Array.isArray(messages[thread]) ? messages[thread].filter(m => m && typeof m.text === 'string' && m.text.length <= 2000).slice(-80) : [];
      chat.innerHTML = `<div class="v2-demo-note">LOCAL CHAT PROTOTYPE · No mentor or support agent is online here. Messages are saved in this browser only. For actual member discussions use <a class="inline-link" href="${offline ? 'community.html' : '/app/community'}">Community</a>.</div><div class="v2-chat-layout"><nav class="v2-thread-list" aria-label="Demo chat rooms">${Object.entries(names).map(([id,name]) => `<button class="v2-thread" data-thread="${id}" aria-pressed="${id === thread}"><strong>${name}</strong><small>DEMO · OFFLINE${id === 'support' ? ' · Ticket draft' : ''}</small></button>`).join('')}</nav><section class="card v2-panel"><div class="v2-row"><h2>${names[thread]}</h2><span class="v2-pill v2-pill-off">NOT CONNECTED</span></div><div class="v2-chat-log" role="log" aria-label="Local demonstration messages"><div class="v2-bubble">This is a local ${esc(names[thread])} demonstration. No message is sent to another person.<small>Example system message · DEMO</small></div>${rows.map(m => `<div class="v2-bubble mine">${esc(m.text)}<small>${esc(m.time)} MYT · Saved locally, not delivered</small></div>`).join('')}</div><p role="status" data-demo-typing></p><form class="v2-chat-composer"><label class="field">Demo message<textarea name="message" maxlength="2000" required placeholder="Write a local demo message"></textarea></label><input type="file" accept="image/png,image/jpeg,image/webp" data-local-attachment hidden><button class="button button-secondary" type="button" data-demo-attach>+ Attachment</button><button class="button button-gold" type="submit">Send locally</button></form><button class="button button-secondary section-gap" data-clear-chat>Clear this demo conversation</button></section></div>`;
      chat.querySelectorAll('[data-thread]').forEach(button => button.addEventListener('click',() => { thread = button.getAttribute('data-thread') ?? 'mentor'; renderChat(); }));
      chat.querySelector('textarea')?.addEventListener('input',() => { const status = chat.querySelector('[data-demo-typing]'); if (status) status.textContent = 'You are composing locally · nobody else receives a typing indicator.'; });
      chat.querySelector('form')?.addEventListener('submit',event => { event.preventDefault(); const field = /** @type {HTMLTextAreaElement} */ (chat.querySelector('textarea')); const text = field.value.trim(); if (!text) return; messages[thread] = [...rows,{ text,time:stamp() }].slice(-80); save('chat',messages); renderChat(); });
      const attachment = chat.querySelector('[data-local-attachment]');
      chat.querySelector('[data-demo-attach]')?.addEventListener('click',() => { if (attachment instanceof HTMLInputElement) attachment.click(); });
      attachment?.addEventListener('change',() => { if (!(attachment instanceof HTMLInputElement)) return; const file = attachment.files?.[0]; if (!file) return; if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { toast('Choose a JPG, PNG or WebP image up to 5 MB.'); return; } const field = chat.querySelector('textarea'); if (field instanceof HTMLTextAreaElement) field.value = `${field.value} [Attachment preview: ${file.name.slice(0,120)}; file not uploaded]`.slice(0,2000); toast('Attachment filename added to local draft. No image was uploaded. Use Community for actual image sharing.'); });
      chat.querySelector('[data-clear-chat]')?.addEventListener('click',() => { messages[thread] = []; save('chat',messages); renderChat(); });
    }
    renderChat();
  }

  document.querySelectorAll('[data-v2-local-form]').forEach(root => {
    const form = root.querySelector('form'); if (!(form instanceof HTMLFormElement)) return;
    const key = root.getAttribute('data-v2-local-form') ?? 'draft';
    const saved = read(key,{});
    if (saved && typeof saved === 'object') for (const input of form.querySelectorAll('input,textarea,select')) if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) { if (typeof saved[input.name] === 'string') input.value = saved[input.name].slice(0,5000); }
    form.addEventListener('submit',event => { event.preventDefault(); const data = Object.fromEntries(new FormData(form)); const ok = save(key,data); const status = root.querySelector('[role=status]'); if (status) status.textContent = ok ? 'Prototype draft saved in this browser only. No backtest or server operation was run.' : 'Storage unavailable. This draft has not been saved.'; });
    root.querySelector('[data-v2-demo-info]')?.addEventListener('click',() => dialog('No verified backtest available','<p>Research settings are a local draft. No historical dataset, execution engine or validated results are connected. Win rate, drawdown, equity curve and profit factor stay unavailable.</p>',() => {},'Understood'));
  });

  const courses = document.querySelector('[data-v2-courses]');
  if (courses instanceof HTMLElement) {
    const list = [ ['snr','SNR / SBR / RBS','Body-based zones and higher-timeframe context.'],['structure','BOS & CHOCH','Structure, supply and demand, trendlines and Fibonacci.'],['risk','Risk & psychology','Sizing, risk discipline and XAUUSD mapping preparation.'] ];
    let completed = read('courses',[]); if (!Array.isArray(completed)) completed = [];
    const render = () => { courses.innerHTML = `<div class="v2-demo-note">CURRICULUM PREVIEW · These study cards are not published video courses. Completion is local demo progress only; actual videos remain in the lesson library below.</div><p>Local demo progress: ${list.filter(([id]) => completed.includes(id)).length} / ${list.length}</p><progress class="v2-progress" max="3" value="${list.filter(([id]) => completed.includes(id)).length}" aria-label="Local demo learning progress"></progress><div class="v2-course-grid">${list.map(([id,title,description],index) => `<article class="card v2-course"><span class="eyebrow">STUDY PATH / 0${index + 1}</span><strong>${title}</strong><p>${description}</p><a class="inline-link" href="${offline ? ['lesson-market-structure.html','lesson-market-structure.html','lesson-risk-and-discipline.html'][index] : ['/app/academy/market-structure','/app/academy/market-structure','/app/academy/risk-and-discipline'][index]}">Study details</a><button class="button button-secondary" data-course="${id}" aria-pressed="${completed.includes(id)}">${completed.includes(id) ? 'Undo demo completion' : 'Mark demo complete'}: ${title}</button></article>`).join('')}</div>`; courses.querySelectorAll('[data-course]').forEach(button => button.addEventListener('click',() => { const id = button.getAttribute('data-course'); completed = completed.includes(id) ? completed.filter(v => v !== id) : [...completed,id]; save('courses',completed); render(); })); }; render();
  }

  const summary = document.querySelector('[data-v2-summary]');
  if (summary instanceof HTMLElement) {
    if (offline) summary.textContent = 'Offline preview. Open the server to load actual published content.';
    else Promise.allSettled(['/api/content/signals','/api/content/analysis'].map(async url => { const response = await fetch(url); if (!response.ok) throw new Error('Unavailable'); return response.json(); })).then(results => {
      summary.replaceChildren();
      for (const [index,result] of results.entries()) { const p = document.createElement('p'); p.textContent = result.status === 'fulfilled' ? `${index === 0 ? 'Signals' : 'Daily mapping'}: ${result.value.items.length ? `${result.value.items.length} published items available. Open the module to read the latest revision.` : 'No published items yet.'}` : `${index === 0 ? 'Signals' : 'Daily mapping'} temporarily unavailable. Open the module to retry.`; summary.append(p); }
    });
  }
  const demoFeed = document.querySelector('[data-v2-social]');
  if (demoFeed instanceof HTMLElement) {
    let posts = read('social',[]); if (!Array.isArray(posts)) posts = []; posts = posts.filter(p => p && typeof p.text === 'string' && p.text.length <= 1500).slice(-20).map(p => ({ ...p, comments: Array.isArray(p.comments) ? p.comments.filter(c => typeof c === 'string' && c.length <= 1000).slice(-20) : [] }));
    const render = () => { const expanded = demoFeed.querySelector('details')?.open ?? false; const active = document.activeElement; const focusAttribute = ['data-like','data-comment','data-topic'].find(name => active?.hasAttribute(name)); const focusValue = focusAttribute ? active?.getAttribute(focusAttribute) : null; demoFeed.innerHTML = `<details><summary>Explore local Community feed prototype</summary><div class="v2-demo-note">LOCAL SOCIAL DEMO · Separate from real Community. Posts, likes and comments here never reach other users.</div><div class="v2-tabs">${['All','Mapping','Questions','Mentor announcements'].map(v => `<button class="v2-tab" data-topic="${v}" aria-pressed="false">${v}</button>`).join('')}</div><form class="form-stack"><label class="field">Local demo post<textarea name="text" maxlength="1500" required></textarea></label><button class="button button-secondary">Create demo post</button></form><div data-demo-posts>${posts.slice(-20).reverse().map((p,i) => `<article class="card v2-panel section-gap"><span class="eyebrow">LOCAL DEMO / ${esc(p.topic ?? 'Mapping')}</span><p>${esc(p.text)}</p><button class="button button-secondary" data-like="${posts.length-1-i}">Like (${p.liked ? 1 : 0})</button><button class="button button-secondary" data-comment="${posts.length-1-i}">Comment</button><button class="button button-secondary" data-report-demo>Report</button>${Array.isArray(p.comments) ? p.comments.map(c => `<p class="section-gap">Local comment: ${esc(c)}</p>`).join('') : ''}</article>`).join('')}</div></details>`;
      demoFeed.querySelector('form')?.addEventListener('submit',e => { e.preventDefault(); const field = /** @type {HTMLTextAreaElement} */ (demoFeed.querySelector('textarea')); if (!field.value.trim()) return; posts.push({ text:field.value.trim(),liked:false,comments:[],topic:'Mapping' }); posts = posts.slice(-20); save('social',posts); render(); });
      demoFeed.querySelectorAll('[data-like]').forEach(b => b.addEventListener('click',() => { const i = Number(b.getAttribute('data-like')); posts[i].liked = !posts[i].liked; save('social',posts); render(); }));
      demoFeed.querySelectorAll('[data-comment]').forEach(b => b.addEventListener('click',() => dialog('Local demo comment','<label class="field">Comment<textarea maxlength="1000" data-comment-text required></textarea></label><p>Saved locally only.</p>',m => { const text = /** @type {HTMLTextAreaElement} */ (m.querySelector('[data-comment-text]')).value.trim(); if (!text) throw new Error('Write a comment.'); const i = Number(b.getAttribute('data-comment')); posts[i].comments = [...(posts[i].comments ?? []),text].slice(-20); save('social',posts); render(); },'Save local comment')));
      demoFeed.querySelectorAll('[data-report-demo]').forEach(b => b.addEventListener('click',() => toast('Demo report only. Use Report on a real Community message to notify administrators.')));
      demoFeed.querySelectorAll('[data-topic]').forEach(b => b.addEventListener('click',() => { demoFeed.querySelectorAll('[data-topic]').forEach(t => t.setAttribute('aria-pressed',String(t === b))); const topic = b.getAttribute('data-topic'); demoFeed.querySelectorAll('[data-demo-posts] article').forEach(article => { if (article instanceof HTMLElement) article.hidden = topic !== 'All' && !article.textContent?.includes(topic ?? ''); }); }));
      const details = demoFeed.querySelector('details'); if (details) details.open = expanded;
      if (focusAttribute && focusValue !== null) [...demoFeed.querySelectorAll('button')].find(b => b.getAttribute(focusAttribute) === focusValue)?.focus();
    }; render();
  }
})();
