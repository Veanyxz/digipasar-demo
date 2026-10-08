// server.js — DigiPasar marketplace backend
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('cookie-session');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { db } = require('./db');
const midtrans = require('./lib/midtrans');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// cookie-session: signed cookie stateless — mutlak untuk serverless (tanpa memori
// antar instance) dan tetap cocok untuk dev lokal
app.use(session({
  name: 'digipasar.sid',
  keys: [process.env.SESSION_SECRET || 'digipasar-demo-secret'],
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 3600 * 1000,
}));

app.use(express.static(path.join(__dirname, 'public')));

// ---------- persistensi demo (Netlify Blobs) ----------
// Lokal: mati (file SQLite biasa). Di Lambda: hydrate tiap request /api,
// save sebelum respons JSON untuk metode tulis.
const persist = require('./lib/persist');
app.get('/api/health', (req, res) => ok(res, {
  mode: persist.on ? 'lambda' : 'file', sqlite: true, err: persist.error || null, ts: Date.now(),
}));
app.use(async (req, res, next) => {
  if (persist.on && (req.path.startsWith('/api/') || req.path.startsWith('/img/uploads/'))) {
    try { await persist.hydrate(); } catch (e) { console.warn('[persist] hydrate:', e.message); }
  }
  if (persist.on && req.method !== 'GET' && req.method !== 'HEAD') {
    const orig = res.json.bind(res);
    let saved = false;
    res.json = async (payload) => {
      if (!saved) {
        saved = true;
        try { await persist.save(); } catch (e) { console.warn('[persist] save:', e.message); }
      }
      return orig(payload);
    };
  }
  next();
});

// sajikan upload dari Blobs (file fisik tidak ada di Lambda)
app.get('/img/uploads/:name', async (req, res) => {
  if (!persist.on) return fail(res, 404, 'Tidak ditemukan.');
  const safe = path.basename(req.params.name);
  try {
    const buf = await persist.store.get('up-' + safe);
    if (!buf) return fail(res, 404, 'Tidak ditemukan.');
    const ext = safe.split('.').pop().toLowerCase();
    const ct = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }[ext] || 'application/octet-stream';
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(Buffer.from(buf));
  } catch (e) {
    return fail(res, 404, 'Tidak ditemukan.');
  }
});

// ---------- helpers ----------
const ok = (res, data = {}) => res.json({ ok: true, ...data });
const fail = (res, code, error) => res.status(code).json({ ok: false, error });
const num = (v) => typeof v === 'bigint' ? Number(v) : v; // node:sqlite BigInt → Number

const requireAuth = (req, res, next) => {
  if (!req.session.user) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
  next();
};
const requireAdmin = (req, res, next) => {
  if (!req.session.user) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
  if (req.session.user.role !== 'admin') return fail(res, 403, 'Akses ditolak. Khusus admin.');
  next();
};

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar || null });

// ---------- Gambar produk: daftar default + unggah ----------
const IMG_DIRS = ['img/products', 'img/uploads'];
app.get('/api/image-defaults', (req, res) => {
  const out = [];
  for (const d of IMG_DIRS) {
    const dir = path.join(__dirname, 'public', d);
    let files = [];
    try {
      files = fs.readdirSync(dir);
    } catch (e) {
      // mode Lambda: folder publik tidak ikut ter-bundle fungsi → pakai daftar
      // hasil build (_imagelist.json, disertakan via included_files di netlify.toml)
      try { files = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'public', d, '_imagelist.json'), 'utf8')); }
      catch (e2) { continue; }
    }
    for (const f of files) {
      if (f.startsWith('_') || f.startsWith('.')) continue;
      if (!/\.(png|jpe?g|webp|gif)$/i.test(f)) continue;
      out.push({ name: f.replace(/\.[^.]+$/, ''), url: '/' + d + '/' + encodeURIComponent(f) });
    }
  }
  ok(res, { images: out });
});

