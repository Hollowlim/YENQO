// Only the generated local index.html loads this launcher, never the hosted app.
// Keep account operations on the actual server origin with its existing guards.
(() => {
  const origin='http://127.0.0.1:3000';
  const panel=document.querySelector('[data-local-entry]');
  const statusCandidate=panel?.querySelector('[data-local-entry-status]');
  const retryCandidate=panel?.querySelector('[data-local-entry-retry]');
  if(!(panel instanceof HTMLElement)||!(statusCandidate instanceof HTMLElement)||!(retryCandidate instanceof HTMLButtonElement))return;
  const status=statusCandidate,retry=retryCandidate;
  let pending=false;
  const connect=()=>{
    if(pending)return;pending=true;retry.disabled=true;
    status.textContent='Opening your local YENGFX app…';
    // An image readiness probe works across file:// and HTTP without exposing
    // any session, reading private data or weakening the server's CORS policy.
    const probe=new window.Image();let finished=false;
    const timeout=window.setTimeout(fail,3500);
    function fail(){if(finished)return;finished=true;window.clearTimeout(timeout);probe.onload=null;probe.onerror=null;pending=false;retry.disabled=false;status.textContent='The local app is not reachable. Start the server, then choose Retry or Open website below.';}
    probe.onerror=fail;
    probe.onload=()=>{
      if(finished)return;finished=true;window.clearTimeout(timeout);
      const fragment=/^#[A-Za-z][A-Za-z0-9_-]{0,80}$/.test(window.location.hash)?window.location.hash:'';
      window.location.replace(origin+'/'+fragment);
    };
    probe.src=origin+'/assets/yengfx-mark-2026.webp?local-entry='+Date.now();
  };
  retry.addEventListener('click',connect);
  connect();
})();
