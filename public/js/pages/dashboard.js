/* DigiPasar — dashboard.html */
document.addEventListener('DOMContentLoaded', async () => {
  await renderNavbar();

  const user = await requireAuth('/dashboard.html');
  if (!user) return;

  document.getElementById('dProfile').innerHTML = `
    <div class="flex items-center gap-4">
      <div class="avatar">${esc((user.name || 'U').charAt(0).toUpperCase())}</div>
      <div class="min-w-0">
        <h1 class="truncate" style="font-size:1.3rem;font-weight:900">${esc(user.name)}</h1>
        <p class="tiny muted truncate">${esc(user.email)}</p>
        <span class="badge ${user.role === 'admin' ? 'badge-accent' : 'badge-plain'}" style="margin-top:.35rem">
          ${user.role === 'admin' ? '👑 ADMIN' : '👤 MEMBER'}
        </span>
      </div>
    </div>`;

  const r = await api('/orders');
  const box = document.getElementById('dOrders');
  if (!r.ok) {
    box.innerHTML = `<p class="muted tiny">${esc(r.error || 'Gagal memuat pesanan.')}</p>`;
    return;
  }
  const orders = r.orders || [];
  document.getElementById('dCount').textContent = orders.length;

  if (!orders.length) {
    box.innerHTML = `
      <div class="col-span-full text-center py-12">
        <div class="text-5xl mb-3">🛒</div>
        <p class="muted tiny mb-5">Anda belum memiliki pesanan.</p>
        <a href="/index.html" class="btn btn-primary">Mulai Belanja</a>
      </div>`;
    return;
  }

  box.innerHTML = orders.map(o => {
    const firstItem = (o.items && o.items[0]) || {};
    return `
    <a href="/order.html?id=${encodeURIComponent(o.id)}" class="order-card">
      <div class="flex items-center justify-between gap-3 mb-2">
        <span style="font-weight:800;font-size:.875rem">${esc(o.invoice)}</span>
        ${statusBadge(o.status)}
      </div>
      <div class="tiny muted mb-1">${formatDate(o.createdAt)}</div>
      <div class="tiny truncate" style="font-weight:600">${esc(firstItem.name || 'Pesanan')}${(o.items || []).length > 1 ? ` <span class="muted">+${o.items.length - 1} lainnya</span>` : ''}</div>
      <div class="flex justify-between items-center mt-2">
        <span class="price">${formatRupiah(o.total)}</span>
        <span class="tiny link">Lihat detail →</span>
      </div>
    </a>`;
  }).join('');
});