const EXT_MAP = { png: 'png', jpeg: 'jpg', jpg: 'jpg', webp: 'webp', gif: 'gif' };
app.post('/api/upload', requireAuth, async (req, res) => {
  try {
    const { name, data } = req.body || {};
    const m = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(String(data || ''));
    if (!m) return fail(res, 400, 'File harus gambar PNG/JPG/WEBP/GIF.');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 3.5 * 1024 * 1024) return fail(res, 413, 'Ukuran gambar maksimal 3.5 MB.');
    const ext = EXT_MAP[m[1]] || 'png';
    const base = path.basename(String(name || 'produk')).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'produk';
    const fname = `${Date.now()}-${base}.${ext}`;
    if (persist.on) {
      await persist.store.set('up-' + fname, buf, { contentType: 'image/' + ext });
    } else {
      const dir = path.join(__dirname, 'public', 'img', 'uploads');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, fname), buf);
    }
    ok(res, { url: '/img/uploads/' + fname });
  } catch (e) {
    fail(res, 500, 'Gagal mengunggah: ' + e.message);
  }
});

// ---------- Notifikasi (promo admin + update transaksi user) ----------
app.get('/api/notifications', requireAuth, (req, res) => {
  const uid = req.session.user.id;
  // promo/broadcast: umum (user_id NULL) + yang dikirim khusus ke user ini
  const promos = db.prepare(`
    SELECT n.*, EXISTS(SELECT 1 FROM notification_reads r WHERE r.notif_id = n.id AND r.user_id = ?) AS rd
    FROM notifications n
    WHERE n.user_id IS NULL OR n.user_id = ?
    ORDER BY n.id DESC LIMIT 30`).all(uid, uid)
    .map(n => ({
      key: 'n' + n.id, type: 'promo', icon: n.icon || '📣',
      title: n.title, body: n.body || '', createdAt: n.created_at, read: !!n.rd,
    }));
  // update transaksi user: setiap order = satu notifikasi status terkininya
  const orders = db.prepare(`
    SELECT id, invoice, total, status, items_json, created_at, updated_at
    FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 20`).all(uid)
    .map(o => ({
      key: 'o' + o.id, type: 'order', icon: '🧾',
      title: `${o.invoice} — ${STATUS_LABEL[o.status] || o.status}`,
      body: `${JSON.parse(o.items_json || '[]').length} item • ${num(o.total)}`,
      createdAt: o.updated_at || o.created_at,
      status: o.status, orderId: o.id, read: false,
    }));
  const items = [...promos, ...orders]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  ok(res, { items });
});

// tandai promo sudah dibaca (per user)
app.post('/api/notifications/read', requireAuth, (req, res) => {
  const uid = req.session.user.id;
  const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids.slice(0, 100) : [];
  const ins = db.prepare('INSERT OR IGNORE INTO notification_reads (user_id, notif_id) VALUES (?,?)');
  for (const raw of ids) {
    const id = parseInt(String(raw).replace(/^n/, ''), 10);
    if (Number.isInteger(id) && id > 0) ins.run(uid, id);
  }
  ok(res, {});
});

// tandai semua promo dibaca
app.post('/api/notifications/read-all', requireAuth, (req, res) => {
  const uid = req.session.user.id;
  db.prepare(`INSERT OR IGNORE INTO notification_reads (user_id, notif_id)
              SELECT ?, id FROM notifications WHERE user_id IS NULL OR user_id = ?`).run(uid, uid);
  ok(res, {});
});

// admin: kirim notifikasi (kosong = broadcast ke semua; email = khusus user itu)
app.post('/api/admin/notifications', requireAdmin, (req, res) => {
  const { icon, title, body, targetEmail } = req.body || {};
  if (!title || !String(title).trim()) return fail(res, 400, 'Judul notifikasi wajib diisi.');
  let userId = null;
  if (targetEmail && String(targetEmail).trim()) {
    const u = db.prepare('SELECT id FROM users WHERE email = ?').get(String(targetEmail).trim().toLowerCase());
    if (!u) return fail(res, 404, 'Email pengguna tidak ditemukan.');
    userId = u.id;
  }
  const r = db.prepare('INSERT INTO notifications (user_id,icon,title,body) VALUES (?,?,?,?)')
    .run(userId, String(icon || '📣').slice(0, 8), String(title).trim().slice(0, 120), String(body || '').trim().slice(0, 500));
  ok(res, { id: num(r.lastInsertRowid) });
});

