/* DigiPasar — admin.html (khusus role admin) */
let allProducts = [];
let allCategories = [];
let editingId = null;

function updateImgPreview() {
  const imgIn = document.getElementById('fImage');
  const prev = document.getElementById('fImgPrev');
  if (!imgIn || !prev) return;
  const v = imgIn.value.trim();
  if (!v) { prev.style.display = 'none'; prev.innerHTML = ''; return; }
  prev.style.display = '';
  prev.innerHTML = `<img class="p-img${/\.png$/i.test(v) ? ' contain' : ''}" src="${esc(v)}" alt="">`;
}

document.addEventListener('DOMContentLoaded', async () => {
  await renderNavbar();
  const user = await requireAuth('/admin.html');
  if (!user) return;

  if (user.role !== 'admin') {
    document.getElementById('adminDenied').classList.remove('hidden');
    document.getElementById('adminApp').classList.add('hidden');
    return;
  }
  document.getElementById('adminDenied').classList.add('hidden');
  document.getElementById('adminApp').classList.remove('hidden');

  await loadStats();
  await loadCategories();
  await loadProducts();
  await loadOrders('');

  // Tabs
  document.querySelectorAll('[data-tab]').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach(x => {
      const on = x === t;
      x.className = 'tab-btn' + (on ? ' active' : '');
    });
    for (const [tab, id] of [['products', 'tabProducts'], ['orders', 'tabOrders'], ['notifs', 'tabNotifs']]) {
      document.getElementById(id).classList.toggle('hidden', t.dataset.tab !== tab);
    }
    if (t.dataset.tab === 'notifs') loadNotifList();
  }));

  // Modal produk
  document.getElementById('addProductBtn').addEventListener('click', () => openModal(null));
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('productModal').addEventListener('click', e => {
    if (e.target.id === 'productModal') closeModal();
  });
  document.getElementById('addVariantRow').addEventListener('click', () => addVariantRow());
  document.getElementById('addFieldRow').addEventListener('click', () => addFieldRow());
  document.getElementById('productForm').addEventListener('submit', saveProduct);

  // Filter pesanan
  document.getElementById('orderFilter').addEventListener('change', e => loadOrders(e.target.value));

  // Notifikasi: scope kirim + submit
  const notifScope = document.getElementById('fNotifScope');
  if (notifScope) notifScope.addEventListener('change', () => {
    document.getElementById('notifEmailWrap').classList.toggle('hidden', notifScope.value !== 'user');
  });
  const notifForm = document.getElementById('notifForm');
  if (notifForm) notifForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('notifSendBtn');
    const payload = {
      icon: document.getElementById('fNotifIcon').value.trim() || '📣',
      title: document.getElementById('fNotifTitle').value.trim(),
      body: document.getElementById('fNotifBody').value.trim(),
      targetEmail: notifScope.value === 'user' ? document.getElementById('fNotifEmail').value.trim() : '',
    };
    if (!payload.title) { toast('Judul notifikasi wajib diisi.', 'error'); return; }
    btn.disabled = true; btn.textContent = 'Mengirim...';
    try {
      const r = await api('/admin/notifications', 'POST', payload);
      if (r.ok) {
        toast('Notifikasi terkirim!', 'success');
        notifForm.reset();
        document.getElementById('notifEmailWrap').classList.add('hidden');
        loadNotifList();
      } else {
        toast(r.error || 'Gagal mengirim notifikasi.', 'error');
      }
    } finally {
      btn.disabled = false; btn.textContent = 'Kirim Notifikasi';
    }
  });

  // Gambar: daftar default + preview + unggah
  try {
    const dg = await api('/image-defaults');
    if (dg.ok && dg.images) {
      const dl = document.getElementById('imgDefaults');
      if (dl) dl.innerHTML = dg.images.map(x => `<option value="${esc(x.url)}">${esc(x.name)}</option>`).join('');
    }
  } catch (e) { /* daftar default opsional */ }
  const imgIn = document.getElementById('fImage');
  if (imgIn) imgIn.addEventListener('input', updateImgPreview);
  const upStat = document.getElementById('fImgUpStat');
  const upFile = document.getElementById('fImageFile');
  if (upFile) upFile.addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 3.5 * 1024 * 1024) { toast('Ukuran gambar maksimal 3.5 MB.', 'error'); return; }
    if (upStat) upStat.textContent = 'Mengunggah...';
    try {
      const data = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(f);
      });
      const r = await api('/upload', 'POST', { name: f.name, data });
      if (r.ok && r.url) {
        imgIn.value = r.url;
        updateImgPreview();
        toast('Gambar terunggah!', 'success');
      } else {
        toast(r.error || 'Gagal mengunggah gambar.', 'error');
      }
    } catch (err) {
      toast('Gagal mengunggah gambar.', 'error');
    }
    if (upStat) upStat.textContent = '';
    e.target.value = '';
  });
});

