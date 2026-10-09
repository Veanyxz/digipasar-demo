/* DigiPasar — halaman utama (index.html)
   Katalog state-based: filter/kategori/pencarian TANPA reload halaman. */
document.addEventListener('DOMContentLoaded', async () => {
  await renderNavbar();

  const P = new URLSearchParams(location.search);
  const DEF = { q: '', cat: '', sort: 'populer', page: 1, min: '', max: '' };
  const S = {
    q: P.get('q') || '', cat: P.get('cat') || '', sort: P.get('sort') || 'populer',
    page: Math.max(1, parseInt(P.get('page') || '1', 10) || 1),
    min: P.get('min') || '', max: P.get('max') || '', limit: 12,
  };
  let cats = [];

  function syncUrl() {
    const p = new URLSearchParams();
    if (S.q) p.set('q', S.q);
    if (S.cat) p.set('cat', S.cat);
    if (S.sort !== 'populer') p.set('sort', S.sort);
    if (S.page > 1) p.set('page', String(S.page));
    if (S.min) p.set('min', S.min);
    if (S.max) p.set('max', S.max);
    const qs = p.toString();
    history.replaceState(null, '', '/index.html' + (qs ? '?' + qs : ''));
  }

  function applyState(patch) {
    const keys = Object.keys(patch || {});
    Object.assign(S, patch);
    if (keys.some(k => k !== 'page')) S.page = 1;
    syncUrl();
    renderPills();
    renderGrid();
  }

  // dipanggil header (dropdown kategori / pencarian) — tanpa reload
  document.addEventListener('dp:catalog', e => applyState(e.detail || {}));

  // pencarian hero
  const heroForm = document.getElementById('heroSearch');
  if (heroForm) {
    const input = heroForm.querySelector('input');
    if (S.q) input.value = S.q;
    heroForm.addEventListener('submit', e => {
      e.preventDefault();
      goCatalog({ q: input.value.trim() });   // event dp:catalog + scroll halus
    });
  }

  // grid kategori + pills
  try {
    const cr = await api('/categories');
    if (cr.ok && cr.categories) {
      cats = cr.categories;
      const grid = document.getElementById('homeCats');
      if (grid) {
        grid.innerHTML = cats.map(c => `
          <button data-slug="${esc(c.slug)}" class="cat-card" type="button">
            <span class="cat-ico">${esc(c.icon || '📦')}</span>
            <div class="cat-name">${esc(c.name)}</div>
          </button>`).join('');
        grid.querySelectorAll('[data-slug]').forEach(b =>
          b.addEventListener('click', () => goCatalog({ cat: b.dataset.slug })));
      }
    }
  } catch (e) { /* kategori opsional */ }

  function renderPills() {
    const pills = document.getElementById('catPills');
    if (!pills || !cats.length) return;
    const pill = (slug, label) => `
      <button data-cat="${esc(slug)}" type="button"
        class="chip ${S.cat === slug ? 'active' : ''}">${esc(label)}</button>`;
    pills.innerHTML = pill('', '🌐 ' + t('filter.all')) +
      cats.map(c => pill(c.slug, (c.icon || '') + ' ' + c.name)).join('');
    pills.querySelectorAll('button').forEach(b =>
      b.addEventListener('click', () => applyState({ cat: b.dataset.cat })));
  }

  // produk terlaris
  try {
    const bs = await api('/products?sort=populer&limit=8');
    const el = document.getElementById('bestSellers');
    if (el) {
      el.innerHTML = (bs.ok && bs.items && bs.items.length)
        ? bs.items.map(productCard).join('')
        : `<p class="col-span-full muted tiny">${t('filter.empty')}</p>`;
    }
  } catch (e) { /* abaikan */ }

  // sort
  const sortSel = document.getElementById('sortSel');
  if (sortSel) {
    sortSel.value = S.sort;
    sortSel.addEventListener('change', () => applyState({ sort: sortSel.value }));
  }

  // harga
  const minEl = document.getElementById('minPrice'), maxEl = document.getElementById('maxPrice');
  if (minEl) minEl.value = S.min;
  if (maxEl) maxEl.value = S.max;
  const applyPrice = () => applyState({ min: (minEl.value || '').trim(), max: (maxEl.value || '').trim() });
  const okBtn = document.getElementById('applyPrice');
  if (okBtn) okBtn.addEventListener('click', applyPrice);
  [minEl, maxEl].forEach(el => el && el.addEventListener('keydown', e => { if (e.key === 'Enter') applyPrice(); }));

  // reset
  const clearBtn = document.getElementById('clearFilter');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (minEl) minEl.value = '';
      if (maxEl) maxEl.value = '';
      const hdIn = document.querySelector('#hdSearch input, [data-nav-search] input');
      if (hdIn) hdIn.value = '';
      Object.assign(S, DEF);
      syncUrl(); renderPills(); renderGrid();
    });
  }

  // render grid katalog
  let seq = 0;
  async function renderGrid() {
    const my = ++seq;
    const grid = document.getElementById('exploreGrid');
    const pager = document.getElementById('pager');
    const qp = new URLSearchParams({ sort: S.sort, page: String(S.page), limit: String(S.limit) });
    if (S.q) qp.set('q', S.q);
    if (S.cat) qp.set('cat', S.cat);
    if (S.min) qp.set('min', S.min);
    if (S.max) qp.set('max', S.max);
    // jangan kosongkan grid (blink!) — redupkan sementara, konten lama tetap ada
    if (grid) grid.classList.add('is-loading');

    try {
      const r = await api('/products?' + qp.toString());
      if (my !== seq) return; // hasil lama, buang (grid diurus render berikutnya)

      const info = document.getElementById('filterInfo');
      if (info) {
        const parts = [];
        if (S.q) parts.push(t('filter.searching', { q: S.q }));
        if (S.cat) parts.push(t('filter.in_cat'));
        info.textContent = parts.length ? t('filter.result') + ': ' + parts.join(' • ') : '';
      }
      const cnt = document.getElementById('prodCount');
      if (cnt && r.ok) cnt.textContent = t('filter.count', { n: Number(r.total || 0).toLocaleString('id-ID') });

      if (grid) {
        if (r.ok && r.items && r.items.length) {
          grid.innerHTML = r.items.map(productCard).join('');
        } else {
          grid.innerHTML = `<p class="col-span-full muted tiny py-8 text-center">${t('filter.empty')}</p>`;
        }
        grid.classList.remove('is-loading');
      }
      if (pager && r.ok) {
        const totalPages = Math.max(1, Math.ceil((r.total || 0) / S.limit));
        if (totalPages > 1) {
          let nums = '';
          for (let i = 1; i <= totalPages && i <= 7; i++) {
            nums += `<button data-p="${i}" class="btn btn-sm ${i === S.page ? 'btn-primary' : ''}" style="min-width:2.5rem;height:2.5rem;padding:0">${i}</button>`;
          }
          pager.innerHTML = `
            <button data-p="${S.page - 1}" ${S.page <= 1 ? 'disabled' : ''} class="btn btn-sm">‹ Prev</button>
            ${nums}
            <button data-p="${S.page + 1}" ${S.page >= totalPages ? 'disabled' : ''} class="btn btn-sm">Next ›</button>`;
          pager.querySelectorAll('button[data-p]').forEach(b => {
            if (!b.disabled) b.addEventListener('click', () => {
              applyState({ page: Number(b.dataset.p) });
              const k = document.getElementById('katalog');
              if (k) k.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          });
        } else if (pager) {
          pager.innerHTML = '';
        }
      }
    } catch (e) {
      if (my === seq && grid) {
        grid.innerHTML = `<p class="col-span-full muted tiny">${esc(e.message || 'Gagal memuat produk.')}</p>`;
        grid.classList.remove('is-loading');
      }
    }
  }

  // render awal
  renderPills();
  syncUrl();
  renderGrid();

  // tautan anchor lama (#jelajahi) → katalog
  if (location.hash === '#jelajahi') location.hash = '#katalog';
});