app.get('/api/admin/notifications', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT n.*, u.email AS target_email,
      (SELECT COUNT(*) FROM notification_reads r WHERE r.notif_id = n.id) AS read_count
    FROM notifications n LEFT JOIN users u ON u.id = n.user_id
    ORDER BY n.id DESC LIMIT 50`).all();
  ok(res, { items: rows.map(n => ({
    id: n.id, icon: n.icon, title: n.title, body: n.body,
    target: n.target_email || null, readCount: n.read_count, createdAt: n.created_at,
  })) });
});

app.delete('/api/admin/notifications/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return fail(res, 400, 'ID tidak valid.');
  const r = db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
  if (!r.changes) return fail(res, 404, 'Notifikasi tidak ditemukan.');
  ok(res, {});
});

// ---------- Cloudflare Turnstile ----------
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY kosong — verifikasi dilewati (mode dev).');
    return true;
  }
  if (!token) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip || '' }),
    });
    const data = await r.json();
    return data.success === true;
  } catch (e) {
    console.error('[turnstile] verify error:', e.message);
    return false;
  }
}

// ---------- Google OAuth (login instan Gmail) ----------
async function verifyGoogle(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
  const p = ticket.getPayload();
  if (!p || !p.email_verified) throw new Error('Email Google belum terverifikasi.');
  return p; // { sub, email, name, picture, ... }
}

const findUserByEmail = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
const findUserByGoogle = (sub) => db.prepare('SELECT * FROM users WHERE google_id = ?').get(sub);

// ---------- public config ----------
app.get('/api/config', (req, res) => ok(res, {
  turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleEnabled: !!process.env.GOOGLE_CLIENT_ID,
  midtransClientKey: midtrans.cfg().clientKey,
  midtransEnabled: midtrans.enabled(),
  midtransIsProduction: midtrans.cfg().isProduction,
}));

// ---------- auth ----------
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, turnstile } = req.body || {};
  if (!name || !email || !password) return fail(res, 400, 'Nama, email, dan kata sandi wajib diisi.');
  if (password.length < 6) return fail(res, 400, 'Kata sandi minimal 6 karakter.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'Format email tidak valid.');
  if (!(await verifyTurnstile(turnstile, req.ip))) return fail(res, 400, 'Verifikasi captcha gagal. Coba lagi.');
  if (findUserByEmail(email)) return fail(res, 409, 'Email sudah terdaftar. Silakan masuk.');

  const hash = bcrypt.hashSync(password, 10);
  const r = db.prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)')
    .run(name.trim().slice(0, 80), email.toLowerCase().trim(), hash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(num(r.lastInsertRowid));
  req.session.user = publicUser(user);
  ok(res, { user: req.session.user });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, turnstile } = req.body || {};
  if (!email || !password) return fail(res, 400, 'Email dan kata sandi wajib diisi.');
  if (!(await verifyTurnstile(turnstile, req.ip))) return fail(res, 400, 'Verifikasi captcha gagal. Coba lagi.');
  const user = findUserByEmail(email);
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash))
    return fail(res, 401, 'Email atau kata sandi salah.');
  req.session.user = publicUser(user);
  ok(res, { user: req.session.user });
});

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) return fail(res, 400, 'Kredensial Google tidak ada.');
  if (!process.env.GOOGLE_CLIENT_ID) return fail(res, 503, 'Login Google belum dikonfigurasi.');
  let payload;
  try { payload = await verifyGoogle(credential); }
  catch (e) { return fail(res, 401, 'Token Google tidak valid: ' + e.message); }

  let user = findUserByGoogle(payload.sub) || findUserByEmail(payload.email);
  if (!user) {
    const r = db.prepare('INSERT INTO users (name,email,google_id,avatar) VALUES (?,?,?,?)')
      .run((payload.name || payload.email.split('@')[0]).slice(0, 80), payload.email.toLowerCase(), payload.sub, payload.picture || null);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(num(r.lastInsertRowid));
  } else if (!user.google_id) {
    db.prepare('UPDATE users SET google_id = ?, avatar = COALESCE(avatar,?) WHERE id = ?')
      .run(payload.sub, payload.picture || null, user.id);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }
  req.session.user = publicUser(user);
  ok(res, { user: req.session.user });
});

app.post('/api/auth/logout', (req, res) => {
  req.session = null;
  ok(res);
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.user) return fail(res, 401, 'Belum masuk.');
  ok(res, { user: req.session.user });
});

// ---------- katalog ----------
app.get('/api/categories', (req, res) => {
  const categories = db.prepare('SELECT id,slug,name,icon FROM categories ORDER BY sort').all();
  ok(res, { categories });
});

app.get('/api/products', (req, res) => {
  const { cat = '', q = '', sort = 'populer', page = '1', limit = '24', min = '', max = '' } = req.query;
  const lim = Math.min(Math.max(parseInt(limit) || 24, 1), 60);
  const pg = Math.max(parseInt(page) || 1, 1);
  const where = ['p.active = 1'];
  const params = [];
  if (cat) { where.push('c.slug = ?'); params.push(cat); }
  if (q) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const eff = 'COALESCE(p.discount_price,p.price)';
  if (min !== '' && !isNaN(parseInt(min))) { where.push(`${eff} >= ?`); params.push(parseInt(min)); }
  if (max !== '' && !isNaN(parseInt(max))) { where.push(`${eff} <= ?`); params.push(parseInt(max)); }
  const orderBy = {
    populer: 'p.sold DESC', termurah: 'COALESCE(p.discount_price,p.price) ASC',
    termahal: 'COALESCE(p.discount_price,p.price) DESC', terbaru: 'p.id DESC',
  }[sort] || 'p.sold DESC';

  const total = db.prepare(`SELECT COUNT(*) c FROM products p JOIN categories c ON c.id=p.category_id WHERE ${where.join(' AND ')}`).get(...params).c;
  const items = db.prepare(`
    SELECT p.id,p.slug,p.name,p.emoji,p.image,p.badge,p.price,p.discount_price AS discountPrice,p.rating,p.sold,
           c.name category, c.slug categorySlug
    FROM products p JOIN categories c ON c.id=p.category_id
    WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, lim, (pg - 1) * lim);
  ok(res, { items, total, page: pg });
});

