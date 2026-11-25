(() => {
  const rootCandidate = document.querySelector('[data-dashboard]'); if (!rootCandidate) return;
  const root=rootCandidate;
  const days = root.querySelector('[data-calendar-days]'), heading = root.querySelector('[data-calendar-month]');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = type => Number(parts.find(value => value.type === type)?.value);
  const today = { year: part('year'), month: part('month') - 1, day: part('day') };
  let year = today.year, month = today.month;
  let snapshot=null,loading=false,loadSequence=0,snapshotMonth='';
  const status=root.querySelector('[data-calendar-status]'),source=root.querySelector('[data-calendar-source]'),coverage=root.querySelector('[data-calendar-coverage]'),sync=root.querySelector('[data-calendar-sync]');
  const money=amount=>new Intl.NumberFormat('en-MY',{style:'currency',currency:snapshot?.connection?.currency??'USD'}).format(Number(amount));
  const inCoverage=key=>snapshotMonth&&key.startsWith(snapshotMonth)&&snapshot?.connection?.historyFrom&&snapshot?.connection?.historyTo&&new Date(key+'T00:00:00+08:00')>=new Date(snapshot.connection.historyFrom)&&new Date(key+'T00:00:00+08:00')<=new Date(snapshot.connection.historyTo);
  const formatter = new Intl.DateTimeFormat('en-MY', { timeZone: 'UTC', year: 'numeric', month: 'long' });
  const previous = /** @type {HTMLButtonElement} */ (root.querySelector('[data-calendar-previous]'));
  const next = /** @type {HTMLButtonElement} */ (root.querySelector('[data-calendar-next]'));
  const selectedDate = root.querySelector('[data-selected-date]'), summary = root.querySelector('[data-selected-summary]');
  function render() {
    if (!days || !heading) return;
    heading.textContent = formatter.format(new Date(Date.UTC(year, month, 1)));
    previous.disabled = year === 1900 && month === 0; next.disabled = year === 2100 && month === 11;
    const offset = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    days.replaceChildren();
    for (let index = 0; index < offset; index++) { const blank = document.createElement('div'); blank.className = 'pl-day-blank'; blank.setAttribute('aria-hidden', 'true'); days.append(blank); }
    for (let day = 1; day <= count; day++) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'pl-day';
      const date = new Date(Date.UTC(year, month, day));
      const label = new Intl.DateTimeFormat('en-MY', { timeZone: 'UTC', dateStyle: 'full' }).format(date);
      button.dataset.date = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const record=button.dataset.date.startsWith(snapshotMonth)&&snapshotMonth?snapshot?.days?.[button.dataset.date]:null;
      button.setAttribute('aria-label', `${label}: no recorded trades`); button.setAttribute('aria-pressed','false');
      const number = document.createElement('span'); number.className = 'pl-day-number'; number.textContent = String(day);
      const indicator = document.createElement('span'); indicator.className = 'pl-no-record'; indicator.textContent = '—'; indicator.setAttribute('aria-hidden','true'); button.append(number, indicator);
      if(record){indicator.className='pl-day-net';indicator.textContent=money(record.net);button.classList.add(Number(record.net)>0?'has-profit':Number(record.net)<0?'has-loss':'has-flat');button.setAttribute('aria-label',label+': '+money(record.net)+', '+record.executions+' trading executions');}
      else if(inCoverage(button.dataset.date)){indicator.textContent='No activity';button.setAttribute('aria-label',label+': no trading executions in synced history');}
      if (year === today.year && month === today.month && day === today.day) { button.classList.add('is-today'); button.setAttribute('aria-current','date'); }
      button.addEventListener('click', () => {
        days.querySelectorAll('button').forEach(day => { day.setAttribute('aria-pressed','false'); day.classList.remove('is-selected'); });
        button.setAttribute('aria-pressed','true'); button.classList.add('is-selected');
        if (selectedDate) selectedDate.textContent = label;
        if (summary) summary.textContent = record?`${money(record.net)} net across ${record.executions} trading executions. Includes trading commissions, fees and swap; excludes cash deposits and withdrawals.`:inCoverage(button.dataset.date)?'No trading executions recorded for this date in the saved history.':'No synced history is available for this date. P/L is unavailable.';
      });
      days.append(button);
    }
    if (selectedDate) selectedDate.textContent = 'Select a date';
    if (summary) summary.textContent = 'Choose a day to view its recorded trades and P/L.';
  }
  function move(delta) { const date = new Date(Date.UTC(year, month + delta, 1)); if (date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 2100) return; year = date.getUTCFullYear(); month = date.getUTCMonth(); render();void load(); }
  previous?.addEventListener('click', () => move(-1)); next?.addEventListener('click', () => move(1));
  root.querySelector('[data-calendar-today]')?.addEventListener('click', () => { year = today.year; month = today.month; render();void load(); });
  async function load(){
    if(document.documentElement.dataset.offlinePreview==='true')return;
    const sequence=++loadSequence;
    try{
      const response=await fetch(`/api/broker/calendar?month=${year}-${String(month+1).padStart(2,'0')}`,{cache:'no-store'}),data=await response.json();
      if(sequence!==loadSequence)return;if(!response.ok)throw new Error(data.message??'Broker history is unavailable.');snapshot=data;snapshotMonth=`${year}-${String(month+1).padStart(2,'0')}`;
      if(status)status.textContent=data.message??(data.stale?'Saved history may be stale. Use Sync history to refresh it.':'Saved read-only MT5 history snapshot from MetaApi.');
      if(source)source.textContent=data.connection?.lastSyncedAt?'MetaApi · MT5 snapshot':'No broker history synced';
      const monthSummary=root.querySelector('[data-calendar-month-summary]');if(monthSummary)monthSummary.textContent=data.connection?.lastSyncedAt?'Daily net trading cash flow from MetaApi history.':'No broker history synced yet.';
      if(coverage)coverage.textContent=data.connection?.lastSyncedAt?`Last sync: ${new Intl.DateTimeFormat('en-MY',{timeZone:'Asia/Kuala_Lumpur',dateStyle:'medium',timeStyle:'short'}).format(new Date(data.connection.lastSyncedAt))} MYT. ${data.basis??''}`:'No MetaApi history snapshot is available. Dates use MYT.';
      if(sync instanceof HTMLButtonElement)sync.disabled=!data.available||!data.connection?.canSync||loading;
      for(const node of root.querySelectorAll('[data-performance-metric]')){
        const key=/** @type {HTMLElement} */(node).dataset.performanceMetric,value=data.metrics?.[key??''];
        node.textContent=value==null?'—':key==='winRate'?Number(value).toFixed(1)+'%':money(value);node.setAttribute('aria-label',value==null?'No recorded data':node.textContent);
      }
      render();
    }catch(error){if(sequence===loadSequence&&status)status.textContent=(error instanceof Error?error.message:'Broker history is unavailable.')+(snapshot?.connection?.lastSyncedAt?' Previously shown results may be stale.':'');}
  }
  sync?.addEventListener('click',async()=>{
    if(loading||!snapshot?.connection)return;loading=true;if(sync instanceof HTMLButtonElement)sync.disabled=true;
    try{if(status)status.textContent='Syncing read-only broker history…';const response=await fetch('/api/broker/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:snapshot.connection.version})}),data=await response.json();if(!response.ok)throw new Error(data.message??'Sync unavailable.');await load();}
    catch(error){if(status)status.textContent=error instanceof Error?error.message:'Sync failed.';}
    finally{loading=false;if(sync instanceof HTMLButtonElement)sync.disabled=!snapshot?.available||!snapshot?.connection?.canSync;}
  });
  document.addEventListener('statement:imported',()=>{void load();});
  window.setInterval(()=>{if(!document.hidden&&!loading)void load();},60000);
  render();
  void load();
})();
