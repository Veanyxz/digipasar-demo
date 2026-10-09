/* ============================================================
   DigiPasar — shared helpers (dipakai semua halaman)
   ============================================================ */
const API_BASE = '/api';

/** Fetch wrapper: selalu kirim cookie sesi. */
async function api(path, method = 'GET', body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(API_BASE + path, opts);
  } catch (e) {
    return { ok: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' };
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* abaikan */ }
  if (!res.ok && res.status === 401) {
    return { ok: false, unauthorized: true, error: (data && data.error) || 'Sesi berakhir, silakan login kembali.' };
  }
  return data || { ok: false, error: 'Respon server tidak valid.' };
}

/** Format angka menjadi Rupiah, cth: 150000 -> "Rp150.000" */
function formatRupiah(n) {
  const v = Number(n) || 0;
  return 'Rp' + v.toLocaleString('id-ID');
}

/** Escape HTML untuk mencegah XSS pada data dinamis. */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/** Toast notifikasi kecil di bawah layar. */
function toast(msg, type = 'info') {
  let c = document.getElementById('toastBox');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toastBox';
    c.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center px-4 w-full max-w-md pointer-events-none';
    document.body.appendChild(c);
  }
  const colors = {
    info: '',
    success: 'toast-success',
    error: 'toast-error'
  };
  const el = document.createElement('div');
  el.className = ('toast ' + (colors[type] || '')).trim();
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 320);
  }, 2800);
}

/* ---------- Konfigurasi server (cache) ---------- */
let _config = null;
async function loadConfig() {
  if (_config) return _config;
  const r = await api('/config');
  _config = (r && r.ok) ? r : {};
  return _config;
}

/* ---------- Gradien konsisten per produk ---------- */
const GRADIENTS = [
  ['#7c3aed', '#d946ef'], ['#2563eb', '#06b6d4'], ['#059669', '#84cc16'],
  ['#ea580c', '#f59e0b'], ['#db2777', '#7c3aed'], ['#0891b2', '#22c55e'],
  ['#4f46e5', '#a855f7'], ['#b45309', '#ef4444'], ['#0d9488', '#3b82f6'],
  ['#9333ea', '#ec4899'], ['#16a34a', '#06b6d4'], ['#c026d3', '#6366f1']
];
function gradientFor(id) {
  const s = String(id ?? 'x');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

/* ---------- Status pesanan ---------- */
const STATUS_META = {
  pending:            { label: 'Menunggu Pembayaran', cls: 'badge-pending' },
  menunggu_verifikasi:{ label: 'Menunggu Verifikasi', cls: 'badge-verifikasi' },
  diproses:           { label: 'Diproses',             cls: 'badge-diproses' },
  selesai:            { label: 'Selesai',              cls: 'badge-selesai' },
  dibatalkan:         { label: 'Dibatalkan',           cls: 'badge-batal' }
};
function statusBadge(s) {
  const m = STATUS_META[s] || { cls: 'badge-plain' };
  const label = STATUS_META[s] ? t('status.' + s) : s;
  return `<span class="badge ${m.cls}">${esc(label)}</span>`;
}

/* ---------- Metode pembayaran ---------- */
const PAYMENT_METHODS = {
  midtrans: {
    label: 'Midtrans (Otomatis)', icon: '💳', short: 'QRIS, VA Bank, E-Wallet, Gerai — verifikasi otomatis',
    instruction: 'Jendela pembayaran Midtrans akan terbuka: pilih QRIS, Virtual Account, E-Wallet, atau gerai retail favoritmu. Masukkan nominal persis <b>{total}</b>. Status pesanan terverifikasi <b>otomatis</b> setelah pembayaran.'
  },
  qris: {
    label: 'QRIS', icon: '📱', short: 'Scan QR dari e-wallet / m-banking apa pun',
    instruction: 'Buka aplikasi e-wallet atau m-banking apa pun, pilih <b>Scan QRIS</b>, lalu pindai kode QR yang dikirim ke email Anda. Masukkan nominal persis <b>{total}</b>.'
  },
  bca: {
    label: 'Transfer Bank BCA', icon: '🏦', short: 'Transfer ke Virtual Account BCA',
    instruction: 'Transfer ke <b>BCA Virtual Account 8808 1234 5678</b> a.n. DigiPasar sebesar <b>{total}</b>. Verifikasi otomatis maksimal 5 menit setelah transfer.'
  },
  dana: {
    label: 'DANA', icon: '💰', short: 'Kirim ke nomor DANA merchant',
    instruction: 'Kirim ke nomor DANA <b>0812-3456-7890</b> a.n. DigiPasar sebesar <b>{total}</b>, lalu simpan bukti transfer. Cantumkan nomor invoice <b>{invoice}</b> pada catatan.'
  }
};
function paymentInstruction(key, order) {
  const m = PAYMENT_METHODS[key];
  const label = (order && order.paymentLabel) || (m && m.label) || key || '-';
  let ins = m ? m.instruction : 'Ikuti instruksi pembayaran yang dikirim ke email Anda.';
  if (order) {
    ins = ins.split('{total}').join('<b>' + formatRupiah(order.total) + '</b>')
             .split('{invoice}').join('<b>' + esc(order.invoice) + '</b>');
  }
  return { label, instruction: ins, icon: (m && m.icon) || '💳' };
}

/* ---------- Tanggal ---------- */
function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return iso || '-'; }
}