app.get('/api/products/:slug', (req, res) => {
  const p = db.prepare(`
    SELECT p.*, c.name category, c.slug categorySlug FROM products p
    JOIN categories c ON c.id=p.category_id WHERE p.slug = ? AND p.active = 1`).get(req.params.slug);
  if (!p) return fail(res, 404, 'Produk tidak ditemukan.');
  const variants = db.prepare('SELECT id,name,price,discount_price AS discountPrice,stock FROM variants WHERE product_id=? ORDER BY sort').all(p.id);
  ok(res, { product: {
    id: p.id, slug: p.slug, name: p.name, category: p.category, categorySlug: p.categorySlug,
    emoji: p.emoji, image: p.image, rating: p.rating, sold: p.sold, badge: p.badge, description: p.description,
    fields: JSON.parse(p.fields_json || '[]'), variants,
  }});
});

// ---------- checkout & order ----------
const PAYMENTS = {
  midtrans: { label: 'Midtrans', instructions: 'Bayar otomatis via QRIS, Virtual Account bank, e-wallet (GoPay/OVO/DANA/ShopeePay), kartu, atau gerai retail. Status terverifikasi otomatis setelah pembayaran.' },
  qris: { label: 'QRIS', instructions: 'Scan kode QR yang tampil setelah pesanan dibuat. Pembayaran terverifikasi otomatis ±5 menit.' },
  bca: { label: 'Transfer BCA', instructions: 'Transfer ke BCA 8210-1234-5678 a.n. PT DigiPasar Digital. Cantumkan nomor invoice pada berita transfer.' },
  dana: { label: 'DANA / E-Wallet', instructions: 'Kirim ke DANA 0812-3456-7890 a.n. DigiPasar. Cantumkan nomor invoice pada catatan.' },
};

function nextInvoice() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const n = db.prepare("SELECT COUNT(*) c FROM orders WHERE invoice LIKE ?").get(`DP-${ymd}-%`).c + 1;
  return `DP-${ymd}-${String(n).padStart(4, '0')}`;
}

