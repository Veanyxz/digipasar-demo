/* DigiPasar — order.html?id= */
let orderId = null;
let refreshTimer = null;
const TERMINAL = ['selesai', 'dibatalkan'];

document.addEventListener('DOMContentLoaded', async () => {
  await renderNavbar();
  orderId = new URLSearchParams(location.search).get('id');
  if (!orderId) { location.href = '/dashboard.html'; return; }

  await loadOrder();
  refreshTimer = setInterval(loadOrder, 15000);
});

async function loadOrder() {
  const r = await api('/orders/' + encodeURIComponent(orderId));
  const wrap = document.getElementById('oWrap');
  if (r.unauthorized) {
    location.href = '/login.html?next=' + encodeURIComponent('/order.html?id=' + orderId);
    return;
  }
  if (!r.ok || !r.order) {
    if (refreshTimer) clearInterval(refreshTimer);
    wrap.innerHTML = `
      <div class="text-center py-20">
        <div class="text-6xl mb-4">🧾</div>
        <h1 class="text-xl font-bold mb-2">Pesanan tidak ditemukan</h1>
        <p class="muted tiny mb-6">${esc(r.error || '')}</p>
        <a href="/dashboard.html" class="btn btn-primary">Ke Dashboard</a>
      </div>`;
    return;
  }
  renderOrder(r.order);
  if (TERMINAL.includes(r.order.status) && refreshTimer) clearInterval(refreshTimer);
}

function renderOrder(o) {
  const pay = paymentInstruction(o.payment, o);
  const items = (o.items || []).map(it => `
    <div class="flex justify-between items-center gap-3 py-2.5" style="border-bottom:2px dashed var(--purple-pale)">
      <div class="flex items-center gap-3 min-w-0">
        <div class="cd-thumb" style="width:2.6rem;height:2.6rem;font-size:1.2rem">${it.image ? `<img class="p-img${/\.png$/i.test(it.image) ? ' contain' : ''}" src="${esc(it.image)}" alt="">` : esc(it.emoji || '📦')}</div>
        <div class="min-w-0">
          <div class="tiny" style="font-weight:600">${esc(it.name)}</div>
          <div class="tiny muted">× ${Number(it.qty) || 1}</div>
        </div>
      </div>
      <div class="tiny" style="font-weight:700;flex-shrink:0">${formatRupiah((Number(it.price) || 0) * (Number(it.qty) || 1))}</div>
    </div>`).join('');

  const inputs = o.inputs ? Object.keys(o.inputs).filter(k => o.inputs[k]).map(k => `
    <div class="flex justify-between text-sm py-1">
      <span class="muted">${esc(k)}</span>
      <span style="font-weight:600">${esc(o.inputs[k])}</span>
    </div>`).join('') : '';

  const canPay = o.status === 'pending';
  const isMidtrans = o.payment === 'midtrans';

  document.getElementById('oWrap').innerHTML = `
  <div class="max-w-3xl mx-auto">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 style="font-size:1.6rem;font-weight:900">Invoice ${esc(o.invoice)}</h1>
        <p class="tiny muted mt-1">Dibuat ${formatDate(o.createdAt)} • ID: ${esc(String(o.id)).slice(0, 8)}...</p>
      </div>
      ${statusBadge(o.status)}
    </div>

    <div class="card card-pad mb-4">
      <h2 class="p-cat mb-3">Rincian Pesanan</h2>
      ${items || '<p class="muted tiny">Tidak ada item.</p>'}
      ${inputs ? `<div class="mt-3 pt-3"><div class="p-cat mb-1">Data Penerima</div>${inputs}</div>` : ''}
      <div class="mt-3 pt-3 flex justify-between items-center" style="border-top:2px solid var(--line)">
        <span class="tiny muted" style="font-weight:700">Total Bayar</span>
        <span class="price" style="font-size:1.5rem">${formatRupiah(o.total)}</span>
      </div>
    </div>

    <div class="card card-pad mb-4">
      <h2 class="section-title mb-3" style="font-size:.95rem"><span style="font-size:1.3rem">${pay.icon}</span> Pembayaran — ${esc(pay.label)}</h2>
      <p style="font-size:.875rem;line-height:1.65">${pay.instruction}</p>
      ${o.note ? `<p class="tiny muted mt-3 pt-3" style="border-top:2px dashed var(--purple-pale)">Catatan: ${esc(o.note)}</p>` : ''}
    </div>

    ${canPay && isMidtrans ? `
    <div class="panel panel-info mb-4">
      <p class="mb-4" style="font-weight:600">Pesanan dibuat. Selesaikan pembayaran via Midtrans untuk verifikasi otomatis.</p>
      <button id="snapPayBtn" class="btn btn-primary btn-lg">💳 Bayar Sekarang</button>
    </div>` : ''}

    ${canPay && !isMidtrans ? `
    <div class="panel panel-warn mb-4">
      <p class="mb-4" style="font-weight:600">Selesaikan pembayaran, lalu tekan tombol di bawah agar pesanan Anda segera diverifikasi.</p>
      <button id="paidBtn" class="btn btn-primary btn-lg">✅ Saya Sudah Bayar</button>
    </div>` : ''}

    ${o.status === 'menunggu_verifikasi' ? `
    <div class="panel panel-sky mb-4">
      Pembayaran Anda sedang diverifikasi admin. Halaman ini diperbarui otomatis setiap 15 detik.
    </div>` : ''}

    ${o.status === 'diproses' ? `
    <div class="panel panel-info mb-4">
      Pesanan Anda sedang diproses. Produk digital akan dikirim otomatis setelah selesai.
    </div>` : ''}

    ${o.status === 'selesai' ? `
    <div class="panel panel-ok mb-4">
      <div class="text-3xl mb-2">🎉</div>
      <p style="font-weight:700">Pesanan selesai! Cek email Anda untuk detail produk digital.</p>
    </div>` : ''}

    <div class="text-center mt-6">
      <a href="/dashboard.html" class="link tiny">← Kembali ke Dashboard</a>
    </div>
  </div>`;

  const snapPayBtn = document.getElementById('snapPayBtn');
  if (snapPayBtn) {
    snapPayBtn.addEventListener('click', async () => {
      snapPayBtn.disabled = true;
      snapPayBtn.textContent = 'Menyiapkan pembayaran…';
      const r = await api('/orders/' + encodeURIComponent(orderId) + '/snap', 'POST');
      if (r.ok && r.snapToken) {
        await payWithSnap(r.snapToken, { onDone: () => loadOrder(), onClose: () => loadOrder() });
      } else {
        toast(r.error || 'Gagal menyiapkan pembayaran.', 'error');
      }
      snapPayBtn.disabled = false;
      snapPayBtn.textContent = '💳 Bayar Sekarang';
    });
  }

  const paidBtn = document.getElementById('paidBtn');
  if (paidBtn) {
    paidBtn.addEventListener('click', async () => {
      paidBtn.disabled = true;
      paidBtn.textContent = 'Memproses…';
      const r = await api('/orders/' + encodeURIComponent(orderId) + '/paid', 'POST');
      if (r.ok) {
        toast('Terima kasih! Pesanan menunggu verifikasi admin.', 'success');
        await loadOrder();
      } else {
        toast(r.error || 'Gagal memperbarui status.', 'error');
        paidBtn.disabled = false;
        paidBtn.textContent = '✅ Saya Sudah Bayar';
      }
    });
  }
}
