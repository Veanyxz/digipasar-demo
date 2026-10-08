/* DigiPasar — product.html?slug= */
let product = null;
let selVar = 0;
let qty = 1;

function effPrice(v) {
  const p = Number(v.price) || 0;
  const d = Number(v.discountPrice) || 0;
  return (d > 0 && d < p) ? d : p;
}

document.addEventListener('DOMContentLoaded', async () => {
  await renderNavbar();
  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug) { location.href = '/index.html'; return; }

  const r = await api('/products/' + encodeURIComponent(slug));
  const wrap = document.getElementById('pWrap');
  if (!r.ok || !r.product) {
    wrap.innerHTML = `
      <div class="text-center py-20">
        <div class="text-6xl mb-4">😕</div>
        <h1 class="text-xl font-bold mb-2">Produk tidak ditemukan</h1>
        <p class="muted tiny mb-6">${esc(r.error || 'Produk mungkin sudah dihapus.')}</p>
        <a href="/index.html" class="btn btn-primary">Kembali ke Beranda</a>
      </div>`;
    return;
  }
  product = r.product;
  if (!product.variants || !product.variants.length) selVar = -1;
  renderAll();
});

function renderAll() {
  const [g1, g2] = gradientFor(product.id ?? product.slug);
  const vars = product.variants || [];
  const v = vars[selVar];

  document.getElementById('pCover').style.background = `linear-gradient(135deg,${g1},${g2})`;
  const emojiEl = document.getElementById('pEmoji');
  const oldImg = document.getElementById('pImg'); if (oldImg) oldImg.remove();
  if (product.image) {
    emojiEl.style.display = 'none';
    const img = document.createElement('img');
    img.id = 'pImg'; img.className = 'p-img' + (/\.png$/i.test(product.image) ? ' contain' : '');
    img.src = product.image; img.alt = product.name || '';
    document.getElementById('pCover').prepend(img);
  } else {
    emojiEl.style.display = '';
    emojiEl.textContent = product.emoji || '📦';
  }
  document.getElementById('pBadge').innerHTML = product.badge
    ? `<span class="${product.badge === 'PROMO' ? 'p-badge' : 'p-badge alt'}" style="position:static">${esc(product.badge)}</span>` : '';
  document.getElementById('pCat').textContent = product.category || '';
  document.getElementById('pName').textContent = product.name;
  document.getElementById('pMeta').innerHTML = `
    <span class="p-star">★ ${Number(product.rating || 0).toFixed(1)}</span>
    <span>•</span>
    <span>${t('card.sold', { n: Number(product.sold || 0).toLocaleString('id-ID') })}</span>`;
  document.getElementById('pDesc').textContent = product.description || 'Tidak ada deskripsi.';

  // Varian (radio pills)
  const varBox = document.getElementById('pVariants');
  if (vars.length) {
    varBox.innerHTML = vars.map((x, i) => {
      const active = i === selVar;
      const stock = Number(x.stock);
      const out = stock === 0;
      return `
      <button type="button" data-i="${i}" ${out ? 'disabled' : ''}
        class="variant ${active ? 'active' : ''}">
        <div class="v-name">${esc(x.name)}${out ? ' (Habis)' : ''}</div>
        <div class="v-price">${formatRupiah(effPrice(x))}</div>
      </button>`;
    }).join('');
    varBox.querySelectorAll('button[data-i]').forEach(b =>
      b.addEventListener('click', () => { selVar = Number(b.dataset.i); renderAll(); }));
  } else {
    varBox.innerHTML = '<p class="muted tiny">Tidak ada varian tersedia.</p>';
  }

  // Field input dinamis
  const fBox = document.getElementById('pFields');
  const fields = product.fields || [];
  fBox.innerHTML = fields.length ? fields.map(f => `
    <div>
      <label class="field-label">${esc(f.label)} ${f.required ? '<span style="color:var(--red)">*</span>' : ''}</label>
      <input data-key="${esc(f.key)}" type="text" placeholder="${esc(f.placeholder || '')}">
    </div>`).join('')
    : '<p class="muted tiny">Tidak ada data tambahan yang diperlukan.</p>';

  updateTotal();

  // Qty stepper
  document.getElementById('qtyMinus').onclick = () => { if (qty > 1) { qty--; updateTotal(); } };
  document.getElementById('qtyPlus').onclick = () => { qty++; updateTotal(); };

  document.getElementById('buyBtn').onclick = doBuy;
  document.getElementById('fastBtn').onclick = doBuy;
  document.getElementById('addCartBtn').onclick = doCart;
}

function updateTotal() {
  const vars = product.variants || [];
  const v = vars[selVar];
  document.getElementById('qtyVal').textContent = qty;
  const totalEl = document.getElementById('pTotal');
  const priceEl = document.getElementById('pPrice');
  if (!v) {
    priceEl.innerHTML = '<span class="muted">Stok habis</span>';
    totalEl.textContent = formatRupiah(0);
    return;
  }
  const p = Number(v.price) || 0;
  const ep = effPrice(v);
  priceEl.innerHTML = (ep < p)
    ? `<span class="line-through-old mr-2" style="font-size:1.1rem">${formatRupiah(p)}</span><span class="price" style="font-size:2.1rem">${formatRupiah(ep)}</span>`
    : `<span class="price" style="font-size:2.1rem">${formatRupiah(p)}</span>`;
  const stock = Number(v.stock);
  document.getElementById('pStock').textContent = stock === -1 ? 'Stok tersedia' : stock > 0 ? `Stok tersisa: ${stock}` : 'Stok habis';
  totalEl.textContent = formatRupiah(ep * qty);
}

function doCart() {
  const vars = product.variants || [];
  const v = vars[selVar];
  if (!v) { toast(t('p.pick_variant'), 'error'); return; }
  if (Number(v.stock) !== -1 && Number(v.stock) < qty) { toast(t('p.low_stock'), 'error'); return; }
  cartAdd({
    variantId: v.id,
    slug: product.slug,
    name: product.name,
    variantName: v.name,
    price: effPrice(v),
    qty,
    image: product.image || '',
    emoji: product.emoji || '📦',
    fields: product.fields || [],
  });
}

function doBuy() {
  const vars = product.variants || [];
  const v = vars[selVar];
  if (!v) { toast('Pilih varian yang tersedia terlebih dahulu.', 'error'); return; }
  if (Number(v.stock) !== -1 && Number(v.stock) < qty) { toast('Stok tidak mencukupi untuk jumlah tersebut.', 'error'); return; }

  // Validasi & kumpulkan input dinamis
  const inputs = {};
  const fields = product.fields || [];
  for (const f of fields) {
    const inp = document.querySelector(`[data-key="${CSS.escape(f.key)}"]`);
    const val = inp ? inp.value.trim() : '';
    if (f.required && !val) {
      toast(`"${f.label}" wajib diisi.`, 'error');
      if (inp) inp.focus();
      return;
    }
    inputs[f.key] = val;
  }

  const draft = {
    items: [{ variantId: v.id, qty }],
    inputs,
    snapshot: {
      productName: product.name,
      emoji: product.emoji,
      image: product.image || '',
      slug: product.slug,
      variantName: v.name,
      unitPrice: effPrice(v)
    }
  };
  try {
    sessionStorage.setItem('checkout_draft', JSON.stringify(draft));
  } catch (e) {
    toast('Gagal menyimpan pesanan sementara.', 'error');
    return;
  }
  location.href = '/checkout.html';
}