app.post('/api/orders', requireAuth, async (req, res) => {
  const { items, inputs, payment } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return fail(res, 400, 'Keranjang kosong.');
  if (!PAYMENTS[payment]) return fail(res, 400, 'Metode pembayaran tidak valid.');

  const detailed = [];
  let subtotal = 0;
  for (const it of items.slice(0, 20)) {
    const v = db.prepare(`SELECT v.*, p.name pname, p.slug pslug, p.emoji pem, p.image pimg, p.fields_json FROM variants v
      JOIN products p ON p.id=v.product_id WHERE v.id=? AND p.active=1`).get(it.variantId);
    if (!v) return fail(res, 400, 'Varian produk tidak valid.');
    const qty = Math.max(1, Math.min(parseInt(it.qty) || 1, 99));
    const price = v.discount_price ?? v.price;
    if (v.stock !== -1 && v.stock < qty) return fail(res, 400, `Stok "${v.name}" tidak mencukupi.`);
    subtotal += price * qty;
    detailed.push({ variantId: v.id, productSlug: v.pslug, name: `${v.pname} — ${v.name}`, emoji: v.pem, image: v.pimg, qty, price });
  }

  // validasi field custom produk pertama (semua item diasumsikan satu produk)
  const prodsInCart = new Set(detailed.map(d => d.productSlug));
  const first = db.prepare('SELECT fields_json FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id=?')
    .get(items[0].variantId);
  const fields = prodsInCart.size > 1 ? [] : JSON.parse(first?.fields_json || '[]');  // cart multi-produk: lewati validasi field
  for (const f of fields) {
    if (f.required && !(inputs && String(inputs[f.key] || '').trim()))
      return fail(res, 400, `"${f.label}" wajib diisi.`);
  }

  const fee = 0;
  const total = subtotal + fee;
  const invoice = nextInvoice();
  const r = db.prepare(`INSERT INTO orders (invoice,user_id,items_json,inputs_json,subtotal,fee,total,payment)
    VALUES (?,?,?,?,?,?,?,?)`).run(invoice, req.session.user.id,
    JSON.stringify(detailed), JSON.stringify(inputs || {}), subtotal, fee, total, payment);
  db.prepare('UPDATE products SET sold = sold + 1 WHERE id = (SELECT product_id FROM variants WHERE id = ?)')
    .run(items[0].variantId);

  const orderId = num(r.lastInsertRowid);

  // Pembayaran Midtrans: buatkan Snap token sekalian
  if (payment === 'midtrans') {
    if (!midtrans.enabled()) {
      db.prepare('DELETE FROM orders WHERE id=?').run(orderId);
      return fail(res, 503, 'Pembayaran Midtrans belum dikonfigurasi.');
    }
    try {
      const snap = await midtrans.createSnapTransaction({
        orderId: invoice,
        grossAmount: total,
        customer: { name: req.session.user.name, email: req.session.user.email },
        items: detailed,
      });
      return ok(res, { order: { id: orderId, invoice, total, status: 'pending' }, snapToken: snap.token, snapRedirectUrl: snap.redirect_url });
    } catch (e) {
      // Order tetap tersimpan (pending); user bisa coba lagi via "Bayar Sekarang" di invoice
      console.error('[midtrans] snap error:', e.message);
      return ok(res, { order: { id: orderId, invoice, total, status: 'pending' }, snapError: e.message });
    }
  }

  ok(res, { order: { id: orderId, invoice, total, status: 'pending' } });
});

const STATUS_LABEL = {
  pending: 'Menunggu Pembayaran', menunggu_verifikasi: 'Menunggu Verifikasi',
  diproses: 'Diproses', selesai: 'Selesai', dibatalkan: 'Dibatalkan',
};

app.get('/api/orders', requireAuth, (req, res) => {
  const orders = db.prepare('SELECT id,invoice,total,status,payment,created_at AS createdAt,items_json FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 50')
    .all(req.session.user.id)
    .map(o => ({ id: o.id, invoice: o.invoice, total: o.total, status: o.status, statusLabel: STATUS_LABEL[o.status], payment: o.payment, createdAt: o.createdAt, items: JSON.parse(o.items_json) }));
  ok(res, { orders });
});

app.get('/api/orders/:id', requireAuth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!o) return fail(res, 404, 'Pesanan tidak ditemukan.');
  if (o.user_id !== req.session.user.id && req.session.user.role !== 'admin')
    return fail(res, 403, 'Akses ditolak.');
  ok(res, { order: {
    id: o.id, invoice: o.invoice, total: o.total, subtotal: o.subtotal, fee: o.fee,
    status: o.status, statusLabel: STATUS_LABEL[o.status], payment: o.payment,
    paymentLabel: PAYMENTS[o.payment]?.label || o.payment,
    paymentInstructions: PAYMENTS[o.payment]?.instructions || '',
    inputs: JSON.parse(o.inputs_json || '{}'), items: JSON.parse(o.items_json),
    createdAt: o.created_at, note: o.note,
  }});
});

