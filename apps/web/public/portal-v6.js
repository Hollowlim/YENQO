// Small navigation enhancement scoped to the authenticated portal shell.
(() => {
  if (!document.body.classList.contains('v6-portal')) return;
  const sidebarToggle=document.querySelector('[data-v2-collapse]');
  const sidebarLabel=()=>{
    const label=sidebarToggle?.getAttribute('aria-expanded')==='false'?'Show sidebar':'Hide sidebar';
    sidebarToggle?.setAttribute('aria-label',label);sidebarToggle?.setAttribute('title',label);
  };
  sidebarToggle?.addEventListener('click',sidebarLabel);
  window.addEventListener('resize',sidebarLabel);
  sidebarLabel();
  const search = document.querySelector('[data-portal-search]');
  const results = document.querySelector('[data-portal-search-results]');
  if (!(search instanceof HTMLInputElement) || !(results instanceof HTMLElement)) return;
  const links = Array.from(document.querySelectorAll('.sidebar .nav-link'));
  const close = () => { results.hidden = true; search.setAttribute('aria-expanded','false'); };
  const render = () => {
    results.replaceChildren();
    const query = search.value.trim().toLocaleLowerCase();
    if (!query) { close(); return; }
    const matches = links.filter(link => `${link.textContent ?? ''} ${link.getAttribute('aria-label') ?? ''}`.toLocaleLowerCase().includes(query)).slice(0,8);
    for (const match of matches) {
      const link = document.createElement('a');
      link.href = match.getAttribute('href') ?? '#';
      link.textContent = match.textContent?.trim() ?? '';
      results.append(link);
    }
    if (!matches.length) { const empty=document.createElement('p');empty.textContent='No matching workspaces.';results.append(empty); }
    results.hidden = false;
    search.setAttribute('aria-expanded','true');
  };
  search.addEventListener('input',render);
  search.addEventListener('focus',()=>{if(search.value.trim())render();});
  search.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'){event.preventDefault();results.querySelector('a')?.focus();}
    if(event.key==='Enter'&&!results.hidden){const first=results.querySelector('a');if(first){event.preventDefault();first.click();}}
    if(event.key==='Escape'&&!results.hidden){event.preventDefault();event.stopPropagation();close();}
  });
  results.addEventListener('keydown',event=>{
    if(!(event instanceof window.KeyboardEvent))return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();search.focus();close();return;}
    const items=Array.from(results.querySelectorAll('a'));
    const active=items.findIndex(item=>item===document.activeElement);
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();items[(active+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
    }
  });
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();search.focus();}
  });
  document.addEventListener('pointerdown',event=>{
    if(event.target instanceof window.Node&&!search.closest('.v6-workspace-search')?.contains(event.target))close();
  });
})();
