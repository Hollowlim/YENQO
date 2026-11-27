(() => {
  const form = /** @type {HTMLFormElement | null} */ (document.querySelector('[data-client-profile]'));
  const directory = document.querySelector('[data-client-directory]');
  if (!form && !directory) return;
  const status = document.querySelector('[data-profile-status]');
  const say = text => { if (status) status.textContent = text; };
  if (document.documentElement.dataset.offlinePreview === 'true') {
    document.querySelectorAll('[data-client-profile] input, [data-client-profile] button, [data-client-directory] input, [data-client-directory] button, [data-client-directory] select').forEach(node => { /** @type {HTMLInputElement} */ (node).disabled = true; });
    say('Offline preview. Sign in through the local server to view or save private client details.'); return;
  }
  const api = async (path, /** @type {object | undefined} */ data = undefined) => {
    const response = await fetch(path, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json(); if (!response.ok) throw new Error(result.message ?? 'Request failed.'); return result;
  };
  if (form) {
    let version = 0;
    let savedBroker = {};
    const setBusy = busy => { form.querySelectorAll('input,button').forEach(node => { /** @type {HTMLInputElement} */ (node).disabled = busy; }); };
    const load = async () => {
      setBusy(true);
      try { const result = await api('/api/profile'); version = result.profile.profileVersion;
        savedBroker = Object.fromEntries(['brokerName','mt5Account','mt5Server'].map(key => [key,result.profile[key] ?? '']));
        for (const name of ['name','brokerName','mt5Account','mt5Server']) { const field = form.elements.namedItem(name); if (field instanceof HTMLInputElement) field.value = result.profile[name] ?? ''; }
        say(form.hasAttribute('data-admin-profile') ? 'Update your own display name here. Your administrator permissions stay unchanged.' : 'Account details are client-provided. Saving them does not verify broker ownership.');
      } catch (error) { say(error instanceof Error ? error.message : 'Unable to load details.'); }
      finally { setBusy(false); }
    };
    form.querySelector('[data-profile-reload]')?.addEventListener('click', load);
    form.addEventListener('submit', async event => {
      event.preventDefault(); const data = Object.fromEntries(new FormData(form)); setBusy(true);
      try { const result = await api('/api/profile', { ...savedBroker, ...data, version }); version = result.profile.profileVersion;
        document.querySelectorAll('.profile strong, .v6-header-profile strong').forEach(node => { node.textContent = result.profile.name; });
        document.querySelectorAll('[data-profile-avatar]').forEach(node => { if (node instanceof HTMLElement) node.dataset.profileInitial = result.profile.name.slice(0,1); const initial = node.querySelector('[data-profile-initial]'); if(initial)initial.textContent = result.profile.name.slice(0,1); });
        document.dispatchEvent(new window.CustomEvent('profile:updated', { detail: { name: result.profile.name } }));
        if (result.reviewRequired) document.querySelectorAll('.profile small, .v6-header-profile small, [data-profile-card-role]').forEach(node => { node.textContent = 'Free member'; });
        say(result.reviewRequired ? 'Details saved. Your IB/deposit access now requires a new verification request because account details changed.' : form.hasAttribute('data-admin-profile') ? 'Profile saved.' : 'Account details saved. Your administrator can review them.');
      } catch (error) { say(error instanceof Error ? error.message : 'Unable to save details.'); }
      finally { setBusy(false); }
    }); void load();
  }
  if (directory) {
    const list = directory.querySelector('[data-client-list]'), search = /** @type {HTMLFormElement} */ (directory.querySelector('form'));
    const more = /** @type {HTMLButtonElement} */ (directory.querySelector('[data-client-more]'));
    const filter = /** @type {HTMLSelectElement | null} */ (directory.querySelector('[data-client-status-filter]'));
    const sort = /** @type {HTMLSelectElement | null} */ (directory.querySelector('[data-client-sort]'));
    const tableMode = list?.tagName === 'TBODY';
    let cursor = null, query = '', loading = false;
    /** @type {any[]} */
    let loaded = [];
    const el = (tag, text, className = '') => { const node = document.createElement(tag); node.textContent = text; node.className = className; return node; };
    const date = value => value && Number.isFinite(new Date(value).getTime()) ? new Intl.DateTimeFormat('en-MY',{timeZone:'Asia/Kuala_Lumpur',dateStyle:'medium'}).format(new Date(value)) : 'Not available';
    const render = () => {
      if(!list)return;list.replaceChildren();
      const rows = loaded.filter(client=>!filter || filter.value==='ALL' || (client.membership?.status??'FREE')===filter.value);
      rows.sort((a,b)=>sort?.value==='name'?a.name.localeCompare(b.name):sort?.value==='oldest'?String(a.createdAt).localeCompare(String(b.createdAt)):String(b.createdAt).localeCompare(String(a.createdAt)));
      for(const client of rows){
        const card = el(tableMode?'tr':'article', '', tableMode?'client-record v6-member-row':'card client-record');
        card.tabIndex=0;card.setAttribute('aria-label',`Review ${client.name}`);
        const openReview=()=>document.dispatchEvent(new window.CustomEvent('membership:open',{detail:{email:client.email,action:client.membership?.status==='APPROVED'?'revoke':'approve'}}));
        card.addEventListener('click',event=>{if(!(event.target instanceof window.Element)||!event.target.closest('button'))openReview();});
        card.addEventListener('keydown',event=>{if(event.target===card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openReview();}});
        const identity = el(tableMode?'td':'div','','v6-member-identity');identity.append(el('h3',client.name),el('p',client.email));
        const account=el(tableMode?'td':'div','','v6-member-account');account.append(el('strong',client.brokerName??'Broker not provided'),el('span',client.mt5Account??'MT5 not provided'),el('small',client.mt5Server??'Server not provided'));
        const membership=el(tableMode?'td':'div');membership.append(el('span',client.membership?.status??'FREE','v6-status-tag'));
        const joined=el(tableMode?'td':'div',date(client.createdAt));
        const actions=el(tableMode?'td':'div');const buttons=el('div','','client-membership-actions');
        for(const action of ['approve','revoke']){
          const button=/** @type {HTMLButtonElement} */(el('button',action==='approve'?'Approve':'Revoke','button button-outline'));button.type='button';
          button.disabled=action==='approve'?client.membership?.status==='APPROVED':client.membership?.status!=='APPROVED';
          button.addEventListener('click',()=>document.dispatchEvent(new window.CustomEvent('membership:open',{detail:{email:client.email,action}})));buttons.append(button);
        }
        actions.append(buttons);card.append(identity,account,membership,joined,actions);list.append(card);
      }
      if(!rows.length){const empty=el(tableMode?'tr':'div');const text=el(tableMode?'td':'p',loaded.length?'No loaded clients match this review filter.':'No matching clients.','v6-empty');if(tableMode)text.setAttribute('colspan','5');empty.append(text);list.append(empty);}
      say(`Showing ${rows.length} of ${loaded.length} loaded clients. Full account numbers are visible only to the client and administrators.`);
    };
    const load = async (append = false) => {
      if (loading) return; loading = true; more.disabled = true;
      directory.setAttribute('aria-busy','true');
      search.querySelectorAll('input,button').forEach(node=>{/** @type {HTMLInputElement} */(node).disabled=true;});
      say(append?'Loading more clients…':'Loading client records…');
      try {
        const params = new URLSearchParams({ search: query }); if (append && cursor) params.set('before', cursor);
        const data = await api('/api/admin/clients?' + params);
        loaded = append ? [...loaded,...data.clients] : data.clients;
        render();
        cursor = data.nextCursor; more.hidden = !cursor;
        document.dispatchEvent(new window.Event('cards:updated'));
      } catch (error) { say((error instanceof Error ? error.message : 'Unable to load clients.')+(loaded.length?' Previous loaded records may be stale.':'')); }
      finally { loading = false; more.disabled = false;directory.setAttribute('aria-busy','false');search.querySelectorAll('input,button').forEach(node=>{/** @type {HTMLInputElement} */(node).disabled=false;}); }
    };
    search.addEventListener('submit', event => { event.preventDefault(); query = String(new FormData(search).get('search') ?? '').trim(); void load(); });
    filter?.addEventListener('change',render);sort?.addEventListener('change',render);
    more.addEventListener('click', () => { void load(true); }); void load();
    document.addEventListener('memberships:updated', () => { void load(); });
  }
})();