app.post('/api/orders/:id/paid', requireAuth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(req.params.id, req.session.user.id);
  if (!o) return fail(res, 404, 'Pesanan tidak ditemukan.');
  if (o.status !== 'pending') return fail(res, 400, 'Status pesanan tidak dapat diubah.');
  db.prepare("UPDATE orders SET status='menunggu_verifikasi', updated_at=datetime('now') WHERE id=?").run(o.id);
  ok(res, {});
});

// Buat (ulang) Snap token untuk order Midtrans yang masih pending
app.post('/api/orders/:id/snap', requireAuth, async (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(req.params.id, req.session.user.id);
  if (!o) return fail(res, 404, 'Pesanan tidak ditemukan.');
  if (o.payment !== 'midtrans') return fail(res, 400, 'Pesanan ini tidak memakai Midtrans.');
  if (!['pending', 'menunggu_verifikasi'].includes(o.status)) return fail(res, 400, 'Pesanan sudah tidak bisa dibayar.');
  if (!midtrans.enabled()) return fail(res, 503, 'Pembayaran Midtrans belum dikonfigurasi.');
  try {
    const snap = await midtrans.createSnapTransaction({
      orderId: o.invoice,
      grossAmount: o.total,
      customer: { name: req.session.user.name, email: req.session.user.email },
      items: JSON.parse(o.items_json),
    });
    ok(res, { snapToken: snap.token, snapRedirectUrl: snap.redirect_url });
  } catch (e) {
    console.error('[midtrans] snap error:', e.message);
    fail(res, 502, 'Gagal membuat pembayaran Midtrans: ' + e.message);
  }
});

// ---------- Midtrans HTTP notification (webhook) ----------
// Daftarkan URL ini di Midtrans Dashboard:
//   Sandbox: https://dashboard.sandbox.midtrans.com/settings/vtweb_configuration
//   Production: https://dashboard.midtrans.com/settings/vtweb_configuration
//   → Payment Notification URL: https://domain-anda/api/midtrans/notification
app.post('/api/midtrans/notification', async (req, res) => {
  const n = req.body || {};
  const { order_id, status_code, gross_amount, signature_key } = n;

  if (!midtrans.verifySignature({ orderId: order_id, statusCode: status_code, grossAmount: gross_amount, signatureKey: signature_key })) {
    console.warn('[midtrans] notifikasi signature tidak valid:', order_id);
    return fail(res, 403, 'Signature tidak valid.');
  }

  const o = db.prepare('SELECT * FROM orders WHERE invoice=?').get(order_id);
  if (!o) return fail(res, 404, 'Order tidak ditemukan.');
  if (o.payment !== 'midtrans') {
    console.warn('[midtrans] notifikasi untuk order non-midtrans diabaikan:', order_id);
    return ok(res, { received: true });
  }

  const next = midtrans.mapStatus(n);
  if (next && ['pending', 'menunggu_verifikasi'].includes(o.status)) {
    db.prepare('UPDATE orders SET status=?, note=?, updated_at=datetime(\'now\') WHERE id=?')
      .run(next, `Midtrans ${n.transaction_status} (${n.payment_type || '-'}, ${n.transaction_id || '-'})`, o.id);
    console.log(`[midtrans] ${order_id}: ${o.status} → ${next}`);
  }
  // Selalu balas 200 agar Midtrans tidak retry
  ok(res, { received: true });
});

// ---------- admin ----------
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status='selesai'").get().s;
  const orders = db.prepare('SELECT COUNT(*) c FROM orders').get().c;
  const products = db.prepare('SELECT COUNT(*) c FROM products').get().c;
  const users = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  ok(res, { stats: { revenue, orders, products, users } });
});

app.get('/api/admin/products', requireAdmin, (req, res) => {
  const products = db.prepare(`SELECT p.id,p.slug,p.name,p.emoji,p.image,p.price,p.discount_price,p.active,p.badge,
    c.name category, (SELECT COUNT(*) FROM variants v WHERE v.product_id=p.id) variants
    FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.id DESC`).all();
  ok(res, { products });
});

