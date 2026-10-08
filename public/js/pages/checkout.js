/* DigiPasar — checkout.html
   Dua mode:
   1) draft langsung dari "Beli Sekarang" (snapshot tunggal, input sudah dikumpulkan)
   2) ?cart=1 dari laci keranjang (multi item, field dinamis dikumpulkan di sini) */
let draft = null;
let payment = 'qris';
let cartMode = false;

document.addEventListener('DOMContentLoaded', async () => {
  await renderNavbar();

  const user = await requireAuth('/checkout.html');
  if (!user) return;

  try {
    const cfg = await loadConfig();
    if (cfg.midtransEnabled) payment = 'midtrans';
  } catch (e) { /* default manual */ }

  const qp = new URLSearchParams(location.search);
  cartMode = qp.get('cart') === '1';

  if (cartMode) {
    const items = cartGet();
    if (!items.length) { toast(t('cart.empty'), 'error'); location.href = '/index.html'; return; }
    // gabungkan field dinamis semua item (unik per key)
    const seen = new Set(); const fields = [];
    for (const x of items) for (const f of (x.fields || [])) {
      if (!seen.has(f.key)) { seen.add(f.key); fields.push(f); }
    }
    draft = {
      items: items.map(x => ({ variantId: x.variantId, qty: x.qty })),
      inputs: {}, fields,
      display: items.map(x => ({
        name: x.name, variantName: x.variantName, qty: x.qty,
        price: x.price, image: x.image, emoji: x.emoji,
      })),
    };
  } else {
    try { draft = JSON.parse(sessionStorage.getItem('checkout_draft')); } catch (e) { draft = null; }
    if (!draft || !draft.items || !draft.items.length) {
      toast('Tidak ada item untuk checkout.', 'error');
      location.href = '/index.html';
      return;
    }
    const s = draft.snapshot || {};
    draft.display = [{
      name: s.productName || 'Produk', variantName: s.variantName || '',
      qty: Number(draft.items[0].qty) || 1, price: Number(s.unitPrice) || 0,
      image: s.image || '', emoji: s.emoji || '📦',
    }];
    draft.fields = draft.fields || [];
  }

  renderSummary();
  renderPayments();
  renderFieldsForm();

  document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    // kumpulkan field dinamis (mode keranjang / belum terisi)
    const inputs = { ...(draft.inputs || {}) };
    const fields = draft.fields || [];
    for (const f of fields) {
      const inp = document.querySelector(`[data-dkey="${CSS.escape(f.key)}"]`);
      if (!inp) continue;
      const val = inp.value.trim();
      if (f.required && !val) {
        toast(t('p.required', { label: f.label }), 'error');
        inp.focus();
        return;
      }
      inputs[f.key] = val;
    }

    const btn = document.getElementById('createBtn');
    btn.disabled = true;
    btn.textContent = t('co.creating');
    try {
      const r = await api('/orders', 'POST', { items: draft.items, inputs, payment });
      if (r.unauthorized) {
        location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search);
        return;
      }
      if (r.ok && r.order) {
        if (cartMode) cartClear();
        sessionStorage.removeItem('checkout_draft');
        if (r.snapToken) {
          toast(t('co.created_pay'), 'success');
          const goInvoice = () => { location.href = '/order.html?id=' + encodeURIComponent(r.order.id); };
          await payWithSnap(r.snapToken, { onDone: goInvoice, onClose: goInvoice });
        } else {
          if (r.snapError) toast(t('co.created_err') + ': ' + r.snapError, 'error');
          else toast(t('co.created'), 'success');
          setTimeout(() => { location.href = '/order.html?id=' + encodeURIComponent(r.order.id); }, 900);
        }
      } else {
        toast(r.error || t('co.failed'), 'error');
      }
    } finally {
      btn.disabled = false;
      btn.textContent = t('co.pay_btn');
    }
  });
});

function draftTotal() {
  return (draft.display || []).reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.qty) || 1), 0);
}

function renderSummary() {
  const list = draft.display || [];
  const inputs = draft.inputs || {};

  const itemRows = list.map(x => `
    <div class="flex items-center gap-3" style="padding:.45rem 0">
      <div class="cd-thumb" style="width:3rem;height:3rem">${x.image ? `<img class="p-img${/\.png$/i.test(x.image) ? ' contain' : ''}" src="${esc(x.image)}" alt="">` : esc(x.emoji || '📦')}</div>
      <div class="min-w-0 flex-1">
        <div style="font-weight:700;font-size:.82rem;line-height:1.3">${esc(x.name || 'Produk')}</div>
        <div class="tiny muted" style="margin-top:.1rem">${esc(x.variantName || '')} × ${Number(x.qty) || 1}</div>
      </div>
      <div class="price tiny" style="flex-shrink:0">${formatRupiah((Number(x.price) || 0) * (Number(x.qty) || 1))}</div>
    </div>`).join('<div style="border-top:2px dashed var(--purple-pale);margin:.2rem 0"></div>');

  const inputRows = Object.keys(inputs).filter(k => inputs[k]).map(k =>
    `<div class="flex justify-between text-sm py-1">
       <span class="muted">${esc(k)}</span>
       <span style="font-weight:600">${esc(inputs[k])}</span>
     </div>`).join('');

  document.getElementById('coSummary').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:.15rem">${itemRows}</div>
    ${inputRows ? `<div class="mt-4 pt-4" style="border-top:2px dashed var(--purple-pale)"><div class="p-cat mb-1">Data Penerima</div>${inputRows}</div>` : ''}
    <div class="mt-4 pt-4 flex justify-between items-center" style="border-top:2px dashed var(--purple-pale)">
      <span class="tiny muted" style="font-weight:700">${esc(t('co.total'))}</span>
      <span class="price" style="font-size:1.5rem">${formatRupiah(draftTotal())}</span>
    </div>`;
}

function renderFieldsForm() {
  const box = document.getElementById('coFields');
  const body = document.getElementById('coFieldsBody');
  if (!box || !body) return;
  const fields = draft.fields || [];
  // mode beli langsung: input sudah dikumpulkan di halaman produk → sembunyikan
  const already = Object.keys(draft.inputs || {}).length > 0;
  if (!fields.length || already) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  body.innerHTML = fields.map(f => `
    <div>
      <label class="field-label">${esc(f.label)} ${f.required ? '<span style="color:var(--red)">*</span>' : ''}</label>
      <input data-dkey="${esc(f.key)}" type="text" placeholder="${esc(f.placeholder || '')}">
    </div>`).join('');
}

function renderPayments() {
  const box = document.getElementById('payMethods');
  const keys = Object.keys(PAYMENT_METHODS);
  box.innerHTML = keys.map(k => {
    const m = PAYMENT_METHODS[k];
    const active = k === payment;
    return `
    <button type="button" data-pay="${k}" class="pay-opt ${active ? 'active' : ''}">
      <span class="pay-ico">${m.icon}</span>
      <span class="flex-1">
        <span class="pay-lbl" style="display:block">${esc(m.label)}</span>
        <span class="pay-sub" style="display:block">${esc(m.short)}</span>
      </span>
      <span class="pay-dot"></span>
    </button>`;
  }).join('');
  box.querySelectorAll('[data-pay]').forEach(b =>
    b.addEventListener('click', () => { payment = b.dataset.pay; renderPayments(); }));

  document.getElementById('payNote').innerHTML = `
    <div class="panel panel-info" style="text-align:left;font-size:.8rem">Instruksi pembayaran lengkap akan ditampilkan di halaman invoice setelah pesanan dibuat.</div>`;
}