async function loadStats() {
  const r = await api('/admin/stats');
  const box = document.getElementById('statCards');
  if (!r.ok || !r.stats) {
    box.innerHTML = '<p class="muted tiny col-span-full">Gagal memuat statistik.</p>';
    return;
  }
  const s = r.stats;
  const cards = [
    { icon: '💰', label: 'Total Pendapatan', value: formatRupiah(s.revenue) },
    { icon: '🧾', label: 'Total Pesanan', value: Number(s.orders || 0).toLocaleString('id-ID') },
    { icon: '📦', label: 'Total Produk', value: Number(s.products || 0).toLocaleString('id-ID') },
    { icon: '👥', label: 'Total Pengguna', value: Number(s.users || 0).toLocaleString('id-ID') }
  ];
  box.innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-ico">${c.icon}</div>
      <div class="stat-val">${esc(String(c.value))}</div>
      <div class="stat-lbl">${c.label}</div>
    </div>`).join('');
}

async function loadCategories() {
  const r = await api('/categories');
  allCategories = (r.ok && r.categories) ? r.categories : [];
  document.getElementById('fCategory').innerHTML = allCategories.map(c =>
    `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join('');
}

async function loadProducts() {
  const r = await api('/admin/products');
  const tb = document.getElementById('productRows');
  if (!r.ok) {
    tb.innerHTML = `<tr><td colspan="5" class="table-empty">${esc(r.error || 'Gagal memuat produk.')}</td></tr>`;
    return;
  }
  allProducts = r.products || [];
  if (!allProducts.length) {
    tb.innerHTML = '<tr><td colspan="5" class="table-empty">Belum ada produk. Klik "Tambah Produk".</td></tr>';
    return;
  }
  tb.innerHTML = allProducts.map(p => `
    <tr>
      <td>
        <div class="flex items-center gap-3">
          <div class="card card-flat" style="width:2.5rem;height:2.5rem;display:grid;place-items:center;font-size:1.2rem;flex-shrink:0;border-radius:9px;overflow:hidden;position:relative;padding:0"
               >${p.image ? `<img class="p-img${/\.png$/i.test(p.image) ? ' contain' : ''}" src="${esc(p.image)}" alt="" style="padding:2px">` : esc(p.emoji || '📦')}</div>
          <div class="min-w-0">
            <div class="tiny" style="font-weight:700;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</div>
            <div class="tiny muted truncate">/${esc(p.slug)}</div>
          </div>
        </div>
      </td>
      <td class="muted">${esc(p.category || '-')}</td>
      <td class="price" style="white-space:nowrap">${formatRupiah(p.price)}</td>
      <td class="muted">${Number(p.variants) || 0} varian</td>
      <td style="white-space:nowrap">
        <span class="badge ${p.active ? 'badge-selesai' : 'badge-plain'}">${p.active ? 'Aktif' : 'Nonaktif'}</span>
        <button data-edit="${esc(String(p.id))}" class="btn btn-sm" style="margin-left:.5rem">✏️ Edit</button>
        <button data-del="${esc(String(p.id))}" class="btn btn-sm" style="margin-left:.25rem;background:#FEE2E2">🗑️ Hapus</button>
      </td>
    </tr>`).join('');
  tb.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.edit)));
  tb.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteProduct(b.dataset.del)));
}

/* ---------- Notifikasi (tab) ---------- */
async function loadNotifList() {
  const box = document.getElementById('notifList');
  if (!box) return;
  box.innerHTML = '<p class="muted tiny">Memuat...</p>';
  const r = await api('/admin/notifications');
  if (!r.ok || !Array.isArray(r.items) || !r.items.length) {
    box.innerHTML = '<p class="muted tiny">Belum ada notifikasi terkirim.</p>';
    return;
  }
  box.innerHTML = r.items.map(n => `
    <div class="cd-item" style="align-items:flex-start">
      <div class="cd-thumb" style="width:2.6rem;height:2.6rem;font-size:1.2rem">${esc(n.icon || '📣')}</div>
      <div class="cd-info">
        <div class="cd-name">${esc(n.title)}</div>
        ${n.body ? `<div class="tiny muted" style="white-space:normal">${esc(n.body)}</div>` : ''}
        <div class="tiny muted" style="margin-top:.2rem">
          ${n.target ? 'Kepada: ' + esc(n.target) : 'Semua pengguna'} • ${formatDate(n.createdAt)} • ${Number(n.readCount || 0)} dibaca
        </div>
      </div>
      <button data-del-notif="${n.id}" class="btn btn-sm" style="background:#FEE2E2;flex-shrink:0">🗑️</button>
    </div>`).join('');
  box.querySelectorAll('[data-del-notif]').forEach(b => b.addEventListener('click', async () => {
    const rr = await api('/admin/notifications/' + b.dataset.delNotif, 'DELETE');
    if (rr.ok) { toast('Notifikasi dihapus.', 'success'); loadNotifList(); }
    else toast(rr.error || 'Gagal menghapus.', 'error');
  }));
}

