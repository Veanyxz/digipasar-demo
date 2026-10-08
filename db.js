// db.js — SQLite bawaan Node (node:sqlite) + schema + seed data
const path = require('path');
const fs = require('fs');
// Wajib lewat VARIABEL (bukan concat inline): bundler esbuild Netlify melakukan
// constant-folding pada concat inline sehingga 'node:sqlite' literal ikut
// ter-rewrite jadi require('sqlite') yang gagal di runtime. Bentuk variabel
// terbukti lolos bundler pada function probe (/.netlify/functions/info).
const SQLITE_SPEC = 'node:' + 'sqlite';
const { DatabaseSync } = require(SQLITE_SPEC);
const bcrypt = require('bcryptjs');

// Mode demo (Netlify Functions): DB in-memory per instance, di-hydrate dari
// Netlify Blobs tiap request & di-persist tiap write. Lokal: file SQLite biasa.
// AWS_EXECUTION_ENV = penanda runtime Lambda Netlify (terbukti ter-set di probe;
// process.env.NETLIFY ternyata TIDAK di-set di dalam function)
const IS_LAMBDA = !!process.env.AWS_EXECUTION_ENV && process.platform === 'linux';

let inner;
if (IS_LAMBDA) {
  inner = new DatabaseSync(':memory:');
} else {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  inner = new DatabaseSync(path.join(dataDir, 'digipasar.db'));
  inner.exec('PRAGMA journal_mode = WAL');
}

// proxy: semua pemanggilan db.prepare/exec diteruskan ke koneksi aktif
// (bisa ditukar oleh loadState tanpa mengubah satupun route)
const db = new Proxy({}, {
  get: (_, prop) => {
    const v = inner[prop];
    return typeof v === 'function' ? v.bind(inner) : v;
  },
});

