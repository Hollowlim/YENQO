// Real, administrator-scoped operations records. No market/account simulations.
(() => {
  const root = document.querySelector('[data-admin-dashboard]');
  if (!(root instanceof HTMLElement)) return;
  const dashboard = root;
  const status = root.querySelector('[data-admin-source]');
  const number = new Intl.NumberFormat('en-MY');
  const date = value => new Intl.DateTimeFormat('en-MY',{timeZone:'Asia/Kuala_Lumpur',dateStyle:'medium'}).format(new Date(value));
  const make = (tag,text='',className='') => { const node = document.createElement(tag);node.textContent=text;node.className=className;return node; };
  const svgNode = (tag,attributes={}) => { const node = document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));return node; };
  let days = 30, loading = false, hasData = false;
  const metricLabels = {totalMembers:'Total members',activeMembers30d:'Signed in / 30 days',verifiedMembers:'Verified access',pendingMemberships:'Awaiting review',publishedAnalysis:'Published analysis',publishedSignals:'Published signals',publishedLessons:'Published lessons',pendingModeration:'Open community reports'};
  const say = text => { if(status)status.textContent=text; };

  function renderGrowth(rows) {
    const host = root?.querySelector('[data-admin-growth]');if(!host)return;
    host.replaceChildren();
    const chart=svgNode('svg',{viewBox:'0 0 780 245',role:'img','aria-label':`Total registered members over the last ${days} days, from stored registrations`});
    const max=Math.max(4,Math.ceil(Math.max(0,...rows.map(row=>row.total))/4)*4);
    for(let i=0;i<=4;i++){
      const y=35+i*39;
      chart.append(svgNode('line',{x1:55,y1:y,x2:755,y2:y,stroke:'#a66bff20'}));
      const label=svgNode('text',{x:44,y:y+4,'text-anchor':'end',fill:'#97a2a9'});label.textContent=number.format(Math.round(max*(1-i/4)));chart.append(label);
    }
    const coords=rows.map((row,i)=>[55+i/Math.max(1,rows.length-1)*700,191-row.total/max*156]);
    if(coords.length){
      const path=coords.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
      chart.append(svgNode('path',{d:`${path} L755 191 L55 191 Z`,fill:'#a66bff18'}));
      chart.append(svgNode('path',{d:path,fill:'none',stroke:'#ab6bff','stroke-width':2.5,'stroke-linejoin':'round'}));
      const [x,y]=coords[coords.length-1];chart.append(svgNode('circle',{cx:x,cy:y,r:4,fill:'#b983ff'}));
      for(const index of [...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])]){
        const label=svgNode('text',{x:coords[index][0],y:220,'text-anchor':index===0?'start':index===rows.length-1?'end':'middle',fill:'#97a2a9'});
        label.textContent=new Intl.DateTimeFormat('en-MY',{day:'numeric',month:'short',timeZone:'Asia/Kuala_Lumpur'}).format(new Date(`${rows[index].date}T12:00:00Z`));chart.append(label);
      }
    }
    host.append(chart);
    const summary=make('p',rows.length?`${number.format(rows.reduce((sum,row)=>sum+row.registrations,0))} registrations in this window. ${number.format(rows[rows.length-1].total)} members in total.`:'No registrations available.','v6-data-note');host.append(summary);
  }

  function renderDistribution(items) {
    const host=root?.querySelector('[data-admin-distribution]');if(!host)return;
    host.replaceChildren();
    const total=items.reduce((sum,item)=>sum+item.count,0), colors=['#ab6bff','#5e98c9','#5cbca0','#bf7780','#77818d'];
    const svg=svgNode('svg',{viewBox:'0 0 200 200',role:'img','aria-label':total?'Membership access distribution from current records':'No registered members'});
    svg.append(svgNode('circle',{cx:100,cy:100,r:73,fill:'none',stroke:'#231537','stroke-width':24}));
    let offset=0;const circumference=2*Math.PI*73;
    items.forEach((item,i)=>{
      if(item.count&&total){const length=item.count/total*circumference;svg.append(svgNode('circle',{cx:100,cy:100,r:73,fill:'none',stroke:colors[i%colors.length],'stroke-width':24,'stroke-dasharray':`${length} ${circumference-length}`,'stroke-dashoffset':-offset,transform:'rotate(-90 100 100)'}));offset+=length;}
    });
    const count=svgNode('text',{x:100,y:99,'text-anchor':'middle',fill:'#dec5ff','font-size':25});count.textContent=number.format(total);
    const label=svgNode('text',{x:100,y:121,'text-anchor':'middle',fill:'#97a2a9','font-size':11});label.textContent='members';svg.append(count,label);
    const legend=make('ul','','v6-distribution-legend');items.forEach((item,i)=>{const row=make('li');const marker=make('i','',`v6-chart-key v6-chart-key-${i}`);marker.setAttribute('aria-hidden','true');row.append(marker,make('span',item.label),make('strong',number.format(item.count)));legend.append(row);});host.append(svg,legend);
  }

  function renderActivity(items) {
    const host=root?.querySelector('[data-admin-activity]');if(!host)return;host.replaceChildren();
    const labels={AUTH_REGISTER:'Member registered',MEMBERSHIP_APPROVED:'Membership approved',MEMBERSHIP_REVOKED:'Membership revoked',MEMBERSHIP_REJECTED:'Membership declined',MEMBERSHIP_REQUESTED:'Verification requested',DAILY_PLAN_SAVED:'Daily analysis saved',MANUAL_SIGNAL_SAVED:'Signal saved',VIDEO_LESSON_SAVED:'Academy lesson saved',VIDEO_LESSON_UPLOADED:'Lesson video uploaded',COMMUNITY_MESSAGE_HIDDEN:'Community message moderated',COMMUNITY_MESSAGE_REMOVED:'Community message removed'};
    for(const item of items){const row=make('li');row.append(make('span','', 'v6-activity-dot'),make('strong',labels[item.action]??'Administrative event'),make('time',date(item.createdAt)));host.append(row);}
    if(!items.length)host.append(make('li','No recorded activity yet.','v6-empty'));
  }

  function renderMembers(items) {
    const host=root?.querySelector('[data-admin-recent-members]');if(!host)return;host.replaceChildren();
    for(const item of items){const row=make('tr');const name=make('td');name.append(make('strong',item.name),make('small',item.email));const state=make('td');state.append(make('span',item.status,'v6-status-tag'));row.append(name,state,make('td',date(item.createdAt)),make('td',item.lastLoginAt?date(item.lastLoginAt):'Not recorded'));host.append(row);}
    if(!items.length){const row=make('tr'),cell=make('td','No members have registered yet.','v6-empty');cell.setAttribute('colspan','4');row.append(cell);host.append(row);}
  }

  function renderServices(items) {
    const host=root?.querySelector('[data-admin-services]');if(!host)return;host.replaceChildren();
    for(const item of items){const row=make('li');const copy=make('div');copy.append(make('strong',item.name),make('small',item.detail));row.append(copy,make('span',item.status,`v6-status-tag ${['Responding','Confirmed','Connected'].includes(item.status)?'v6-status-confirmed':'v6-status-muted'}`));host.append(row);}
  }

  async function load() {
    if(loading)return;loading=true;root?.setAttribute('aria-busy','true');dashboard.dataset.adminState='loading';say('Loading operations data…');
    root?.querySelectorAll('[data-admin-period], [data-admin-refresh]').forEach(node=>{/** @type {HTMLButtonElement} */(node).disabled=true;});
    try {
      const response=await fetch(`/api/admin/dashboard?days=${days}`,{headers:{Accept:'application/json'}});
      const data=await response.json();if(!response.ok)throw new Error(data.message??'Unable to load operations data.');
      for(const key of Object.keys(metricLabels)){const target=root?.querySelector(`[data-admin-metric="${key}"]`);if(target)target.textContent=number.format(data.metrics[key]);}
      renderGrowth(data.growth);renderDistribution(data.distribution);renderActivity(data.activity);renderMembers(data.recentMembers);renderServices(data.services);
      hasData=true;dashboard.dataset.adminState='ready';
      say(`Source: application database · Updated ${new Intl.DateTimeFormat('en-MY',{timeZone:'Asia/Kuala_Lumpur',dateStyle:'medium',timeStyle:'short'}).format(new Date(data.asOf))} MYT`);
      root?.querySelectorAll('[data-admin-period]').forEach(button=>button.setAttribute('aria-pressed',String(Number(/** @type {HTMLElement} */(button).dataset.adminPeriod)===days)));
    } catch(error){dashboard.dataset.adminState='error';say((error instanceof Error?error.message:'Operations data is unavailable.')+(hasData?' Previous values may be stale; refresh again before acting.':''));}
    finally{loading=false;root?.setAttribute('aria-busy','false');root?.querySelectorAll('[data-admin-period], [data-admin-refresh]').forEach(node=>{/** @type {HTMLButtonElement} */(node).disabled=false;});}
  }
  root.querySelectorAll('[data-admin-period]').forEach(button=>button.addEventListener('click',()=>{days=Number(/** @type {HTMLElement} */(button).dataset.adminPeriod);void load();}));
  root.querySelector('[data-admin-refresh]')?.addEventListener('click',()=>{void load();});
  if(document.documentElement.dataset.offlinePreview==='true'){
    dashboard.dataset.adminState='offline';
    say('Offline layout preview · Sign in through the local server to load actual records.');
    root.querySelectorAll('[data-admin-period], [data-admin-refresh]').forEach(node=>{/** @type {HTMLButtonElement} */(node).disabled=true;});return;
  }
  void load();
})();