/* ---------- Modal tambah / edit produk ---------- */
function openModal(id) {
  editingId = id;
  const p = id ? allProducts.find(x => String(x.id) === String(id)) : null;
  document.getElementById('modalTitle').textContent = p ? 'Edit Produk' : 'Tambah Produk';
  document.getElementById('fSlug').value = p?.slug || '';
  document.getElementById('fName').value = p?.name || '';
  document.getElementById('fCategory').value = p?.categorySlug || p?.category || (allCategories[0]?.slug || '');
  document.getElementById('fEmoji').value = p?.emoji || '📦';
  document.getElementById('fImage').value = p?.image || '';
  updateImgPreview();
  document.getElementById('fBadge').value = p?.badge || '';
  document.getElementById('fDesc').value = p?.description || '';
  document.getElementById('fActive').checked = p ? !!p.active : true;

  const vBox = document.getElementById('variantRows');
  vBox.innerHTML = '';
  const vars = p?.variants && Array.isArray(p.variants) ? p.variants : [{ name: '', price: '', discountPrice: '', stock: '' }];
  vars.forEach(v => addVariantRow(v));

  const fBox = document.getElementById('fieldRows');
  fBox.innerHTML = '';
  const flds = p?.fields && Array.isArray(p.fields) ? p.fields : [];
  flds.forEach(f => addFieldRow(f));

  document.getElementById('productModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('productModal').classList.add('hidden');
  document.body.style.overflow = '';
  editingId = null;
}

function addVariantRow(v = {}) {
  const box = document.getElementById('variantRows');
  const row = document.createElement('div');
  row.className = 'grid grid-cols-12 gap-2 variant-row';
  row.innerHTML = `
    <input class="col-span-4 v-name" style="font-size:.8rem;padding:.5rem .6rem" placeholder="Nama varian" value="${esc(v.name || '')}">
    <input class="col-span-3 v-price" style="font-size:.8rem;padding:.5rem .6rem" type="number" min="0" placeholder="Harga" value="${esc(v.price ?? '')}">
    <input class="col-span-3 v-disc" style="font-size:.8rem;padding:.5rem .6rem" type="number" min="0" placeholder="Harga promo" value="${esc(v.discountPrice ?? '')}">
    <input class="col-span-1 v-stock" style="font-size:.8rem;padding:.5rem .6rem" type="number" min="-1" placeholder="Stok (-1 = ∞)" value="${esc(v.stock ?? '')}">
    <button type="button" class="col-span-1 btn btn-sm v-del" style="background:#FEE2E2;padding:.4rem">✕</button>`;
  row.querySelector('.v-del').addEventListener('click', () => row.remove());
  box.appendChild(row);
}
function addFieldRow(f = {}) {
  const box = document.getElementById('fieldRows');
  const row = document.createElement('div');
  row.className = 'grid grid-cols-12 gap-2 field-row items-center';
  row.innerHTML = `
    <input class="col-span-3 f-key" style="font-size:.8rem;padding:.5rem .6rem" placeholder="key (mis. user_id)" value="${esc(f.key || '')}">
    <input class="col-span-3 f-label" style="font-size:.8rem;padding:.5rem .6rem" placeholder="Label" value="${esc(f.label || '')}">
    <input class="col-span-4 f-ph" style="font-size:.8rem;padding:.5rem .6rem" placeholder="Placeholder" value="${esc(f.placeholder || '')}">
    <label class="col-span-1 flex items-center justify-center gap-1 tiny muted" style="font-weight:500"><input type="checkbox" class="f-req" ${f.required ? 'checked' : ''}> Wajib</label>
    <button type="button" class="col-span-1 btn btn-sm f-del" style="background:#FEE2E2;padding:.4rem">✕</button>`;
  row.querySelector('.f-del').addEventListener('click', () => row.remove());
  box.appendChild(row);
}

async function saveProduct(e) {
  e.preventDefault();
  const variants = [...document.querySelectorAll('.variant-row')].map(r => ({
    name: r.querySelector('.v-name').value.trim(),
    price: Number(r.querySelector('.v-price').value) || 0,
    discountPrice: Number(r.querySelector('.v-disc').value) || 0,
    stock: (() => { const sv = r.querySelector('.v-stock').value; return sv === '' ? -1 : Number(sv); })()
  })).filter(v => v.name);
  if (!variants.length) { toast('Tambahkan minimal satu varian.', 'error'); return; }

  const fields = [...document.querySelectorAll('.field-row')].map(r => ({
    key: r.querySelector('.f-key').value.trim(),
    label: r.querySelector('.f-label').value.trim(),
    placeholder: r.querySelector('.f-ph').value.trim(),
    required: r.querySelector('.f-req').checked
  })).filter(f => f.key && f.label);

  const body = {
    slug: document.getElementById('fSlug').value.trim(),
    name: document.getElementById('fName').value.trim(),
    categorySlug: document.getElementById('fCategory').value,
    emoji: document.getElementById('fEmoji').value.trim() || '📦',
    image: document.getElementById('fImage').value.trim(),
    description: document.getElementById('fDesc').value.trim(),
    badge: document.getElementById('fBadge').value.trim(),
    fields,
    variants,
    active: document.getElementById('fActive').checked
  };
  if (!body.slug || !body.name) { toast('Slug dan nama produk wajib diisi.', 'error'); return; }

  const btn = document.getElementById('saveProductBtn');
  btn.disabled = true; btn.textContent = 'Menyimpan…';
  try {
    const r = editingId
      ? await api('/admin/products/' + encodeURIComponent(editingId), 'PUT', body)
      : await api('/admin/products', 'POST', body);
    if (r.ok) {
      toast(editingId ? 'Produk diperbarui.' : 'Produk ditambahkan.', 'success');
      closeModal();
      await loadProducts();
      await loadStats();
    } else {
      toast(r.error || 'Gagal menyimpan produk.', 'error');
    }
  } finally {
    btn.disabled = false; btn.textContent = 'Simpan Produk';
  }
}

async function deleteProduct(id) {
  if (!confirm('Hapus produk ini secara permanen?')) return;
  const r = await api('/admin/products/' + encodeURIComponent(id), 'DELETE');
  if (r.ok) {
    toast('Produk dihapus.', 'success');
    await loadProducts();
    await loadStats();
  } else {
    toast(r.error || 'Gagal menghapus produk.', 'error');
  }
}

/* ---------- Pesanan ---------- */
async function loadOrders(status) {
  const r = await api('/admin/orders' + (status ? '?status=' + encodeURIComponent(status) : ''));
  const tb = document.getElementById('orderRows');
  if (!r.ok) {
    tb.innerHTML = `<tr><td colspan="6" class="table-empty">${esc(r.error || 'Gagal memuat pesanan.')}</td></tr>`;
    return;
  }
  const orders = r.orders || [];
  if (!orders.length) {
    tb.innerHTML = '<tr><td colspan="6" class="table-empty">Tidak ada pesanan pada filter ini.</td></tr>';
    return;
  }
  const opts = Object.keys(STATUS_META).map(s =>
    `<option value="${s}">${STATUS_META[s].label}</option>`).join('');
  tb.innerHTML = orders.map(o => `
    <tr>
      <td style="font-weight:700;white-space:nowrap">${esc(o.invoice)}</td>
      <td class="muted" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(o.user || '-')}</td>
      <td class="price" style="white-space:nowrap">${formatRupiah(o.total)}</td>
      <td class="muted">${esc(o.payment || '-')}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="white-space:nowrap">
        <div class="flex items-center gap-2">
          <select data-osel="${esc(String(o.id))}" style="font-size:.75rem;padding:.4rem .5rem;width:auto">${opts.replace(`value="${o.status}"`, `value="${o.status}" selected`)}</select>
          <button data-oupd="${esc(String(o.id))}" class="btn btn-sm btn-primary">Simpan</button>
        </div>
        <div class="tiny muted" style="margin-top:.25rem;font-weight:400">${formatDate(o.createdAt)}</div>
      </td>
    </tr>`).join('');
  tb.querySelectorAll('[data-oupd]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.oupd;
    const sel = tb.querySelector(`[data-osel="${CSS.escape(id)}"]`);
    const r2 = await api('/admin/orders/' + encodeURIComponent(id), 'PATCH', { status: sel.value });
    if (r2.ok) { toast('Status pesanan diperbarui.', 'success'); loadOrders(document.getElementById('orderFilter').value); }
    else toast(r2.error || 'Gagal memperbarui status.', 'error');
  }));
}
