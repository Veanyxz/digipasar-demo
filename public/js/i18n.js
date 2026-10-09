/* ============================================================
   DigiPasar — i18n (ID/EN)
   t('key', {n: 5}) → ganti placeholder {n}
   Ganti bahasa: setLang('en') → reload dengan scroll dipertahankan
   ============================================================ */
const I18N = {
  id: {
    // header
    'nav.home': 'Beranda',
    'nav.account': 'Akun',
    'nav.katalog': 'Katalog',
    'nav.kategori': 'Kategori',
    'nav.search_ph': 'Cari produk atau brand...',
    'nav.notif': 'Notifikasi',
    'nav.cart': 'Keranjang',
    'nav.login': 'Masuk',
    'nav.register': 'Daftar',
    'nav.dashboard': 'Dashboard Saya',
    'nav.admin': 'Admin Panel',
    'nav.logout': 'Keluar',
    'nav.semua_kategori': 'Semua Kategori',

    // notifikasi
    'notif.empty': 'Belum ada notifikasi.',
    'notif.login': 'Masuk untuk melihat notifikasi pesanan.',
    'notif.latest': 'Pesanan terbaru',

    // keranjang
    'cart.title': 'Keranjang Belanja',
    'cart.empty': 'Keranjang masih kosong.',
    'cart.remove': 'Hapus',
    'cart.subtotal': 'Subtotal',
    'cart.checkout': 'Checkout',
    'cart.added': 'Ditambahkan ke keranjang!',
    'cart.count': 'produk di keranjang',

    // hero
    'hero.badge': '🚀 PENGIRIMAN INSTAN 24/7 • PEMBAYARAN AMAN',
    'hero.h1a': 'Semua Kebutuhan Digital',
    'hero.h1b': 'dalam Satu Tempat',
    'hero.sub': 'Top up game, e-money, voucher, dan langganan premium — dikirim ke email kamu dalam hitungan detik.',
    'hero.search_ph': 'Mau cari apa?',
    'hero.search_btn': 'Cari',
    'hero.best': '🔥 Lihat Terlaris',
    'hero.all': 'Jelajahi Produk',
    'stat.tx': 'TRANSAKSI SUKSES',
    'stat.rating': 'RATING PEMBELI',
    'stat.instant': 'PENGIRIMAN',
    'stat.tx_sub': 'Sejak 2024',
    'stat.rating_sub': 'Dari 12.000+ ulasan',
    'stat.instant_sub': 'Rata-rata 45 detik',

    // bagian
    'sec.best': '🔥 Produk Terlaris',
    'sec.best_sub': 'Paling banyak dibeli minggu ini',
    'sec.all': 'Lihat semua →',
    'sec.cats': '📂 Kategori Produk',
    'sec.cats_sub': 'Pilih kategori dan langsung lihat isinya',
    'sec.explore': '🧭 Jelajahi Produk',
    'sec.why': '✨ Kenapa Belanja di DigiPasar?',
    'sec.search': 'Hasil pencarian',

    // filter katalog
    'filter.all': 'Semua',
    'filter.sort': 'Urutkan',
    'sort.populer': 'Terpopuler',
    'sort.terbaru': 'Terbaru',
    'sort.termurah': 'Termurah',
    'sort.termahal': 'Termahal',
    'filter.min': 'Harga min',
    'filter.max': 'Harga maks',
    'filter.reset': 'Reset',
    'filter.count': '{n} produk',
    'filter.result': 'Hasil',
    'filter.searching': 'pencarian "{q}"',
    'filter.in_cat': 'kategori terpilih',
    'filter.empty': 'Tidak ada produk yang cocok dengan filter.',

    // kartu produk
    'card.sold': 'Terjual {n}',
    'card.addcart': 'Tambah ke Keranjang',
    'p.buy': 'Beli Sekarang',
    'p.fast': 'Checkout Langsung',
    'p.pick_variant': 'Pilih varian yang tersedia terlebih dahulu.',
    'p.low_stock': 'Stok tidak mencukupi untuk jumlah tersebut.',
    'p.required': '"{label}" wajib diisi.',
    'co.creating': 'Membuat pesanan...',
    'co.created': 'Pesanan dibuat! Mengalihkan...',
    'co.created_pay': 'Pesanan dibuat! Membuka pembayaran...',
    'co.created_err': 'Pesanan dibuat, tapi Midtrans bermasalah',
    'co.failed': 'Gagal membuat pesanan.',
    'co.pay_btn': 'Buat Pesanan & Bayar',

    // kenapa
    'why.1t': 'Kirim Instan', 'why.1d': 'Pesanan diproses otomatis dalam hitungan detik, 24/7.',
    'why.2t': 'Pembayaran Aman', 'why.2d': 'QRIS, transfer bank, dan e-wallet tanpa risiko.',
    'why.3t': 'Harga Termurah', 'why.3d': 'Selalu ada promo dan harga grosir untuk semua.',
    'why.4t': 'Support Ramah', 'why.4d': 'Tim siap bantu setiap hari kalau ada masalah.',

    // auth
    'login.title': 'Selamat Datang Kembali',
    'login.sub': 'Masuk untuk melanjutkan belanja produk digital.',
    'login.email': 'Email',
    'login.pass': 'Password',
    'login.submit': 'Masuk',
    'login.no_acc': 'Belum punya akun?',
    'login.reg_link': 'Daftar gratis',
    'login.foot': 'Dilindungi Cloudflare Turnstile • Login Google instan',
    'reg.title': 'Buat Akun Baru',
    'reg.sub': 'Daftar gratis dan mulai belanja produk digital.',
    'reg.name': 'Nama Lengkap',
    'reg.email': 'Email',
    'reg.pass': 'Password',
    'reg.pass_min': 'Minimal 6 karakter',
    'reg.submit': 'Daftar Sekarang',
    'reg.have_acc': 'Sudah punya akun?',
    'reg.login_link': 'Masuk di sini',
    'reg.foot': 'Gratis selamanya • Tanpa kartu kredit',

    // produk detail
    'pd.back': '← Kembali',
    'pd.sold': 'Terjual {n}',
    'pd.stock': 'Stok tersedia',
    'pd.stock_out': 'Stok habis',
    'pd.pick_variant': 'Pilih Varian',
    'pd.no_variant': 'Tidak ada varian tersedia.',
    'pd.data_buyer': 'Data Penerima',
    'pd.no_data': 'Tidak ada data tambahan yang diperlukan.',
    'pd.qty': 'Jumlah',
    'pd.total': 'Total',
    'pd.cart_add': '🛒 Keranjang',
    'pd.buy': '🛒 Beli Sekarang',
    'pd.buy_fast': '⚡ Checkout Langsung',
    'pd.trust1': 'Kirim Instan', 'pd.trust2': '100% Aman', 'pd.trust3': 'Support 24/7',
    'pd.required': 'wajib diisi',

    // checkout
    'co.title': 'Checkout',
    'co.summary': 'Ringkasan Pesanan',
    'co.buyer_data': 'Data Penerima',
    'co.total': 'Total Bayar',
    'co.pay_method': 'Metode Pembayaran',
    'co.pay_hint': 'Instruksi pembayaran lengkap akan ditampilkan di halaman invoice setelah pesanan dibuat.',
    'co.submit': 'Buat Pesanan',
    'co.processing': 'Memproses...',
    'co.empty': 'Belum ada item untuk dibayar.',
    'co.back_home': 'Kembali ke Beranda',

    // dashboard
    'db.greeting': 'Halo,',
    'db.member': 'MEMBER',
    'db.admin': 'ADMIN',
    'db.orders': 'Pesanan Saya',
    'db.orders_empty': 'Anda belum memiliki pesanan.',
    'db.start_shopping': 'Mulai Belanja',
    'db.detail': 'Lihat detail →',

    // invoice
    'or.invoice': 'Invoice',
    'or.created': 'Dibuat',
    'or.details': 'Rincian Pesanan',
    'or.no_item': 'Tidak ada item.',
    'or.pay': 'Pembayaran',
    'or.wait_pay': 'Selesaikan pembayaran, lalu tekan tombol di bawah agar pesanan Anda segera diverifikasi.',
    'or.paid_btn': '✅ Saya Sudah Bayar',
    'or.snap_pay': '💳 Bayar Sekarang',
    'or.snap_note': 'Pesanan dibuat. Selesaikan pembayaran via Midtrans untuk verifikasi otomatis.',
    'or.verifying': 'Pembayaran Anda sedang diverifikasi admin. Halaman ini diperbarui otomatis setiap 15 detik.',
    'or.processing_note': 'Pesanan Anda sedang diproses. Produk digital akan dikirim otomatis setelah selesai.',
    'or.done_note': 'Pesanan selesai! Cek email Anda untuk detail produk digital.',
    'or.not_found': 'Pesanan tidak ditemukan',
    'or.to_dashboard': '← Kembali ke Dashboard',
    'or.note': 'Catatan',

    // admin
    'ad.title': 'Admin Panel',
    'ad.sub': 'Kelola produk, pesanan, dan pantau statistik toko.',
    'ad.products': '📦 Produk',
    'ad.orders': '🧾 Pesanan',
    'ad.add': '+ Tambah Produk',
    'ad.stats_rev': 'Total Pendapatan',
    'ad.stats_orders': 'Total Pesanan',
    'ad.stats_products': 'Total Produk',
    'ad.stats_users': 'Total Pengguna',
    'ad.denied': 'Akses Ditolak',
    'ad.denied_sub': 'Halaman ini hanya dapat diakses oleh akun dengan peran admin.',
    'ad.to_home': 'Kembali ke Beranda',
    'ad.empty_product': 'Belum ada produk. Klik "Tambah Produk".',
    'ad.empty_order': 'Tidak ada pesanan pada filter ini.',
    'ad.save': 'Simpan',

    // status pesanan
    'status.pending': 'Menunggu Pembayaran',
    'status.menunggu_verifikasi': 'Menunggu Verifikasi',
    'status.diproses': 'Diproses',
    'status.selesai': 'Selesai',
    'status.dibatalkan': 'Dibatalkan',

    // pembayaran
    'pay.midtrans': 'Midtrans (Otomatis)',
    'pay.midtrans_short': 'QRIS, VA Bank, E-Wallet, Gerai — verifikasi otomatis',
    'pay.qris': 'QRIS',
    'pay.qris_short': 'Scan QR dari e-wallet / m-banking apa pun',
    'pay.bca': 'Transfer Bank BCA',
    'pay.bca_short': 'Transfer ke Virtual Account BCA',
    'pay.dana': 'DANA',
    'pay.dana_short': 'Kirim ke nomor DANA merchant',

    // umum
    'common.close': 'Tutup',
    'common.cancel': 'Batal',
    'common.save': 'Simpan',
    'footer.rights': 'Marketplace Produk Digital Indonesia.',
  },

  en: {
    'nav.home': 'Home',
    'nav.account': 'Account',
    'nav.katalog': 'Catalog',
    'nav.kategori': 'Categories',
    'nav.search_ph': 'Search products or brands...',
    'nav.notif': 'Notifications',
    'nav.cart': 'Cart',
    'nav.login': 'Sign in',
    'nav.register': 'Sign up',
    'nav.dashboard': 'My Dashboard',
    'nav.admin': 'Admin Panel',
    'nav.logout': 'Sign out',
    'nav.semua_kategori': 'All Categories',

    'notif.empty': 'No notifications yet.',
    'notif.login': 'Sign in to see your order notifications.',
    'notif.latest': 'Recent orders',

    'cart.title': 'Shopping Cart',
    'cart.empty': 'Your cart is empty.',
    'cart.remove': 'Remove',
    'cart.subtotal': 'Subtotal',
    'cart.checkout': 'Checkout',
    'cart.added': 'Added to cart!',
    'cart.count': 'items in cart',

    'hero.badge': '🚀 INSTANT DELIVERY 24/7 • SECURE PAYMENT',
    'hero.h1a': 'All Your Digital Needs',
    'hero.h1b': 'in One Place',
    'hero.sub': 'Game top-ups, e-money, vouchers, and premium subscriptions — delivered to your email in seconds.',
    'hero.search_ph': 'What are you looking for?',
    'hero.search_btn': 'Search',
    'hero.best': '🔥 View Best Sellers',
    'hero.all': 'Browse Products',
    'stat.tx': 'SUCCESSFUL TRANSACTIONS',
    'stat.rating': 'BUYER RATING',
    'stat.instant': 'DELIVERY',
    'stat.tx_sub': 'Since 2024',
    'stat.rating_sub': 'From 12,000+ reviews',
    'stat.instant_sub': '45 seconds average',

    'sec.best': '🔥 Best Sellers',
    'sec.best_sub': 'Most purchased this week',
    'sec.all': 'See all →',
    'sec.cats': '📂 Product Categories',
    'sec.cats_sub': 'Pick a category and see its products',
    'sec.explore': '🧭 Explore Products',
    'sec.why': '✨ Why Shop at DigiPasar?',
    'sec.search': 'Search results',

    'filter.all': 'All',
    'filter.sort': 'Sort',
    'sort.populer': 'Most popular',
    'sort.terbaru': 'Newest',
    'sort.termurah': 'Price: low to high',
    'sort.termahal': 'Price: high to low',
    'filter.min': 'Min price',
    'filter.max': 'Max price',
    'filter.reset': 'Reset',
    'filter.count': '{n} products',
    'filter.result': 'Results',
    'filter.searching': 'search "{q}"',
    'filter.in_cat': 'selected category',
    'filter.empty': 'No products match these filters.',

    'card.sold': '{n} sold',
    'card.addcart': 'Add to Cart',
    'p.buy': 'Buy Now',
    'p.fast': 'Checkout Now',
    'p.pick_variant': 'Please choose an available variant first.',
    'p.low_stock': 'Stock is insufficient for that quantity.',
    'p.required': '"{label}" is required.',
    'co.creating': 'Creating order...',
    'co.created': 'Order created! Redirecting...',
    'co.created_pay': 'Order created! Opening payment...',
    'co.created_err': 'Order created, but Midtrans had a problem',
    'co.failed': 'Failed to create order.',
    'co.pay_btn': 'Create Order & Pay',

    'why.1t': 'Instant Delivery', 'why.1d': 'Orders processed automatically in seconds, 24/7.',
    'why.2t': 'Secure Payment', 'why.2d': 'QRIS, bank transfer, and e-wallet with zero risk.',
    'why.3t': 'Lowest Prices', 'why.3d': 'Always promos and wholesale prices for everyone.',
    'why.4t': 'Friendly Support', 'why.4d': 'Our team is ready to help every day.',

    'login.title': 'Welcome Back',
    'login.sub': 'Sign in to continue shopping digital products.',
    'login.email': 'Email',
    'login.pass': 'Password',
    'login.submit': 'Sign in',
    'login.no_acc': "Don't have an account?",
    'login.reg_link': 'Sign up free',
    'login.foot': 'Protected by Cloudflare Turnstile • Instant Google login',
    'reg.title': 'Create an Account',
    'reg.sub': 'Sign up free and start shopping digital products.',
    'reg.name': 'Full Name',
    'reg.email': 'Email',
    'reg.pass': 'Password',
    'reg.pass_min': 'At least 6 characters',
    'reg.submit': 'Sign Up Now',
    'reg.have_acc': 'Already have an account?',
    'reg.login_link': 'Sign in here',
    'reg.foot': 'Free forever • No credit card',

    'pd.back': '← Back',
    'pd.sold': '{n} sold',
    'pd.stock': 'In stock',
    'pd.stock_out': 'Out of stock',
    'pd.pick_variant': 'Choose a Variant',
    'pd.no_variant': 'No variants available.',
    'pd.data_buyer': 'Recipient Data',
    'pd.no_data': 'No additional data required.',
    'pd.qty': 'Quantity',
    'pd.total': 'Total',
    'pd.cart_add': '🛒 Cart',
    'pd.buy': '🛒 Buy Now',
    'pd.buy_fast': '⚡ Quick Checkout',
    'pd.trust1': 'Instant Delivery', 'pd.trust2': '100% Safe', 'pd.trust3': '24/7 Support',
    'pd.required': 'required',

    'co.title': 'Checkout',
    'co.summary': 'Order Summary',
    'co.buyer_data': 'Recipient Data',
    'co.total': 'Total Payment',
    'co.pay_method': 'Payment Method',
    'co.pay_hint': 'Full payment instructions will appear on the invoice page after the order is created.',
    'co.submit': 'Place Order',
    'co.processing': 'Processing...',
    'co.empty': 'No items to pay for.',
    'co.back_home': 'Back to Home',

    'db.greeting': 'Hello,',
    'db.member': 'MEMBER',
    'db.admin': 'ADMIN',
    'db.orders': 'My Orders',
    'db.orders_empty': 'You have no orders yet.',
    'db.start_shopping': 'Start Shopping',
    'db.detail': 'View details →',

    'or.invoice': 'Invoice',
    'or.created': 'Created',
    'or.details': 'Order Details',
    'or.no_item': 'No items.',
    'or.pay': 'Payment',
    'or.wait_pay': 'Complete your payment, then press the button below so your order is verified quickly.',
    'or.paid_btn': '✅ I Have Paid',
    'or.snap_pay': '💳 Pay Now',
    'or.snap_note': 'Order created. Complete the Midtrans payment for automatic verification.',
    'or.verifying': 'Your payment is being verified by admin. This page auto-refreshes every 15 seconds.',
    'or.processing_note': 'Your order is being processed. Digital products will be delivered automatically when done.',
    'or.done_note': 'Order complete! Check your email for the digital product details.',
    'or.not_found': 'Order not found',
    'or.to_dashboard': '← Back to Dashboard',
    'or.note': 'Note',

    'ad.title': 'Admin Panel',
    'ad.sub': 'Manage products, orders, and monitor store stats.',
    'ad.products': '📦 Products',
    'ad.orders': '🧾 Orders',
    'ad.add': '+ Add Product',
    'ad.stats_rev': 'Total Revenue',
    'ad.stats_orders': 'Total Orders',
    'ad.stats_products': 'Total Products',
    'ad.stats_users': 'Total Users',
    'ad.denied': 'Access Denied',
    'ad.denied_sub': 'This page is only accessible to admin accounts.',
    'ad.to_home': 'Back to Home',
    'ad.empty_product': 'No products yet. Click "Add Product".',
    'ad.empty_order': 'No orders match this filter.',
    'ad.save': 'Save',

    'status.pending': 'Awaiting Payment',
    'status.menunggu_verifikasi': 'Awaiting Verification',
    'status.diproses': 'Processing',
    'status.selesai': 'Completed',
    'status.dibatalkan': 'Cancelled',

    'pay.midtrans': 'Midtrans (Automatic)',
    'pay.midtrans_short': 'QRIS, bank VA, e-wallet, retail — auto verification',
    'pay.qris': 'QRIS',
    'pay.qris_short': 'Scan QR from any e-wallet / mobile banking',
    'pay.bca': 'BCA Bank Transfer',
    'pay.bca_short': 'Transfer to BCA Virtual Account',
    'pay.dana': 'DANA',
    'pay.dana_short': 'Send to DANA merchant number',

    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'footer.rights': 'Indonesian Digital Product Marketplace.',
  }
};

function lang() { return localStorage.getItem('dp_lang') === 'en' ? 'en' : 'id'; }
function t(key, vars) {
  const d = I18N[lang()] || I18N.id;
  let s = d[key] ?? I18N.id[key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}
function setLang(l) {
  localStorage.setItem('dp_lang', l === 'en' ? 'en' : 'id');
  sessionStorage.setItem('dp_scroll', String(window.scrollY || 0));
  location.reload();
}
/** Terapkan teks statis yang punya atribut data-i18n / data-i18n-ph */
function applyI18n(root) {
  (root || document).querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  (root || document).querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  (root || document).querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
}
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = lang();
  applyI18n();
  // pulihkan posisi scroll setelah ganti bahasa
  const y = sessionStorage.getItem('dp_scroll');
  if (y !== null) {
    sessionStorage.removeItem('dp_scroll');
    requestAnimationFrame(() => window.scrollTo(0, parseInt(y, 10) || 0));
  }
});