/* ---------- Kartu produk ---------- */
function productCard(p) {
  const [g1, g2] = gradientFor(p.id ?? p.slug);
  const hasDisc = p.discountPrice && Number(p.discountPrice) < Number(p.price);
  const badgeCls = p.badge === 'PROMO' ? 'p-badge' : 'p-badge alt';
  return `
  <a href="/product.html?slug=${encodeURIComponent(p.slug)}" class="p-card">
    <div class="p-cover" style="background:linear-gradient(135deg,${g1},${g2})">
      ${p.badge ? `<span class="${badgeCls}">${esc(p.badge)}</span>` : ''}
      ${p.image ? `<img class="p-img${/\.png$/i.test(p.image) ? ' contain' : ''}" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
                : `<span class="p-emoji">${esc(p.emoji || '📦')}</span>`}
    </div>
    <div class="p-body">
      <div class="p-cat">${esc(p.category || '')}</div>
      <div class="p-name line-clamp-2">${esc(p.name)}</div>
      <div class="p-meta">
        <span class="p-star">★ ${Number(p.rating || 0).toFixed(1)}</span>
        <span>•</span>
        <span>${esc(t('card.sold', { n: Number(p.sold || 0).toLocaleString('id-ID') }))}</span>
      </div>
      <div class="mt-2" style="margin-top:auto;padding-top:.55rem">
        ${hasDisc ? `<div class="tiny line-through-old">${formatRupiah(p.price)}</div>` : ''}
        <div class="price" style="font-size:1.1rem">${formatRupiah(hasDisc ? p.discountPrice : p.price)}</div>
      </div>
    </div>
  </a>`;
}

/* ---------- Keranjang (localStorage) ---------- */
function cartGet() { try { return JSON.parse(localStorage.getItem('dp_cart') || '[]'); } catch (e) { return []; } }
function cartSet(a) {
  localStorage.setItem('dp_cart', JSON.stringify(a));
  updateCartBadge();
  document.dispatchEvent(new Event('dp:cart'));
}
function cartAdd(item) {
  const a = cartGet();
  const m = a.find(x => x.variantId === item.variantId);
  if (m) m.qty = Math.min(99, m.qty + (item.qty || 1));
  else a.push({ variantId: item.variantId, slug: item.slug, name: item.name, variantName: item.variantName || '', price: Number(item.price) || 0, qty: Math.min(99, item.qty || 1), image: item.image || '', emoji: item.emoji || '📦', fields: item.fields || [] });
  cartSet(a);
  toast(t('cart.added'), 'success');
}
function cartCount() { return cartGet().reduce((s, x) => s + x.qty, 0); }
function cartSubtotal() { return cartGet().reduce((s, x) => s + x.price * x.qty, 0); }
function cartClear() { cartSet([]); }
function updateCartBadge() {
  const n = cartCount();
  const txt = n > 99 ? '99+' : String(n);
  for (const el of [document.getElementById('cartCount'), document.getElementById('bnavCart')]) {
    if (!el) continue;
    el.textContent = txt;
    el.classList.toggle('hidden', n === 0);
  }
}

/* ---------- Navigasi ke katalog (tanpa reload kalau masih di index) ---------- */
function goCatalog(state) {
  const onHome = /\/(index\.html)?\/?$/.test(location.pathname);
  if (onHome) {
    document.dispatchEvent(new CustomEvent('dp:catalog', { detail: state || {} }));
    const k = document.getElementById('katalog');
    if (k) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      k.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  } else {
    const p = new URLSearchParams();
    const s = state || {};
    if (s.q) p.set('q', s.q);
    if (s.cat) p.set('cat', s.cat);
    if (s.sort && s.sort !== 'populer') p.set('sort', s.sort);
    const qs = p.toString();
    location.href = '/index.html' + (qs ? '?' + qs : '') + '#katalog';
  }
}

/* ---------- Laci keranjang ---------- */
function ensureCartDrawer() {
  if (document.getElementById('cartDrawer')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div id="cartOverlay" class="cart-overlay hidden"></div>
    <aside id="cartDrawer" class="cart-drawer hidden" aria-label="${esc(t('cart.title'))}">
      <div class="cd-head">
        <strong>🛒 ${esc(t('cart.title'))}</strong>
        <button id="cartClose" class="icon-btn" aria-label="${esc(t('common.close'))}">✕</button>
      </div>
      <div id="cartItems" class="cd-items"></div>
      <div class="cd-foot">
        <div class="cd-total"><span class="tiny muted" style="font-weight:700">${esc(t('cart.subtotal'))}</span><span class="price" id="cartSub"></span></div>
        <button id="cartCheckout" class="btn btn-primary btn-block">${esc(t('cart.checkout'))}</button>
      </div>
    </aside>`;
  document.body.appendChild(wrap);
  document.getElementById('cartClose').addEventListener('click', closeCartDrawer);
  document.getElementById('cartOverlay').addEventListener('click', closeCartDrawer);
  document.getElementById('cartCheckout').addEventListener('click', () => {
    if (!cartCount()) { toast(t('cart.empty'), 'error'); return; }
    location.href = '/checkout.html?cart=1';
  });
  document.addEventListener('dp:cart', renderCartDrawer);
}
function renderCartDrawer() {
  const box = document.getElementById('cartItems');
  if (!box) return;
  const items = cartGet();
  document.getElementById('cartSub').textContent = formatRupiah(cartSubtotal());
  if (!items.length) { box.innerHTML = `<p class="muted tiny" style="padding:1rem;text-align:center">${esc(t('cart.empty'))}</p>`; return; }
  box.innerHTML = items.map((x, i) => `
    <div class="cd-item">
      <div class="cd-thumb">${x.image ? `<img class="p-img${/\.png$/i.test(x.image) ? ' contain' : ''}" src="${esc(x.image)}" alt="">` : esc(x.emoji)}</div>
      <div class="cd-info">
        <div class="cd-name">${esc(x.name)}</div>
        ${x.variantName ? `<div class="tiny muted">${esc(x.variantName)}</div>` : ''}
        <div class="price tiny">${formatRupiah(x.price)}</div>
        <div class="cd-qty">
          <button data-dec="${i}" aria-label="-">−</button><span>${x.qty}</span><button data-inc="${i}" aria-label="+">+</button>
          <button class="cd-rm" data-rm="${i}">${esc(t('cart.remove'))}</button>
        </div>
      </div>
    </div>`).join('');
  box.querySelectorAll('[data-inc]').forEach(b => b.addEventListener('click', () => { const a = cartGet(); a[b.dataset.inc].qty = Math.min(99, a[b.dataset.inc].qty + 1); cartSet(a); }));
  box.querySelectorAll('[data-dec]').forEach(b => b.addEventListener('click', () => { const a = cartGet(); a[b.dataset.dec].qty--; if (a[b.dataset.dec].qty < 1) a.splice(b.dataset.dec, 1); cartSet(a); }));
  box.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { const a = cartGet(); a.splice(b.dataset.rm, 1); cartSet(a); }));
}
function openCartDrawer() {
  ensureCartDrawer(); renderCartDrawer();
  document.getElementById('cartOverlay').classList.remove('hidden');
  document.getElementById('cartDrawer').classList.remove('hidden');
  const dOpen = document.getElementById('cartDrawer'); void dOpen.offsetWidth; dOpen.classList.add('open');
}
function closeCartDrawer() {
  const d = document.getElementById('cartDrawer'), o = document.getElementById('cartOverlay');
  if (!d) return;
  d.classList.remove('open');
  setTimeout(() => { d.classList.add('hidden'); o.classList.add('hidden'); }, 180);
}