// helper: ubah BigInt lastInsertRowid jadi Number
const num = (v) => typeof v === 'bigint' ? Number(v) : v;

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📦',
      sort INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      emoji TEXT NOT NULL DEFAULT '📦',
      description TEXT NOT NULL DEFAULT '',
      badge TEXT DEFAULT '',
      fields_json TEXT NOT NULL DEFAULT '[]',
      image TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL DEFAULT 0,
      discount_price INTEGER,
      rating REAL NOT NULL DEFAULT 5.0,
      sold INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      discount_price INTEGER,
      stock INTEGER NOT NULL DEFAULT -1,
      sort INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      items_json TEXT NOT NULL,
      inputs_json TEXT NOT NULL DEFAULT '{}',
      subtotal INTEGER NOT NULL,
      fee INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      payment TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      icon TEXT NOT NULL DEFAULT '📣',
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notification_reads (
      user_id INTEGER NOT NULL REFERENCES users(id),
      notif_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, notif_id)
    );
  `);

  const catCount = db.prepare('SELECT COUNT(*) c FROM categories').get().c;
  if (catCount === 0) seed();

  // notifikasi contoh supaya fitur langsung terlihat (sekali saja)
  const nCount = db.prepare('SELECT COUNT(*) c FROM notifications').get().c;
  if (nCount === 0) {
    db.prepare("INSERT INTO notifications (user_id,icon,title,body) VALUES (NULL,'🎉','Selamat datang di DigiPasar!','Semua produk dikirim instan 24/7. Ikuti promo mingguan — diskon top up game & voucher streaming setiap akhir pekan.')").run();
    db.prepare("INSERT INTO notifications (user_id,icon,title,body) VALUES (NULL,'📢','Cara belanja cepat','Pilih produk → tambah ke keranjang → checkout → bayar. Pesanan muncul di notifikasi ini setiap kali status berubah.')").run();
  }

  // migrasi: kolom image (produk DB lama belum punya)
  const cols = db.prepare('PRAGMA table_info(products)').all().map(c => c.name);
  if (!cols.includes('image')) db.exec('ALTER TABLE products ADD COLUMN image TEXT NOT NULL DEFAULT \'\'');

  // migrasi: kolom updated_at di orders (dipakai notifikasi update transaksi)
  const ocols = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name);
  if (!ocols.includes('updated_at')) {
    db.exec('ALTER TABLE orders ADD COLUMN updated_at TEXT');
    db.exec('UPDATE orders SET updated_at = created_at WHERE updated_at IS NULL');
  }

  // backfill gambar seed dari manifest (hanya yang masih kosong — jangan timpa editan admin)
  try {
    const mf = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'img', 'products', '_manifest.json'), 'utf8'));
    const upd = db.prepare('UPDATE products SET image=? WHERE slug=? AND (image IS NULL OR image=\'\')');
    for (const [slug, img] of Object.entries(mf)) upd.run(img, slug);
  } catch (e) { console.log('[db] backfill gambar dilewati:', e.message); }
}

function seed() {
  console.log('[db] seeding...');
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const cats = [
    ['ai-produktivitas', 'AI & Produktivitas', '🤖', 1],
    ['akun-premium', 'Akun Premium', '👑', 2],
    ['topup-game', 'Item & Top Up Game', '🎮', 3],
    ['voucher', 'Voucher & Gift Card', '🎟️', 4],
    ['lisensi', 'Lisensi Software', '💻', 5],
    ['api-key', 'API Key Developer', '🔑', 6],
    ['jasa', 'Jasa', '🛠️', 7],
  ];
  const insCat = db.prepare('INSERT INTO categories (slug,name,icon,sort) VALUES (?,?,?,?)');
  const catId = {};
  for (const [slug, name, icon, sort] of cats) {
    const r = insCat.run(slug, name, icon, sort);
    catId[slug] = num(r.lastInsertRowid);
  }

  const insProd = db.prepare(`INSERT INTO products
    (slug,name,category_id,emoji,description,badge,fields_json,price,discount_price,rating,sold,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insVar = db.prepare(`INSERT INTO variants (product_id,name,price,discount_price,stock,sort)
    VALUES (?,?,?,?,?,?)`);

  const F = {
    mlbb: JSON.stringify([
      { key: 'user_id', label: 'User ID', placeholder: 'Contoh: 12345678', required: true },
      { key: 'zone_id', label: 'Zone ID', placeholder: 'Contoh: 1234', required: true },
    ]),
    uid: JSON.stringify([{ key: 'user_id', label: 'User ID', placeholder: 'Masukkan User ID game', required: true }]),
    riot: JSON.stringify([{ key: 'riot_id', label: 'Riot ID', placeholder: 'Contoh: Pemain#1234', required: true }]),
    genshin: JSON.stringify([
      { key: 'uid', label: 'UID', placeholder: 'Contoh: 812345678', required: true },
      { key: 'server', label: 'Server', placeholder: 'Asia / America / Europe', required: true },
    ]),
    username: JSON.stringify([{ key: 'username', label: 'Username', placeholder: 'Masukkan username', required: true }]),
    email: JSON.stringify([{ key: 'email', label: 'Email pengiriman', placeholder: 'email@contoh.com', required: true }]),
    wa: JSON.stringify([{ key: 'whatsapp', label: 'No. WhatsApp', placeholder: '08xxxxxxxxxx', required: true }]),
    none: JSON.stringify([]),
  };

  // [slug, name, cat, emoji, desc, badge, fields, price, discPrice, rating, sold, variants[[name,price,disc,stock]]]
  const products = [
    ['diamond-mlbb-86', 'Diamond Mobile Legends', 'topup-game', '💎',
      'Top up Diamond Mobile Legends: Bang Bang resmi, proses instan 24 jam. Masukkan User ID dan Zone ID dengan benar — diamond dikirim langsung ke akun.',
      'TERLARIS', F.mlbb, 19000, 17500, 4.9, 15230,
      [['86 Diamond', 20000, 18500, -1], ['172 Diamond', 40000, 37000, -1], ['344 Diamond', 79000, 73000, -1], ['514 Diamond', 118000, 109000, -1], ['Twilight Pass', 129000, 119000, -1]]],
    ['diamond-ff', 'Diamond Free Fire', 'topup-game', '🔥',
      'Diamond Free Fire pengiriman instan via User ID. Legal 100%, garansi diamond masuk atau refund.',
      'TERLARIS', F.uid, 12000, 10500, 4.9, 12840,
      [['50 Diamond', 12000, 10500, -1], ['140 Diamond', 28000, 25000, -1], ['355 Diamond', 69000, 62000, -1], ['720 Diamond', 138000, 124000, -1], ['Membership Mingguan', 29000, 26000, -1]]],
    ['valorant-points', 'Valorant Points (VP)', 'topup-game', '🎯',
      'Valorant Points region Indonesia. Pastikan Riot ID benar sebelum checkout.',
      '', F.riot, 55000, 52000, 4.8, 6320,
      [['375 VP', 60000, 57000, -1], ['730 VP', 115000, 109000, -1], ['4750 VP', 690000, 655000, -1]]],
    ['genesis-crystal', 'Genesis Crystal Genshin Impact', 'topup-game', '✨',
      'Genesis Crystal untuk top up Welkin & Battle Pass. Pilih server sesuai akunmu.',
      '', F.genshin, 75000, 70000, 4.8, 4110,
      [['328 Genesis Crystal', 79000, 74000, -1], ['1090 Genesis Crystal', 249000, 235000, -1], ['Blessing of the Welkin Moon', 75000, 70000, -1]]],
    ['robux', 'Robux Roblox', 'topup-game', '🟥',
      'Robux via Game Pass — aman tanpa login akun. Masukkan username Roblox yang benar.',
      'PROMO', F.username, 16000, 14500, 4.7, 8930,
      [['80 Robux', 17000, 15500, -1], ['400 Robux', 79000, 72000, -1], ['800 Robux', 155000, 142000, -1]]],
    ['weekly-diamond-pass', 'Weekly Diamond Pass MLBB', 'topup-game', '🎫',
      'Berlangganan diamond harian MLBB selama 7 hari. Total 140+ diamond.',
      '', F.mlbb, 28000, 26000, 4.9, 3210,
      [['Weekly Diamond Pass', 30000, 27500, -1]]],

    ['netflix-premium', 'Netflix Premium 1 Bulan', 'akun-premium', '🎬',
      'Akun Netflix Premium 4K UHD. Profil private, garansi full 30 hari, ganti akun jika bermasalah.',
      'TERLARIS', F.email, 35000, 29000, 4.8, 9870,
      [['1 Profil • 1 User', 35000, 29000, 25], ['1 Profil • 2 User', 55000, 45000, 18], ['Sharing 1 Bulan', 22000, 18000, 40]]],
    ['spotify-premium', 'Spotify Premium 1 Bulan', 'akun-premium', '🎵',
      'Upgrade Spotify ke Premium via invite family plan. Legal, tanpa VPN.',
      '', F.email, 25000, 20000, 4.9, 7640,
      [['Individual 1 Bulan', 25000, 20000, 60], ['3 Bulan', 65000, 55000, 30]]],
    ['youtube-premium', 'YouTube Premium 1 Bulan', 'akun-premium', '▶️',
      'YouTube Premium bebas iklan + YouTube Music. Aktivasi via invite.',
      '', F.email, 20000, 16000, 4.8, 5420,
      [['Individual 1 Bulan', 20000, 16000, 50], ['Family Slot 1 Bulan', 12000, 9500, 80]]],
    ['canva-pro', 'Canva Pro 1 Bulan', 'akun-premium', '🎨',
      'Canva Pro full fitur: background remover, brand kit, 100GB penyimpanan.',
      'PROMO', F.email, 15000, 10000, 4.9, 11230,
      [['1 Bulan', 15000, 10000, 100], ['3 Bulan', 35000, 27000, 60]]],
    ['capcut-pro', 'CapCut Pro 7 Hari', 'akun-premium', '🎞️',
      'CapCut Pro individual 7 hari. Cocok untuk project video jangka pendek.',
      '', F.email, 8000, 6000, 4.7, 3890,
      [['7 Hari Individual', 8000, 6000, 70], ['30 Hari Individual', 25000, 20000, 45]]],

    ['chatgpt-plus', 'ChatGPT Plus 1 Bulan', 'ai-produktivitas', '🧠',
      'Upgrade ChatGPT Plus: GPT-4o, DALL-E, analisis data, dan prioritas saat trafik tinggi.',
      'TERLARIS', F.email, 300000, 95000, 4.8, 4560,
      [['1 Bulan (Sharing)', 120000, 95000, 30], ['1 Bulan (Private)', 320000, 299000, 12]]],
    ['gemini-advanced', 'Gemini Advanced 1 Bulan', 'ai-produktivitas', '♊',
      'Gemini Advanced dengan model paling canggih Google + 2TB Google One.',
      '', F.email, 120000, 45000, 4.7, 2340,
      [['1 Bulan', 120000, 45000, 25]]],
    ['ai-api-bundle', 'Paket API Key AI Developer', 'ai-produktivitas', '⚡',
      'Kredit API untuk berbagai model AI dalam satu key. Cocok untuk developer & automation.',
      '', F.wa, 50000, 35000, 4.6, 1890,
      [['50K Kredit', 50000, 35000, -1], ['200K Kredit', 150000, 120000, -1], ['1Jt Kredit', 500000, 420000, -1]]],

    ['gplay-idr', 'Google Play IDR', 'voucher', '🛒',
      'Voucher Google Play region Indonesia. Kode dikirim instan setelah pembayaran terverifikasi.',
      '', F.wa, 22000, 20000, 4.9, 6780,
      [['IDR 20.000', 23000, 21000, -1], ['IDR 50.000', 54000, 51000, -1], ['IDR 100.000', 106000, 102000, -1]]],
    ['steam-wallet', 'Steam Wallet IDR', 'voucher', '🎮',
      'Steam Wallet Code IDR langsung dari distributor resmi.',
      '', F.wa, 65000, 62000, 4.9, 5230,
      [['IDR 60.000', 68000, 65000, -1], ['IDR 120.000', 132000, 127000, -1], ['IDR 400.000', 430000, 418000, -1]]],
    ['psn-id', 'PlayStation Network IDR', 'voucher', '🕹️',
      'Voucher PSN region Indonesia untuk PS Store.',
      '', F.wa, 110000, 105000, 4.8, 1980,
      [['IDR 100.000', 115000, 110000, -1], ['IDR 400.000', 445000, 430000, -1]]],

    ['windows-11-pro', 'Windows 11 Pro OEM', 'lisensi', '🪟',
      'Lisensi Windows 11 Pro OEM original, aktivasi online permanen, 1 PC.',
      '', F.email, 150000, 85000, 4.8, 3120,
      [['OEM 1 PC', 150000, 85000, 200]]],
    ['office-2021', 'Microsoft Office 2021 Pro', 'lisensi', '📊',
      'Office 2021 Professional Plus lifetime, 1 PC. Termasuk Word, Excel, PowerPoint.',
      '', F.email, 250000, 120000, 4.8, 2760,
      [['Lifetime 1 PC', 250000, 120000, 150]]],

    ['dev-api-key', 'API Key Developer Plan', 'api-key', '🔑',
      'API key dengan rate limit tinggi untuk integrasi aplikasi. Dokumentasi lengkap tersedia.',
      '', F.wa, 99000, 75000, 4.7, 1540,
      [['Starter 100K req/bln', 99000, 75000, -1], ['Pro 1Jt req/bln', 499000, 399000, -1]]],

    ['joki-mlbb', 'Jasa Joki Rank MLBB', 'jasa', '🏆',
      'Joki rank oleh pro player (ex-immortal). Proses aman dengan VPN + mode offline.',
      '', F.username, 5000, 4000, 4.9, 2210,
      [['Per Bintang (Epic ke bawah)', 5000, 4000, -1], ['Per Bintang (Legend)', 8000, 6500, -1], ['Per Bintang (Mythic)', 15000, 12000, -1]]],
    ['jasa-logo', 'Jasa Desain Logo Premium', 'jasa', '✏️',
      'Desain logo profesional: 3 konsep, revisi unlimited, file AI/PNG/SVG.',
      '', F.wa, 150000, 99000, 4.9, 1870,
      [['Paket Basic', 150000, 99000, -1], ['Paket Business', 350000, 275000, -1]]],
  ];

  for (const [slug, name, cat, emoji, desc, badge, fields, price, disc, rating, sold, variants] of products) {
    const r = insProd.run(slug, name, catId[cat], emoji, desc, badge, fields, price, disc, rating, sold, now);
    const pid = num(r.lastInsertRowid);
    variants.forEach(([vname, vprice, vdisc, stock], i) => insVar.run(pid, vname, vprice, vdisc, stock, i));
  }

  // admin default: admin@digipasar.id / admin123
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'admin')`)
    .run('Administrator', 'admin@digipasar.id', hash);

  console.log('[db] seed selesai:', products.length, 'produk,', cats.length, 'kategori');
}

function reset() {
  for (const t of ['notification_reads', 'notifications', 'orders', 'variants', 'products', 'categories', 'users']) {
    try { db.exec(`DROP TABLE IF EXISTS ${t}`); } catch {}
  }
  init();
}

init();


/* ---------- snapshot untuk Netlify Blobs (mode demo) ---------- */
function dumpState() {
  const tables = inner.prepare(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid"
  ).all();
  const out = { v: 1, schema: [], tables: {} };
  for (const t of tables) {
    out.schema.push({ name: t.name, sql: t.sql });
    const rows = inner.prepare(`SELECT * FROM "${t.name}"`).all();
    out.tables[t.name] = rows.map(row => {
      const o = {};
      for (const k in row) o[k] = typeof row[k] === 'bigint' ? Number(row[k]) : row[k];
      return o;
    });
  }
  return out;
}

function loadState(snap) {
  if (!snap || snap.v !== 1 || !Array.isArray(snap.schema)) return false;
  const fresh = new DatabaseSync(':memory:');
  for (const t of snap.schema) fresh.exec(t.sql);
  for (const t of snap.schema) {
    const cols = fresh.prepare(`PRAGMA table_info("${t.name}")`).all().map(c => c.name);
    for (const row of (snap.tables[t.name] || [])) {
      const use = cols.filter(c => c in row);
      if (!use.length) continue;
      fresh.prepare(
        `INSERT INTO "${t.name}" (${use.map(c => '"' + c + '"').join(',')}) VALUES (${use.map(() => '?').join(',')})`
      ).run(...use.map(c => row[c]));
    }
  }
  const old = inner;
  inner = fresh;
  try { old.close(); } catch (e) { /* abaikan */ }
  return true;
}

module.exports = { db, reset, IS_LAMBDA, dumpState, loadState };
