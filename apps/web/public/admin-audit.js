// Administrative event browsing; no raw details, account secrets or broker actions.
(() => {
  const root=document.querySelector('[data-admin-audit]');
  if(!(root instanceof HTMLElement))return;
  const host=root;
  const body=root.querySelector('[data-audit-events]');
  const status=root.querySelector('[data-audit-status]');
  const more=/** @type {HTMLButtonElement|null} */(root.querySelector('[data-audit-more]'));
  const refresh=/** @type {HTMLButtonElement|null} */(root.querySelector('[data-audit-refresh]'));
  let cursor=null,loading=false;
  const say=text=>{if(status)status.textContent=text;};
  const make=(tag,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;node.className=className;return node;};
  const empty=text=>{const row=make('tr'),cell=make('td',text,'v6-empty');cell.setAttribute('colspan','5');row.append(cell);body?.replaceChildren(row);};
  async function load(append=false){
    if(loading||!body)return;
    loading=true;host.setAttribute('aria-busy','true');if(more)more.disabled=true;if(refresh)refresh.disabled=true;say('Loading recorded administrative events…');
    try {
      const params=new URLSearchParams();if(append&&cursor)params.set('before',cursor);
      const response=await fetch('/api/admin/audit'+(params.size?'?'+params:''),{headers:{Accept:'application/json'}});
      const data=await response.json();if(!response.ok)throw new Error(data.message??'Unable to load administrative logs.');
      if(!append)body.replaceChildren();
      for(const item of data.items){
        const row=make('tr');const identifier=make('td');identifier.append(make('code',item.id));
        const action=make('td');action.append(make('strong',item.action));
        const timestamp=new Intl.DateTimeFormat('en-MY',{timeZone:'Asia/Kuala_Lumpur',dateStyle:'medium',timeStyle:'short'}).format(new Date(item.createdAt));
        row.append(identifier,action,make('td',timestamp),make('td',item.actorId??'System / deleted actor'),make('td',item.targetId??'Not applicable'));body.append(row);
      }
      if(!body.children.length)empty('No administrative events have been recorded yet.');
      cursor=data.nextCursor;if(more)more.hidden=!cursor;
      say(`Source: application database · Refreshed ${new Intl.DateTimeFormat('en-MY',{timeZone:'Asia/Kuala_Lumpur',dateStyle:'medium',timeStyle:'short'}).format(new Date(data.asOf))} MYT. Event details and secrets are excluded.`);
      host.dataset.auditState='ready';
    }catch(error){host.dataset.auditState='error';say((error instanceof Error?error.message:'Administrative logs are unavailable.')+' Previously loaded events may be stale.');}
    finally{loading=false;host.setAttribute('aria-busy','false');if(more)more.disabled=false;if(refresh)refresh.disabled=false;}
  }
  refresh?.addEventListener('click',()=>{void load();});more?.addEventListener('click',()=>{void load(true);});
  if(document.documentElement.dataset.offlinePreview==='true'){
    host.dataset.auditState='offline';if(refresh)refresh.disabled=true;if(more)more.hidden=true;
    empty('Private audit records require an authenticated administrator session.');
    say('Offline layout preview · No real administrative records are included.');return;
  }
  void load();
})();
