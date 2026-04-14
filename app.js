/* ═══════════════════════════════════════════
   Atlas Water Solutions — app.js v2
═══════════════════════════════════════════ */

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : window.location.origin;

/* ════════════════════════════════════════
   NAVBAR scroll effect
════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  document.querySelector('.navbar')?.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

/* ════════════════════════════════════════
   Scroll-reveal
════════════════════════════════════════ */
function checkReveal() {
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight - 60)
      el.classList.add('visible');
  });
}
window.addEventListener('scroll', checkReveal, { passive: true });

/* ════════════════════════════════════════
   Pipeline bars animation
════════════════════════════════════════ */
function initBars() {
  setTimeout(() => {
    [['hb1','94%'],['hb2','84%'],['hb3','97%']].forEach(([id,w]) => {
      const b = document.getElementById(id);
      if (b) b.style.width = w;
    });
  }, 600);
}

/* ════════════════════════════════════════
   Smooth scroll to section
════════════════════════════════════════ */
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/* ════════════════════════════════════════
   Pre-fill service from card click
════════════════════════════════════════ */
function bookService(service) {
  const sel = document.getElementById('f-service');
  if (sel) sel.value = service;
  scrollTo('booking');
  setTimeout(() => document.getElementById('f-name')?.focus(), 600);
}

/* ════════════════════════════════════════
   BOOKING FORM — Submit
════════════════════════════════════════ */
async function submitForm() {
  const name    = document.getElementById('f-name')?.value.trim();
  const phone   = document.getElementById('f-phone')?.value.trim();
  const service = document.getElementById('f-service')?.value;
  const note    = document.getElementById('f-note')?.value.trim();

  // Inline validation
  clearErrors();
  let valid = true;
  if (!name)    { showError('f-name',    'Please enter your full name');   valid = false; }
  if (!phone)   { showError('f-phone',   'Please enter your phone number'); valid = false; }
  if (!service) { showError('f-service', 'Please select a service');        valid = false; }
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

    // Clear form
    ['f-name','f-phone','f-note'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('f-service').value = '';

    // Show success modal
    showSuccessModal(data.request_code, service);

  } catch (e) {
    showToast('Could not reach server. Is server.js running?', '#EF4444');
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
    hint.style.cssText = 'font-size:12px;color:#EF4444;margin-top:4px;display:block;';
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
  const input = document.getElementById('track-input');
  const code  = input?.value.trim().toUpperCase();

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
    errorEl.textContent = 'Could not reach server. Make sure server.js is running.';
    errorEl.classList.add('show');
  } finally {
    btn.textContent = 'Track';
    btn.disabled    = false;
  }
}

function renderTrackResult(r) {
  document.getElementById('track-code').textContent    = r.request_code;
  document.getElementById('track-service').textContent = r.service;
  document.getElementById('track-date').textContent    = new Date(r.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  // Badge
  const badgeEl = document.getElementById('track-badge');
  const labels  = { new:'New', in_progress:'In Progress', done:'Completed', cancelled:'Cancelled' };
  badgeEl.className    = `badge badge-${r.status}`;
  badgeEl.textContent  = labels[r.status] || r.status;

  // Timeline
  const steps = ['new','in_progress','done'];
  const si    = steps.indexOf(r.status);
  steps.forEach((s, i) => {
    const step = document.getElementById(`tl-${s}`);
    if (!step) return;
    step.classList.remove('done','active');
    if (i < si || r.status === 'done')      step.classList.add('done');
    else if (i === si && r.status !== 'done') step.classList.add('active');
  });

  document.getElementById('track-result').classList.add('show');
}

/* Allow Enter key on tracking input */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('track-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') trackOrder();
  });
  initBars();
  checkReveal();
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

/* Spin animation for loading state */
const style = document.createElement('style');
style.textContent = `.spin { animation: spin .8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
