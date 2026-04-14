/* ═══════════════════════════════════════════
   Atlas Water Solutions — admin.js v2
═══════════════════════════════════════════ */

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : window.location.origin;

let loggedIn     = false;
let activeFilter = 'all';
let searchTimer  = null;

/* ════════════════════════════════════════
   LOGIN
════════════════════════════════════════ */
async function doLogin() {
  const u   = document.getElementById('l-user').value.trim();
  const p   = document.getElementById('l-pass').value.trim();
  const err = document.getElementById('login-err');
  err.style.display = 'none';

  const btn = document.querySelector('.btn-login');
  btn.textContent = 'Signing in...';
  btn.disabled    = true;

  try {
    const res  = await fetch(`${API}/api/admin/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    const data = await res.json();
    if (!res.ok) throw 0;

    loggedIn = true;
    document.getElementById('tb-username').textContent = data.username;
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('dash').style.display       = 'flex';
    loadStats();
    loadRequests();

  } catch {
    err.style.display = 'block';
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled    = false;
  }
}

function doLogout() {
  loggedIn = false;
  document.getElementById('dash').style.display        = 'none';
  document.getElementById('login-page').style.display  = 'flex';
  document.getElementById('l-pass').value = '';
}

/* ════════════════════════════════════════
   STATS
════════════════════════════════════════ */
async function loadStats() {
  try {
    const res = await fetch(`${API}/api/admin/stats`);
    const { stats } = await res.json();
    document.getElementById('s-total').textContent = stats.total;
    document.getElementById('s-new').textContent   = stats.new;
    document.getElementById('s-prog').textContent  = stats.in_progress;
    document.getElementById('s-done').textContent  = stats.done;
  } catch {}
}

/* ════════════════════════════════════════
   REQUESTS TABLE
════════════════════════════════════════ */
async function loadRequests() {
  const q     = document.getElementById('search-box')?.value.trim() || '';
  const tbody = document.getElementById('req-tbody');
  tbody.innerHTML = `<tr><td colspan="7" class="loading-state">Loading...</td></tr>`;

  try {
    const p = new URLSearchParams();
    if (activeFilter !== 'all') p.set('status', activeFilter);
    if (q) p.set('q', q);

    const res = await fetch(`${API}/api/admin/requests?${p}`);
    const { requests, total } = await res.json();

    document.getElementById('req-count').textContent = `Showing ${requests.length} of ${total} requests`;

    if (!requests.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>No requests found</p></div></td></tr>`;
      return;
    }

    const labels = { new:'New', in_progress:'In Progress', done:'Completed', cancelled:'Cancelled' };

    tbody.innerHTML = requests.map(r => {
      const init = r.name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0,2);
      const date = new Date(r.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
      return `
        <tr>
          <td><span class="req-code">${r.request_code}</span></td>
          <td>
            <div class="client-cell">
              <div class="client-init">${init}</div>
              <div>
                <div class="client-name">${r.name}</div>
                <div class="client-phone">${r.phone}</div>
              </div>
            </div>
          </td>
          <td>${r.service}</td>
          <td style="color:var(--muted);font-size:12px">${r.note || '—'}</td>
          <td style="color:var(--muted);font-size:12px;white-space:nowrap">${date}</td>
          <td>
            <select class="status-sel" onchange="updateStatus(${r.id}, this.value)">
              <option value="new"         ${r.status==='new'         ?'selected':''}>New</option>
              <option value="in_progress" ${r.status==='in_progress' ?'selected':''}>In Progress</option>
              <option value="done"        ${r.status==='done'        ?'selected':''}>Completed</option>
              <option value="cancelled"   ${r.status==='cancelled'   ?'selected':''}>Cancelled</option>
            </select>
          </td>
          <td><button class="del-btn" onclick="deleteRequest(${r.id})">Delete</button></td>
        </tr>`;
    }).join('');

    loadStats();
  } catch {
    tbody.innerHTML = `<tr><td colspan="7" class="loading-state" style="color:var(--red)">Could not reach server</td></tr>`;
  }
}

/* ════════════════════════════════════════
   UPDATE / DELETE
════════════════════════════════════════ */
async function updateStatus(id, status) {
  try {
    await fetch(`${API}/api/admin/requests/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    toast('Status updated', '#10B981');
    loadStats();
  } catch { toast('Update failed', '#EF4444'); }
}

async function deleteRequest(id) {
  if (!confirm('Delete this request permanently?')) return;
  try {
    await fetch(`${API}/api/admin/requests/${id}`, { method: 'DELETE' });
    toast('Request deleted', '#EF4444');
    loadRequests();
  } catch { toast('Delete failed', '#EF4444'); }
}

/* ════════════════════════════════════════
   FILTER + SEARCH
════════════════════════════════════════ */
function setFilter(f, btn) {
  activeFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadRequests();
}

function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadRequests, 380);
}

/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
function toast(msg, color = '#10B981') {
  const el  = document.getElementById('a-toast');
  const dot = document.getElementById('a-toast-dot');
  const txt = document.getElementById('a-toast-msg');
  txt.textContent    = msg;
  dot.style.background = color;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

/* ════════════════════════════════════════
   AUTO REFRESH every 30s
════════════════════════════════════════ */
setInterval(() => { if (loggedIn) loadRequests(); }, 30000);

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('l-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
});
