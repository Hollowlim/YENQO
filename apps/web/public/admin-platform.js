// Admin mentor approvals and room moderation. Server enforces ADMIN role on every call.
(() => {
  const root = document.querySelector('[data-yq-platform]');
  if (!(root instanceof HTMLElement)) return;
  const $ = (/** @type {string} */ s) => /** @type {HTMLElement} */ (root.querySelector(s));
  const status = $('[data-yq-platform-status]');
  const api = async (/** @type {string} */ path, /** @type {object|undefined} */ body = undefined) => {
    const response = await fetch(path, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message ?? 'Request failed.');
    return data;
  };
  const item = (/** @type {string} */ text) => { const li = document.createElement('li'); li.textContent = text; return li; };
  async function load() {
    const [{ mentors }, { rooms }] = await Promise.all([api('/api/admin/mentors'), api('/api/admin/rooms')]);
    $('[data-yq-mentors]').replaceChildren(...(mentors.length ? mentors.map(m => item(`${m.name} · ${m.email}`)) : [item('No approved mentors.')]));
    $('[data-yq-admin-rooms]').replaceChildren(...(rooms.length ? rooms.map(room => {
      const li = item(`${room.title} · ${room.visibility.toLowerCase()} · ${room.owner.name} · ${room._count.members} members · ${room._count.messages} messages${room.archivedAt ? ' · archived' : ''}`);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'yq-link'; button.textContent = room.archivedAt ? 'Restore' : 'Archive';
      button.addEventListener('click', () => api(`/api/admin/rooms/${room.id}/archive`, { archived: !room.archivedAt }).then(r => { status.textContent = r.message; return load(); }).catch(e => { status.textContent = e.message; }));
      li.append(button);
      return li;
    }) : [item('No rooms yet.')]));
  }
  const form = /** @type {HTMLFormElement} */ ($('[data-yq-mentor-form]'));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const submitter = /** @type {HTMLButtonElement|null} */ (/** @type {SubmitEvent} */ (event).submitter);
    if (!form.reportValidity()) return;
    api('/api/admin/mentors', { email: new FormData(form).get('email'), approved: submitter?.value === 'true' })
      .then(r => { status.textContent = r.message; form.reset(); return load(); })
      .catch(e => { status.textContent = e.message; });
  });
  load().catch(e => { status.textContent = e.message; });
})();