function upsertProduct(body, id) {
  const { slug, name, categorySlug, emoji, image, description, badge, fields, variants, active } = body || {};
  if (!name || !categorySlug) throw new Error('Nama dan kategori wajib diisi.');
  const cat = db.prepare('SELECT id FROM categories WHERE slug=?').get(categorySlug);
  if (!cat) throw new Error('Kategori tidak valid.');
  const slugVal = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  const fieldsJson = JSON.stringify(Array.isArray(fields) ? fields : []);
  const price = parseInt(body.price) || 0;
  const disc = body.discountPrice ? parseInt(body.discountPrice) : null;

  if (id) {
    db.prepare(`UPDATE products SET slug=?,name=?,category_id=?,emoji=?,image=?,description=?,badge=?,fields_json=?,price=?,discount_price=?,active=? WHERE id=?`)
      .run(slugVal, name, cat.id, emoji || '📦', String(image || '').slice(0, 300), description || '', badge || '', fieldsJson, price, disc, active ? 1 : 0, id);
  } else {
    const r = db.prepare(`INSERT INTO products (slug,name,category_id,emoji,image,description,badge,fields_json,price,discount_price,active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(slugVal, name, cat.id, emoji || '📦', String(image || '').slice(0, 300), description || '', badge || '', fieldsJson, price, disc, active === false ? 0 : 1);
    id = num(r.lastInsertRowid);
  }
  if (Array.isArray(variants)) {
    db.prepare('DELETE FROM variants WHERE product_id=?').run(id);
    const ins = db.prepare('INSERT INTO variants (product_id,name,price,discount_price,stock,sort) VALUES (?,?,?,?,?,?)');
    variants.forEach((v, i) => ins.run(id, v.name, parseInt(v.price) || 0,
      v.discountPrice ? parseInt(v.discountPrice) : null, v.stock == null ? -1 : parseInt(v.stock), i));
  }
  return id;
}

app.post('/api/admin/products', requireAdmin, (req, res) => {
  try { const id = upsertProduct(req.body); ok(res, { product: { id } }); }
  catch (e) { fail(res, 400, e.message); }
});
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  try { upsertProduct(req.body, req.params.id); ok(res, {}); }
  catch (e) { fail(res, 400, e.message); }
});
// Upload gambar produk (admin) — body: { filename, data: "data:image/png;base64,..." }
app.post('/api/admin/upload', requireAdmin, (req, res) => {
  try {
    const { filename = 'img', data } = req.body || {};
    const m = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(String(data || ''));
    if (!m) return fail(res, 400, 'Format gambar harus PNG/JPEG/WebP/GIF (base64).');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 2.5 * 1024 * 1024) return fail(res, 400, 'Ukuran gambar maksimal 2.5 MB.');
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    const safe = String(filename).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'produk';
    const dir = path.join(__dirname, 'public', 'img', 'uploads');
    fs.mkdirSync(dir, { recursive: true });
    const name = `${Date.now()}-${safe}.${ext}`;
    fs.writeFileSync(path.join(dir, name), buf);
    ok(res, { path: '/img/uploads/' + name });
  } catch (e) { fail(res, 500, 'Upload gagal: ' + e.message); }
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  ok(res, {});
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const { status = '' } = req.query;
  const where = status ? 'WHERE o.status=?' : '';
  const params = status ? [status] : [];
  const orders = db.prepare(`SELECT o.id,o.invoice,o.total,o.status,o.payment,o.created_at AS createdAt,u.name AS user,u.email
    FROM orders o JOIN users u ON u.id=o.user_id ${where} ORDER BY o.id DESC LIMIT 100`)
    .all(...params).map(o => ({ ...o, statusLabel: STATUS_LABEL[o.status] }));
  ok(res, { orders });
});

app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!STATUS_LABEL[status]) return fail(res, 400, 'Status tidak valid.');
  db.prepare('UPDATE orders SET status=?, updated_at=datetime(\'now\') WHERE id=?').run(status, req.params.id);
  ok(res, {});
});

// ---------- fallback ----------
app.use('/api', (req, res) => fail(res, 404, 'Endpoint tidak ditemukan.'));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[digipasar] jalan di http://localhost:${PORT}`);
    console.log(`[digipasar] admin: admin@digipasar.id / admin123`);
  });
}
module.exports = app;
