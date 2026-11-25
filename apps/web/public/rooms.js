// Discussion Rooms client. Every user-supplied value is rendered with textContent.
(() => {
  const root = document.querySelector('[data-yq-rooms]');
  if (!(root instanceof HTMLElement)) return;
  const $ = (/** @type {string} */ s) => /** @type {HTMLElement} */ (root.querySelector(s));
  const status = $('[data-yq-rooms-status]');
  /** @type {string|null} */ let current = null;
  /** @type {number|undefined} */ let poll;

  async function api(/** @type {string} */ path, /** @type {object|undefined} */ body = undefined) {
    const response = await fetch(path, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    const data = response ? await response.json().catch(() => ({})) : { message: 'Network error. Try again.' };
    if (!response?.ok) throw new Error(data.message ?? 'Request failed.');
    return data;
  }
  const el = (/** @type {string} */ tag, /** @type {string} */ text = '', /** @type {string} */ className = '') => { const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node; };
  const button = (/** @type {string} */ text, /** @type {() => Promise<unknown>} */ action, className = 'yq-btn') => {
    const node = /** @type {HTMLButtonElement} */ (el('button', text, className)); node.type = 'button';
    node.addEventListener('click', async () => { node.disabled = true; try { await action(); } catch (error) { status.textContent = error instanceof Error ? error.message : 'Request failed.'; } finally { node.disabled = false; } });
    return node;
  };
  const when = (/** @type {string} */ iso) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  async function list() {
    current = null; window.clearInterval(poll);
    $('[data-yq-room]').hidden = true; $('[data-yq-room-list]').hidden = false;
    const data = await api('/api/rooms');
    $('[data-yq-create]').hidden = !data.canCreate;
    const items = data.rooms.map(room => {
      const li = el('li', '', 'yq-card yq-room-card');
      li.append(el('h2', room.title), el('p', room.description || 'No description.', 'yq-note'), el('p', `${room.visibility === 'PRIVATE' ? 'Private' : 'Public'} · ${room.memberCount} member${room.memberCount === 1 ? '' : 's'} · Mentor: ${room.owner.name}`, 'yq-meta'));
      if (room.myRole) li.append(button('Open room', () => open(room.id), 'yq-btn yq-btn-gold'));
      else if (room.requestStatus === 'PENDING') li.append(el('span', 'Request pending', 'yq-pill yq-pill-pending'));
      else li.append(button(room.visibility === 'PUBLIC' ? 'Join room' : 'Request to join', async () => { const r = await api(`/api/rooms/${room.id}/join`, {}); status.textContent = r.status === 'PENDING' ? 'Join request sent to the room moderators.' : 'Joined.'; await (r.status === 'PENDING' ? list() : open(room.id)); }));
      return li;
    });
    $('[data-yq-rooms-list]').replaceChildren(...(items.length ? items : [el('li', 'No rooms yet. Approved mentors can create the first one.', 'yq-empty')]));
  }

  function messageItem(m, data) {
    const li = el('li', '', `yq-message${m.kind !== 'MESSAGE' ? ' yq-message-' + m.kind.toLowerCase() : ''}`);
    li.append(el('p', `${m.author.name} · ${when(m.createdAt)}${m.kind === 'ANALYSIS' ? ' · Market analysis' : ''}`, 'yq-meta'));
    li.append(el('p', m.removed ? 'Message removed.' : m.text));
    if (m.chartUrl) { const a = /** @type {HTMLAnchorElement} */ (el('a', 'Open shared chart ↗', 'yq-link')); a.href = m.chartUrl; a.target = '_blank'; a.rel = 'noopener noreferrer nofollow'; li.append(a); }
    const staff = ['OWNER', 'MODERATOR'].includes(data.myRole);
    if (!m.removed) {
      const actions = el('div', '', 'yq-inline');
      if (staff) actions.append(button(m.pinned ? 'Unpin' : 'Pin', () => api(`/api/rooms/${data.room.id}/messages/${m.id}/${m.pinned ? 'unpin' : 'pin'}`, {}).then(() => open(data.room.id)), 'yq-link'));
      if (staff || m.author.id === data.principalId) actions.append(button('Remove', () => api(`/api/rooms/${data.room.id}/messages/${m.id}/hide`, {}).then(() => open(data.room.id)), 'yq-link'));
      li.append(actions);
    }
    return li;
  }

  async function open(/** @type {string} */ id) {
    const data = await api(`/api/rooms/${id}`);
    current = id;
    $('[data-yq-room-list]').hidden = true; $('[data-yq-room]').hidden = false;
    $('[data-yq-room-title]').textContent = data.room.title;
    $('[data-yq-room-description]').textContent = data.room.description;
    $('[data-yq-room-access]').textContent = `${data.room.visibility === 'PRIVATE' ? 'Private' : 'Public'} · You: ${(data.myRole ?? 'viewer').toLowerCase()}`;
    const staff = ['OWNER', 'MODERATOR'].includes(data.myRole);
    document.querySelectorAll('[data-yq-rooms] [data-yq-staff-only]').forEach(node => { /** @type {HTMLElement} */ (node).hidden = !staff; });
    $('[data-yq-leave]').hidden = !data.myRole || data.myRole === 'OWNER';
    $('[data-yq-composer]').hidden = !data.myRole;
    const pinned = data.messages.filter(m => m.pinned);
    $('[data-yq-pinned]').replaceChildren(...(pinned.length ? pinned.map(m => messageItem(m, data)) : [el('li', 'No pinned announcements.', 'yq-empty')]));
    $('[data-yq-messages]').replaceChildren(...(data.messages.length ? data.messages.map(m => messageItem(m, data)) : [el('li', 'No messages yet.', 'yq-empty')]));
    $('[data-yq-members]').replaceChildren(...data.members.map(member => {
      const li = el('li', `${member.user.name} · ${member.role.toLowerCase()}`);
      const target = (/** @type {string} */ action) => () => api(`/api/rooms/${id}/members/${member.user.id}`, { action }).then(() => open(id));
      if (member.role !== 'OWNER' && member.user.id !== data.principalId) {
        if (data.myRole === 'OWNER') li.append(button(member.role === 'MODERATOR' ? 'Make member' : 'Make moderator', target(member.role === 'MODERATOR' ? 'DEMOTE' : 'PROMOTE'), 'yq-link'));
        if (data.myRole === 'OWNER' || (data.myRole === 'MODERATOR' && member.role === 'MEMBER')) li.append(button('Remove', target('REMOVE'), 'yq-link'));
      }
      return li;
    }));
    $('[data-yq-requests]').replaceChildren(...(data.requests.length ? data.requests.map(r => {
      const li = el('li', r.user.name);
      for (const decision of ['APPROVE', 'DECLINE']) li.append(button(decision === 'APPROVE' ? 'Approve' : 'Decline', () => api(`/api/rooms/${id}/requests/${r.user.id}`, { decision }).then(() => open(id)), 'yq-link'));
      return li;
    }) : [el('li', 'No pending requests.', 'yq-empty')]));
    $('[data-yq-invites]').replaceChildren(...data.invites.map(invite => {
      const state = invite.revokedAt ? 'revoked' : invite.expiresAt && new Date(invite.expiresAt) <= new Date() ? 'expired' : invite.expiresAt ? `expires ${when(invite.expiresAt)}` : 'no expiry';
      const li = el('li', `Link created ${when(invite.createdAt)} · ${state}`);
      if (!invite.revokedAt) li.append(button('Revoke', () => api(`/api/rooms/${id}/invites/${invite.id}/revoke`, {}).then(() => open(id)), 'yq-link'));
      return li;
    }));
    window.clearInterval(poll);
    poll = window.setInterval(() => { if (current === id && !document.hidden) open(id).catch(() => undefined); }, 20000);
  }

  const form = (/** @type {string} */ selector, /** @type {(data: FormData, form: HTMLFormElement) => Promise<unknown>} */ submit) => {
    const node = /** @type {HTMLFormElement} */ ($(selector));
    node.addEventListener('submit', async event => {
      event.preventDefault();
      if (!node.reportValidity()) return;
      try { await submit(new FormData(node), node); } catch (error) { status.textContent = error instanceof Error ? error.message : 'Request failed.'; }
    });
  };
  form('[data-yq-create-form]', async (data, node) => {
    const room = await api('/api/rooms', { title: data.get('title'), description: data.get('description'), visibility: data.get('visibility') });
    node.reset(); await open(room.id);
  });
  form('[data-yq-composer]', async (data, node) => {
    if (!current) return;
    await api(`/api/rooms/${current}/messages`, { text: data.get('text'), kind: data.get('kind') ?? 'MESSAGE', chartUrl: data.get('chartUrl') || null, clientKey: window.crypto.randomUUID() });
    node.reset(); await open(current);
  });
  form('[data-yq-invite-form]', async data => {
    if (!current) return;
    const hours = data.get('expiresInHours');
    const invite = await api(`/api/rooms/${current}/invites`, { expiresInHours: hours ? Number(hours) : null });
    $('[data-yq-invite-output]').textContent = `Share this link now; it is shown only once: ${window.location.origin}${invite.url}`;
    await open(current);
  });
  $('[data-yq-back]').addEventListener('click', () => { list().catch(error => { status.textContent = error.message; }); });
  $('[data-yq-leave]').addEventListener('click', async () => { if (current && window.confirm('Leave this room?')) { await api(`/api/rooms/${current}/leave`, {}).catch(error => { status.textContent = error.message; }); await list(); } });

  const invite = new URLSearchParams(window.location.search).get('invite');
  // Remove the token from the address bar and history before using it.
  if (invite) window.history.replaceState(null, '', window.location.pathname);
  (invite ? api('/api/rooms/invite', { invite }).then(r => open(r.roomId)) : list()).catch(error => { status.textContent = error.message; list().catch(() => undefined); });
})();