/* ---------- Panel notifikasi (promo admin + update transaksi) ---------- */
async function openNotif(btn) {
  let panel = document.getElementById('notifPanel');
  if (panel && !panel.classList.contains('hidden')) { panel.classList.add('hidden'); return; }
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'notifPanel'; panel.className = 'notif-panel hidden';
    document.body.appendChild(panel);
  }
  panel.classList.remove('hidden');
  panel.innerHTML = `<div class="np-head"><strong>🔔 ${esc(t('nav.notif'))}</strong></div><div class="np-body"><p class="muted tiny">...</p></div>`;
  const me = await api('/auth/me');
  const body = panel.querySelector('.np-body');
  if (!me.ok || !me.user) {
    body.innerHTML = `<p class="muted tiny">${esc(t('notif.login'))}</p>
      <a href="/login.html" class="btn btn-primary btn-sm btn-block">${esc(t('nav.login'))}</a>`;
    return;
  }
  const r = await api('/notifications');
  if (!r.ok || !Array.isArray(r.items)) {
    body.innerHTML = `<p class="muted tiny">${esc(t('notif.empty'))}</p>`;
    return;
  }
  if (!r.items.length) {
    body.innerHTML = `<p class="muted tiny">${esc(t('notif.empty'))}</p>`;
    return;
  }
  body.innerHTML = r.items.slice(0, 20).map(it => {
    const badge = it.type === 'order' && it.status ? statusBadge(it.status) : '';
    const unread = (it.type === 'promo' && !it.read) ? ' np-unread' : '';
    const inner = `
      <div class="np-ico">${esc(it.icon || (it.type === 'order' ? '🧾' : '📣'))}</div>
      <div class="np-txt">
        <div class="flex items-center justify-between gap-2">
          <span class="np-title">${esc(it.title)}</span>${badge}
        </div>
        ${it.body ? `<div class="tiny muted">${esc(it.body)}</div>` : ''}
        <div class="tiny muted">${formatDate(it.createdAt)}</div>
      </div>`;
    return it.type === 'order'
      ? `<a class="np-item${unread}" href="/order.html?id=${encodeURIComponent(it.orderId)}">${inner}</a>`
      : `<div class="np-item${unread}">${inner}</div>`;
  }).join('');

  // tandai dibaca: promo via server, transaksi via timestamp lokal
  const unreadPromo = r.items.filter(i => i.type === 'promo' && !i.read).map(i => i.key);
  if (unreadPromo.length) api('/notifications/read', 'POST', { ids: unreadPromo });
  localStorage.setItem('dp_seen', new Date().toISOString().slice(0, 19).replace('T', ' '));
  const dot = document.getElementById('notifDot');
  if (dot) dot.classList.add('hidden');
}
function updateNotifDot() {
  const dot = document.getElementById('notifDot');
  if (!dot) return;
  const seen = localStorage.getItem('dp_seen') || '';
  api('/notifications').then(r => {
    if (!r.ok || !Array.isArray(r.items)) return; // anon = 401, biarkan tersembunyi
    const n = r.items.filter(i => i.type === 'order'
      ? String(i.createdAt || '') > seen
      : !i.read).length;
    dot.textContent = n > 9 ? '9+' : String(n);
    dot.classList.toggle('hidden', n === 0);
  });
}

