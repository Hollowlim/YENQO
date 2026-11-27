// Own-account connection only. Never persist passwords in browser storage.
(() => {
 const root=document.querySelector('[data-broker-connection]');if(!(root instanceof HTMLElement))return;
 const formCandidate=root.querySelector('[data-broker-form]'),message=root.querySelector('[data-broker-message]'),state=root.querySelector('[data-broker-state]'),stamp=root.querySelector('[data-broker-last-sync]');
 if(!(formCandidate instanceof HTMLFormElement))return;
 const form=formCandidate;
 const sync=root.querySelector('[data-broker-sync]'),remove=root.querySelector('[data-broker-disconnect]'),toggle=root.querySelector('[data-investor-toggle]');
 const profileForm=document.querySelector('[data-client-profile]'),serverChoice=form.querySelector('[data-broker-server-choice]'),saveServer=root.querySelector('[data-broker-save-server]'),serverHelp=root.querySelector('[data-broker-server-help]'),serverStatus=root.querySelector('[data-broker-server-status]');
 const serverActions=root.querySelector('[data-broker-server-actions]');
 let connection=null,available=false,entitled=false,loading=false,requestKey='';
 let savedProfile=null,serverDirty=false,serverCatalog=null;
 const say=text=>{if(message)message.textContent=text;};
 const api=async(path,method='GET',data=undefined)=>{const response=await fetch(path,{method,cache:'no-store',...(data?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});const body=await response.json();if(!response.ok)throw new Error(body.message??'Broker connection is unavailable.');return body;};
 const isJustMarkets=value=>/^(JUSTMARKETS?|JUSTGLOBALMARKETS(?:LTD|LIMITED)?)$/.test(String(value??'').toUpperCase().replace(/[^A-Z]/g,''));
 function profileSuggestions(){
  const list=document.querySelector('#mt5-server-suggestions');if(!list||!(profileForm instanceof HTMLFormElement))return;
  const broker=profileForm.elements.namedItem('brokerName');list.replaceChildren();
  if(!(broker instanceof HTMLInputElement)||!isJustMarkets(broker.value))return;
  for(const name of serverCatalog?.servers??[]){const option=document.createElement('option');option.value=name;list.append(option);}
 }
 function populateServers(){
  if(!(serverChoice instanceof HTMLSelectElement))return;
  const saved=savedProfile?.mt5Server??'';
  const names=[...new Set([saved,...(isJustMarkets(savedProfile?.brokerName)?serverCatalog?.servers??[]:[])].filter(Boolean))];
  serverChoice.replaceChildren(new window.Option('Choose your MT5 server',''));
  for(const name of names)serverChoice.append(new window.Option(name,name));serverChoice.value=saved;serverDirty=false;
  if(serverHelp)serverHelp.textContent=isJustMarkets(savedProfile?.brokerName)?serverCatalog?.message??'Server lookup is unavailable. Enter the exact server in your account details above.':'Use the exact server saved in your account details above.';
  if(serverStatus)serverStatus.textContent='';profileSuggestions();
 }
 function controls(){
  const profileReady=Boolean(savedProfile?.brokerName&&savedProfile?.mt5Account&&savedProfile?.mt5Server);
  form.querySelectorAll('input,button').forEach(element=>{if(element instanceof HTMLInputElement||element instanceof HTMLButtonElement)element.disabled=loading||!available||!entitled||!profileReady||Boolean(connection?.canSync);});
  const submit=form.querySelector('button[type="submit"]');if(submit instanceof HTMLButtonElement)submit.disabled=loading||!available||!entitled||!profileReady||Boolean(connection?.canSync)||serverDirty;
  if(serverChoice instanceof HTMLSelectElement)serverChoice.disabled=loading||!savedProfile||Boolean(connection?.canSync);
  if(saveServer instanceof HTMLButtonElement)saveServer.disabled=loading||!serverDirty;
  if(serverActions instanceof HTMLElement)serverActions.hidden=!serverDirty;
  if(sync instanceof HTMLButtonElement)sync.disabled=loading||!available||!entitled||!connection?.canSync;
  if(remove instanceof HTMLButtonElement)remove.disabled=loading||!available||!entitled||!connection?.canSync;
 }
 async function load(){
  loading=true;controls();
  try{
   const data=await api('/api/broker/connection');available=data.available;entitled=data.entitled;connection=data.connection;requestKey=connection?.requestKey??'';
   if(state)state.textContent=!available?'Service setup pending':connection?({READY:'History synced',SYNCING:'Syncing history',CONNECTING:'Awaiting broker sync',ERROR:'Connection needs attention',REMOVING:'Disconnecting'}[connection.state]??'Not connected'):'Not connected';
   if(stamp)stamp.textContent=connection?.lastSyncedAt?'Last sync: '+new Intl.DateTimeFormat('en-MY',{timeZone:'Asia/Kuala_Lumpur',dateStyle:'medium',timeStyle:'short'}).format(new Date(connection.lastSyncedAt))+' MYT':'No history synced';
   say(data.message??(!entitled?'A free trial or plan is required before connecting.':connection?'Read-only history connection. Use Sync history to refresh the saved snapshot.':'Save your broker details above, then connect with your MT5 investor password.'));
   const profile=await api('/api/profile');savedProfile=profile.profile;
   for(const [name,key]of [['broker','brokerName'],['login','mt5Account']]){const input=form.elements.namedItem(name);if(input instanceof HTMLInputElement)input.value=profile.profile[key]??'';}
   if(!serverCatalog){try{const catalog=await api('/api/broker/servers');serverCatalog={servers:Array.isArray(catalog.servers)?catalog.servers.filter(name=>typeof name==='string'&&name.length<=100).slice(0,100):[],message:catalog.message};}catch{serverCatalog={servers:[],message:'Server lookup is unavailable. Enter the exact server in your account details above.'};}}
   populateServers();
   if(available&&entitled&&!(savedProfile?.brokerName&&savedProfile?.mt5Account&&savedProfile?.mt5Server))say('Save your broker, MT5 account and exact server above before connecting.');
  }catch(error){say(error instanceof Error?error.message:'Broker connection is unavailable.');available=false;}
  finally{loading=false;controls();}
 }
 async function action(path,method,data){
  loading=true;controls();say('Waiting for the managed broker service…');
  try{const result=await api(path,method,data);await load();say(result.message);document.dispatchEvent(new window.Event('broker:updated'));}
  catch(error){await load();say(error instanceof Error?error.message:'The request could not be completed.');}
  finally{loading=false;const password=form.elements.namedItem('investorPassword');if(password instanceof HTMLInputElement){password.value='';password.type='password';}if(toggle instanceof HTMLButtonElement){toggle.textContent='Show';toggle.setAttribute('aria-label','Show investor password');}controls();}
 }
 form.addEventListener('submit',event=>{event.preventDefault();if(loading||!available||!entitled||serverDirty)return;const fields=new FormData(form);requestKey=requestKey||window.crypto.randomUUID();const password=form.elements.namedItem('investorPassword');if(password instanceof HTMLInputElement)password.value='';void action('/api/broker/connection','POST',{broker:fields.get('broker'),login:fields.get('login'),server:fields.get('server'),investorPassword:fields.get('investorPassword'),consent:fields.get('consent')==='on',requestKey});});
 serverChoice?.addEventListener('change',()=>{
  if(!(serverChoice instanceof HTMLSelectElement)||!(profileForm instanceof HTMLFormElement))return;
  const input=profileForm.elements.namedItem('mt5Server');if(input instanceof HTMLInputElement)input.value=serverChoice.value;
  serverDirty=serverChoice.value!==(savedProfile?.mt5Server??'');
  if(serverStatus)serverStatus.textContent=serverDirty?'Save account details before connecting. Changing broker details requires a new membership review.':'';controls();
 });
 saveServer?.addEventListener('click',()=>{if(serverDirty&&profileForm instanceof HTMLFormElement)profileForm.requestSubmit();});
 if(profileForm instanceof HTMLFormElement){const broker=profileForm.elements.namedItem('brokerName'),server=profileForm.elements.namedItem('mt5Server');if(broker instanceof HTMLInputElement)broker.addEventListener('input',profileSuggestions);if(server instanceof HTMLInputElement)server.addEventListener('focus',profileSuggestions);}
 sync?.addEventListener('click',()=>{if(connection&&!loading)void action('/api/broker/sync','POST',{version:connection.version});});
 remove?.addEventListener('click',()=>{if(connection&&!loading&&window.confirm('Disconnect your read-only broker connection and remove its saved history from this website?'))void action('/api/broker/connection','DELETE',{version:connection.version});});
 toggle?.addEventListener('click',()=>{const password=form.elements.namedItem('investorPassword');if(!(password instanceof HTMLInputElement)||!(toggle instanceof HTMLButtonElement))return;const show=password.type==='password';password.type=show?'text':'password';toggle.textContent=show?'Hide':'Show';toggle.setAttribute('aria-label',show?'Hide investor password':'Show investor password');});
 if(document.documentElement.dataset.offlinePreview==='true'){form.querySelectorAll('input,button').forEach(element=>{/** @type {HTMLInputElement} */(element).disabled=true;});say('Offline layout preview. Broker credentials can only be entered on the running, configured website.');if(state)state.textContent='Not connected';return;}
 document.addEventListener('profile:updated',()=>{void load();});void load();
})();
