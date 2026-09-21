const keysBody = document.getElementById('keysBody');
const toast = document.getElementById('toast');

function showToast(msg, isErr = false) {
  toast.textContent = msg;
  toast.className = 'toast show' + (isErr ? ' err' : '');
  setTimeout(() => (toast.className = 'toast'), 2500);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString();
}

async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (res.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Unauthorized');
  }
  return res.json();
}

async function loadKeys() {
  const data = await api('/api/admin/keys');
  if (!data.success) return;

  document.getElementById('statTotal').textContent = data.stats.total;
  document.getElementById('statActive').textContent = data.stats.active;
  document.getElementById('statExpired').textContent = data.stats.expired;
  document.getElementById('statBanned').textContent = data.stats.banned;

  if (data.keys.length === 0) {
    keysBody.innerHTML = '<tr><td colspan="6" class="empty">No keys yet. Create one above.</td></tr>';
    return;
  }

  keysBody.innerHTML = data.keys.map(k => `
    <tr data-id="${k.id}">
      <td class="key-cell">${k.key}</td>
      <td><span class="badge ${k.status}">${k.status}</span></td>
      <td>${fmtDate(k.createdAt)}</td>
      <td>${k.expiresAt ? fmtDate(k.expiresAt) : 'Lifetime'}</td>
      <td>${fmtDate(k.lastUsedAt)}</td>
      <td>
        <div class="row-actions">
          <button onclick="copyKey('${k.key}')">Copy</button>
          ${k.status === 'BANNED'
            ? `<button onclick="unbanKey(${k.id})">Unban</button>`
            : `<button onclick="banKey(${k.id})">Ban</button>`}
          <button onclick="extendKey(${k.id})">Extend</button>
          <button class="danger" onclick="deleteKey(${k.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function copyKey(key) {
  await navigator.clipboard.writeText(key);
  showToast('Key copied to clipboard');
}

document.getElementById('createBtn').addEventListener('click', async () => {
  const duration = document.getElementById('durationSelect').value;
  try {
    const data = await api('/api/admin/keys/create', {
      method: 'POST',
      body: JSON.stringify({ duration }),
    });
    if (data.success) {
      showToast(`Created: ${data.license.key}`);
      loadKeys();
    } else {
      showToast(data.message, true);
    }
  } catch {}
});

window.banKey = async (id) => {
  const data = await api('/api/admin/keys/ban', { method: 'POST', body: JSON.stringify({ id }) });
  if (data.success) { showToast('Key banned'); loadKeys(); }
};

window.unbanKey = async (id) => {
  const data = await api('/api/admin/keys/unban', { method: 'POST', body: JSON.stringify({ id }) });
  if (data.success) { showToast('Key unbanned'); loadKeys(); }
};

window.deleteKey = async (id) => {
  if (!confirm('Delete this key permanently?')) return;
  const data = await api('/api/admin/keys/delete', { method: 'POST', body: JSON.stringify({ id }) });
  if (data.success) { showToast('Key deleted'); loadKeys(); }
};

window.extendKey = async (id) => {
  const duration = prompt('Extend by: 1_DAY, 7_DAYS, 30_DAYS, 90_DAYS, 365_DAYS, or LIFETIME', '30_DAYS');
  if (!duration) return;
  const data = await api('/api/admin/keys/extend', { method: 'POST', body: JSON.stringify({ id, duration: duration.trim() }) });
  if (data.success) { showToast('Key extended'); loadKeys(); }
  else showToast(data.message, true);
};

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

document.getElementById('listBtn').addEventListener('click', () => {
  loadKeys();
  showToast('Key list refreshed');
});

loadKeys();
setInterval(loadKeys, 15000); // keep stats/status fresh (expiry ticking over)