/* ---------- Header baru ---------- */
async function renderNavbar() {
  const root = document.getElementById('hdRoot');
  if (!root) return;

  // kategori (dropdown)
  let cats = [];
  try {
    const r = await api('/categories');
    if (r.ok && r.categories) cats = r.categories;
  } catch (e) { /* tetap render tanpa kategori */ }

  root.innerHTML = `
    <div class="hd-row">
      <button class="hd-burger" id="hdBurger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="hdNav"><i></i><i></i><i></i></button>
      <a href="/index.html" class="logo">
        <span class="logo-mark">⚡</span>
        <span class="logo-text">Digi<span class="logo-accent">Pasar</span></span>
      </a>
      <nav class="hd-nav" id="hdNav">
        <a href="/index.html#katalog" class="hd-link" data-go-katalog>${esc(t('nav.katalog'))}</a>
        <div class="hd-drop" id="katDrop">
          <button class="hd-link" id="katBtn" type="button">${esc(t('nav.kategori'))} <span class="caret">▾</span></button>
          <div class="hd-menu hidden" id="katMenu">
            <button data-cat="" class="hd-mi">${esc(t('nav.semua_kategori'))}</button>
            ${cats.map(c => `<button data-cat="${esc(c.icon)}" data-slug="${esc(c.slug)}" class="hd-mi">${esc(c.icon || '📦')} ${esc(c.name)}</button>`).join('')}
          </div>
        </div>
      </nav>
      <form id="hdSearch" class="nav-search">
        <input type="text" data-i18n-ph="nav.search_ph" placeholder="${esc(t('nav.search_ph'))}" aria-label="Cari">
        <button class="search-btn" type="submit" aria-label="Cari">🔍</button>
      </form>
      <div class="hd-actions">
        <div class="lang-toggle" role="group" aria-label="Language">
          <button data-lang="id" class="${lang() === 'id' ? 'active' : ''}">ID</button>
          <button data-lang="en" class="${lang() === 'en' ? 'active' : ''}">EN</button>
        </div>
        <button class="icon-btn" id="notifBtn" title="${esc(t('nav.notif'))}" aria-label="${esc(t('nav.notif'))}">🔔<span class="ic-badge hidden" id="notifDot"></span></button>
        <button class="icon-btn" id="cartBtn" title="${esc(t('nav.cart'))}" aria-label="${esc(t('nav.cart'))}">🛒<span class="ic-badge hidden" id="cartCount"></span></button>
        <div id="navAuth" class="nav-auth"></div>
      </div>
    </div>
    <div class="nav-mobile">
      <form data-nav-search class="nav-search">
        <input type="text" data-i18n-ph="nav.search_ph" placeholder="${esc(t('nav.search_ph'))}" aria-label="Cari">
        <button class="search-btn" type="submit" aria-label="Cari">🔍</button>
      </form>
    </div>`;

  // ---- lang-toggle: di mobile pindah ke panel burger, di desktop ke hd-actions
  const langBox = root.querySelector('.lang-toggle');
  const mqMob = window.matchMedia('(max-width: 767px)');
  function placeLang() {
    const nav = root.querySelector('#hdNav'), actions = root.querySelector('.hd-actions');
    if (!langBox || !nav || !actions) return;
    if (mqMob.matches) { if (langBox.parentElement !== nav) nav.appendChild(langBox); }
    else if (langBox.parentElement !== actions) actions.insertBefore(langBox, root.querySelector('#navAuth'));
  }
  placeLang();
  mqMob.addEventListener('change', placeLang);

  // ---- burger mobile: .hd-nav jadi panel dropdown vertikal ----
  const burger = root.querySelector('#hdBurger');
  const setPanel = (open) => {
    root.classList.toggle('hd-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  burger.addEventListener('click', e => { e.stopPropagation(); setPanel(!root.classList.contains('hd-open')); });
  document.addEventListener('click', e => {
    if (root.classList.contains('hd-open') && !root.contains(e.target)) setPanel(false);
  });
  root.querySelectorAll('#hdNav a, #hdNav .hd-mi').forEach(el =>
    el.addEventListener('click', () => setPanel(false)));

  // ---- bottom navigation ala mastumbas (tampil di mobile via CSS) ----
  if (!document.getElementById('bnav')) {
    const onHome = location.pathname === '/' || location.pathname === '/index.html';
    const bn = document.createElement('nav');
    bn.id = 'bnav';
    bn.setAttribute('aria-label', 'Navigasi bawah');
    bn.innerHTML = `
      <a href="/index.html" class="bnav-item${onHome ? ' active' : ''}"><span class="bnav-ico">🏠</span><span>${esc(t('nav.home'))}</span></a>
      <button type="button" class="bnav-item" data-bnav="catalog"><span class="bnav-ico">🧭</span><span>${esc(t('nav.katalog'))}</span></button>
      <button type="button" class="bnav-item" data-bnav="cart"><span class="bnav-ico">🛒</span><span>${esc(t('nav.cart'))}</span><b class="bnav-badge hidden" id="bnavCart"></b></button>
      <button type="button" class="bnav-item" data-bnav="account" data-href="/login.html"><span class="bnav-ico">👤</span><span>${esc(t('nav.account'))}</span></button>`;
    document.body.appendChild(bn);
    bn.querySelector('[data-bnav="catalog"]').addEventListener('click', () => goCatalog({}));
    bn.querySelector('[data-bnav="cart"]').addEventListener('click', openCartDrawer);
    bn.querySelector('[data-bnav="account"]').addEventListener('click', () => { location.href = bn.querySelector('[data-bnav="account"]').dataset.href; });
  }

  // pencarian (langsung ke katalog, tanpa reload kalau masih di index)
  root.querySelectorAll('#hdSearch, [data-nav-search]').forEach(f => {
    f.addEventListener('submit', e => {
      e.preventDefault();
      const v = f.querySelector('input').value.trim();
      goCatalog({ q: v });
    });
  });

  // dropdown kategori
  const katBtn = document.getElementById('katBtn'), katMenu = document.getElementById('katMenu');
  katBtn.addEventListener('click', e => { e.stopPropagation(); katMenu.classList.toggle('hidden'); });
  document.addEventListener('click', e => { if (!katMenu.contains(e.target)) katMenu.classList.add('hidden'); });
  katMenu.querySelectorAll('[data-slug], [data-cat=""]').forEach(b => {
    b.addEventListener('click', () => { katMenu.classList.add('hidden'); goCatalog({ cat: b.dataset.slug || '' }); });
  });
  root.querySelector('[data-go-katalog]').addEventListener('click', e => { e.preventDefault(); goCatalog({}); });

  // logo: kalau sudah di beranda, jangan reload (blink) — scroll halus / bounce
  root.querySelector('.logo').addEventListener('click', e => {
    const onHome = location.pathname === '/' || location.pathname === '/index.html';
    if (!onHome) return; // halaman lain: biarkan navigasi (dihaluskan view-transition CSS)
    e.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (window.scrollY > 6) {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    } else {
      // sudah di atas: kasih feedback biar klik terasa
      const logo = root.querySelector('.logo');
      logo.classList.remove('bounce');
      void logo.offsetWidth;              // reflow agar animasi bisa diputar ulang
      logo.classList.add('bounce');
    }
  });

  // bahasa
  root.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { if (b.dataset.lang !== lang()) setLang(b.dataset.lang); }));

  // notif & keranjang
  document.getElementById('notifBtn').addEventListener('click', e => { e.stopPropagation(); openNotif(e.currentTarget); });
  document.addEventListener('click', e => {
    const p = document.getElementById('notifPanel');
    if (p && !p.classList.contains('hidden') && !p.contains(e.target)) p.classList.add('hidden');
  });
  document.getElementById('cartBtn').addEventListener('click', openCartDrawer);
  updateCartBadge();
  updateNotifDot();

  // menu user
  const box = document.getElementById('navAuth');
  const me = await api('/auth/me');
  if (me.ok && me.user) {
    const u = me.user;
    box.innerHTML = `
      <div class="user-menu">
        <button id="userBtn" class="user-btn">
          <span class="avatar avatar-sm">${esc((u.name || 'U').charAt(0).toUpperCase())}</span>
          <span class="hd-uname">${esc(u.name)}</span>
          <span class="muted tiny">▾</span>
        </button>
        <div id="userDrop" class="user-drop hidden">
          <div class="ud-head">
            <div class="text-sm font-semibold truncate">${esc(u.name)}</div>
            <div class="tiny muted truncate">${esc(u.email)}</div>
          </div>
          <a href="/dashboard.html">📊 ${esc(t('nav.dashboard'))}</a>
          ${u.role === 'admin' ? `<a href="/admin.html">🛠️ ${esc(t('nav.admin'))}</a>` : ''}
          <button id="logoutBtn" class="danger">🚪 ${esc(t('nav.logout'))}</button>
        </div>
      </div>`;
    const btn = document.getElementById('userBtn');
    const drop = document.getElementById('userDrop');
    btn.addEventListener('click', e => { e.stopPropagation(); drop.classList.toggle('hidden'); });
    document.addEventListener('click', () => drop.classList.add('hidden'));
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await api('/auth/logout', 'POST');
      location.href = '/index.html';
    });
  } else {
    box.innerHTML = `
      <a href="/login.html" class="btn btn-sm">${esc(t('nav.login'))}</a>
      <a href="/register.html" class="btn btn-primary btn-sm hd-reg">${esc(t('nav.register'))}</a>`;
  }

  // bottom nav: tujuan item Akun mengikuti status login
  const bAcc = document.querySelector('[data-bnav="account"]');
  if (bAcc) bAcc.dataset.href = (me.ok && me.user)
    ? (me.user.role === 'admin' ? '/admin.html' : '/dashboard.html')
    : '/login.html';
}

