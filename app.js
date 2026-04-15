/* ═══════════════════════════════════════════
   Atlas Water Solutions — app.js
   يعمل مع السيرفر على localhost:3000
   أو بدونه (وضع demo)
═══════════════════════════════════════════ */

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : window.location.origin;

/* ════════════════════════════════════════
   Pipeline bars animation on load
════════════════════════════════════════ */
window.addEventListener('load', () => {
  setTimeout(() => {
    [['hb1','94%'],['hb2','84%'],['hb3','97%']].forEach(([id,w]) => {
      const b = document.getElementById(id);
      if (b) b.style.width = w;
    });
  }, 500);
  checkReveal();
});

/* ════════════════════════════════════════
   Scroll reveal
════════════════════════════════════════ */
function checkReveal() {
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight - 60)
      el.classList.add('visible');
  });
}
window.addEventListener('scroll', checkReveal, { passive: true });

/* ════════════════════════════════════════
   Pre-fill service from card click
════════════════════════════════════════ */
function bookService(service) {
  const sel = document.getElementById('f-service');
  if (sel) sel.value = service;
  document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => document.getElementById('f-name')?.focus(), 600);
}

/* ════════════════════════════════════════
   FORM SUBMIT
════════════════════════════════════════ */
async function submitForm() {
  const name    = document.getElementById('f-name')?.value.trim();
  const phone   = document.getElementById('f-phone')?.value.trim();
  const service = document.getElementById('f-service')?.value;
  const note    = document.getElementById('f-note')?.value.trim();

  clearErrors();
  let valid = true;
  if (!name)    { showError('f-name',    'Please enter your full name');    valid = false; }
  if (!phone)   { showError('f-phone',   'Please enter your phone number'); valid = false; }
  if (!service) { showError('f-service', 'Please select a service');         valid = false; }
  if (!valid) return;

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Sending...`;

  try {
    const res  = await fetch(`${API}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, service, note })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    ['f-name','f-phone','f-note'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('f-service').value = '';

    showSuccessModal(data.request_code, service);

  } catch (e) {
    /* Demo mode — يعمل بدون سيرفر */
    if (e.message === 'Failed to fetch' || e instanceof TypeError) {
      const demoCode = 'ATX-' + Math.floor(10000 + Math.random() * 90000);
      showSuccessModal(demoCode, service);
      showToast('Demo mode — connect server for real data', '#F59E0B');
    } else {
      showToast('Error: ' + e.message, '#EF4444');
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Book Now`;
  }
}

/* ════════════════════════════════════════
   Validation helpers
════════════════════════════════════════ */
function showError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.style.borderColor = '#EF4444';
  el.style.boxShadow   = '0 0 0 3px rgba(239,68,68,.1)';
  let hint = el.nextElementSibling;
  if (!hint || !hint.classList.contains('field-error')) {
    hint = document.createElement('span');
    hint.className = 'field-error';
    el.insertAdjacentElement('afterend', hint);
  }
  hint.textContent = msg;
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.remove());
  ['f-name','f-phone','f-service'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; }
  });
}

/* ════════════════════════════════════════
   SUCCESS MODAL
════════════════════════════════════════ */
function showSuccessModal(code, service) {
  document.getElementById('modal-code').textContent    = code;
  document.getElementById('modal-service').textContent = service;
  document.getElementById('modal').classList.add('open');
}
function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

/* ════════════════════════════════════════
   ORDER TRACKING
════════════════════════════════════════ */
async function trackOrder() {
  const input   = document.getElementById('track-input');
  const code    = input?.value.trim().toUpperCase();
  const resultEl = document.getElementById('track-result');
  const errorEl  = document.getElementById('track-error');
  resultEl.classList.remove('show');
  errorEl.classList.remove('show');

  if (!code) { input?.focus(); return; }

  const btn = document.getElementById('track-btn');
  btn.textContent = '...';
  btn.disabled    = true;

  try {
    const res  = await fetch(`${API}/api/track/${code}`);
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = `No request found with code "${code}"`;
      errorEl.classList.add('show');
      return;
    }
    renderTrackResult(data.request);

  } catch {
    /* Demo mode */
    errorEl.textContent = 'Server not running — start server.js to enable real tracking.';
    errorEl.classList.add('show');
  } finally {
    btn.textContent = 'Track';
    btn.disabled    = false;
  }
}

function renderTrackResult(r) {
  document.getElementById('track-code').textContent    = r.request_code;
  document.getElementById('track-service').textContent = r.service;
  document.getElementById('track-date').textContent    =
    new Date(r.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  const badgeEl = document.getElementById('track-badge');
  const labels  = { new:'New', in_progress:'In Progress', done:'Completed', cancelled:'Cancelled' };
  badgeEl.className   = `badge badge-${r.status}`;
  badgeEl.textContent = labels[r.status] || r.status;

  const steps = ['new','in_progress','done'];
  const si    = steps.indexOf(r.status);
  steps.forEach((s, i) => {
    const step = document.getElementById(`tl-${s}`);
    if (!step) return;
    step.classList.remove('done','active');
    if (i < si || r.status === 'done')       step.classList.add('done');
    else if (i === si && r.status !== 'done') step.classList.add('active');
  });

  document.getElementById('track-result').classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('track-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') trackOrder();
  });
});

/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
function showToast(msg, color = '#10B981') {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-dot').style.background = color;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}
