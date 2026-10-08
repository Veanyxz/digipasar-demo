/* DigiPasar — login.html & register.html */
document.addEventListener('DOMContentLoaded', async () => {
  await renderNavbar();

  const isRegister = document.body.dataset.page === 'register';
  const next = new URLSearchParams(location.search).get('next') || '/index.html';

  const cfg = await loadConfig();
  initTurnstile(cfg.turnstileSiteKey);
  initGoogle(cfg, next);

  const form = document.getElementById('authForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (isRegister) {
      const name = document.getElementById('name').value.trim();
      const password2 = document.getElementById('password2').value;
      if (!name) { toast('Nama wajib diisi.', 'error'); return; }
      if (password.length < 6) { toast('Password minimal 6 karakter.', 'error'); return; }
      if (password !== password2) { toast('Konfirmasi password tidak cocok.', 'error'); return; }
    } else if (!password) {
      toast('Password wajib diisi.', 'error'); return;
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = isRegister ? 'Mendaftarkan…' : 'Masuk…';

    try {
      const token = getTurnstileToken();
      const body = isRegister
        ? { name: document.getElementById('name').value.trim(), email, password, turnstile: token }
        : { email, password, turnstile: token };
      const r = await api(isRegister ? '/auth/register' : '/auth/login', 'POST', body);
      resetTurnstile();
      if (r.ok) {
        toast(isRegister ? 'Pendaftaran berhasil! Mengalihkan…' : 'Login berhasil! Mengalihkan…', 'success');
        setTimeout(() => { location.href = next; }, 700);
      } else {
        toast(r.error || 'Terjadi kesalahan. Coba lagi.', 'error');
      }
    } finally {
      btn.disabled = false;
      btn.textContent = isRegister ? 'Daftar Sekarang' : 'Masuk';
    }
  });
});

/* ---------- Cloudflare Turnstile (explicit render) ---------- */
function initTurnstile(sitekey) {
  const el = document.getElementById('turnstile');
  if (!el) return;
  if (!sitekey) { el.style.display = 'none'; return; }
  const tryRender = () => {
    if (window.turnstile && typeof window.turnstile.render === 'function') {
      try { window._tsWidget = window.turnstile.render(el, { sitekey }); }
      catch (err) { /* biarkan kosong */ }
    } else {
      setTimeout(tryRender, 250);
    }
  };
  tryRender();
}
function getTurnstileToken() {
  try {
    if (window.turnstile && typeof window._tsWidget !== 'undefined' && window._tsWidget !== null) {
      return window.turnstile.getResponse(window._tsWidget) || '';
    }
  } catch (e) { /* abaikan */ }
  return '';
}
function resetTurnstile() {
  try {
    if (window.turnstile && typeof window._tsWidget !== 'undefined' && window._tsWidget !== null) {
      window.turnstile.reset(window._tsWidget);
    }
  } catch (e) { /* abaikan */ }
}

/* ---------- Google Identity Services ---------- */
function initGoogle(cfg, next) {
  const wrap = document.getElementById('googleWrap');
  if (!wrap) return;
  if (!cfg.googleEnabled || !cfg.googleClientId) { wrap.style.display = 'none'; return; }
  const tryInit = () => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: (resp) => handleGoogleCredential(resp, next)
      });
      window.google.accounts.id.renderButton(document.getElementById('googleBtn'), {
        theme: 'outline', size: 'large', width: 320, text: 'signin_with', shape: 'rectangular'
      });
    } else {
      setTimeout(tryInit, 250);
    }
  };
  tryInit();
}
async function handleGoogleCredential(resp, next) {
  if (!resp || !resp.credential) { toast('Login Google dibatalkan.', 'error'); return; }
  const r = await api('/auth/google', 'POST', { credential: resp.credential });
  if (r.ok) {
    toast('Login Google berhasil! Mengalihkan…', 'success');
    setTimeout(() => { location.href = next; }, 700);
  } else {
    toast(r.error || 'Login Google gagal.', 'error');
  }
}