/** Pastikan user login; jika belum, lempar ke login.html. Kembalikan user atau null. */
async function requireAuth(next) {
  const me = await api('/auth/me');
  if (!me.ok) {
    const dest = next || (location.pathname + location.search);
    location.href = '/login.html?next=' + encodeURIComponent(dest);
    return null;
  }
  return me.user;
}

/* ---------- Midtrans Snap ---------- */
// Memuat snap.js sekali saja. Kembalikan true jika siap.
let _snapLoading = null;
async function loadSnapJs() {
  if (window.snap) return true;
  if (_snapLoading) return _snapLoading;
  const cfg = await loadConfig();
  if (!cfg.midtransEnabled || !cfg.midtransClientKey) {
    toast('Pembayaran Midtrans belum dikonfigurasi.', 'error');
    return false;
  }
  _snapLoading = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = (cfg.midtransIsProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com') + '/snap/snap.js';
    s.setAttribute('data-client-key', cfg.midtransClientKey);
    s.onload = () => resolve(true);
    s.onerror = () => { toast('Gagal memuat Midtrans. Periksa koneksi.', 'error'); resolve(false); };
    document.head.appendChild(s);
  });
  return _snapLoading;
}

// Buka popup pembayaran Snap.
// cb = { onDone(): sukses/pending -> lanjut, onClose(): popup ditutup manual }
async function payWithSnap(snapToken, cb) {
  const ready = await loadSnapJs();
  if (!ready || !window.snap) return;
  window.snap.pay(snapToken, {
    onSuccess: () => { toast('Pembayaran berhasil! Memverifikasi…', 'success'); setTimeout(() => cb.onDone(), 1200); },
    onPending: () => { toast('Menunggu pembayaran Anda…', 'info'); setTimeout(() => cb.onDone(), 1200); },
    onError: () => toast('Pembayaran gagal. Silakan coba lagi.', 'error'),
    onClose: () => { toast('Jendela pembayaran ditutup. Lanjutkan dari halaman invoice.', 'info'); setTimeout(() => cb.onClose(), 1200); },
  });
}