// lib/midtrans.js — integrasi Midtrans Snap API
// Docs: https://docs.midtrans.com
const crypto = require('crypto');

function cfg() {
  return {
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  };
}

function enabled() {
  return !!cfg().serverKey;
}

function apiBase() {
  return cfg().isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
}

function snapJsUrl() {
  return apiBase() + '/snap/snap.js';
}

function authHeader() {
  return 'Basic ' + Buffer.from(cfg().serverKey + ':').toString('base64');
}

/**
 * Buat transaksi Snap. Mengembalikan { token, redirect_url }.
 * @param {object} p - { orderId, grossAmount, customer:{name,email}, items:[{name,qty,price}] }
 */
async function createSnapTransaction(p) {
  const { serverKey } = cfg();
  if (!serverKey) throw new Error('Midtrans belum dikonfigurasi (MIDTRANS_SERVER_KEY kosong).');
  if (!p.orderId || !p.grossAmount || p.grossAmount < 1) throw new Error('Data transaksi tidak valid.');

  const body = {
    transaction_details: { order_id: String(p.orderId), gross_amount: Math.round(p.grossAmount) },
    customer_details: {
      first_name: String(p.customer?.name || 'Pelanggan').slice(0, 50),
      email: String(p.customer?.email || '').slice(0, 100) || undefined,
    },
    item_details: (p.items || []).slice(0, 20).map(it => ({
      id: String(it.variantId || it.name).slice(0, 50),
      name: String(it.name).slice(0, 50),
      quantity: Number(it.qty) || 1,
      price: Math.round(Number(it.price) || 0),
    })),
    // Batasi channel yang relevan untuk produk digital (opsional, bisa dihapus)
    // enabled_payments: ['qris','gopay','shopeepay','bca_va','bri_va','bni_va','mandiri_va','alfamart','indomaret'],
  };

  let res;
  try {
    res = await fetch(apiBase() + '/snap/v1/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': authHeader() },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    throw new Error(e.name === 'TimeoutError' ? 'Midtrans timeout (15 dtk).' : 'Tidak dapat menghubungi Midtrans: ' + e.message);
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok || !data || !data.token) {
    const msg = (data && (data.error_messages || []).join('; ')) || `Midtrans error HTTP ${res.status}`;
    throw new Error(msg);
  }
  return { token: data.token, redirect_url: data.redirect_url };
}

/**
 * Verifikasi signature_key dari HTTP notification Midtrans.
 * signature = SHA512(order_id + status_code + gross_amount + serverKey)
 */
function verifySignature({ orderId, statusCode, grossAmount, signatureKey }) {
  const { serverKey } = cfg();
  if (!serverKey || !orderId || !statusCode || grossAmount == null || !signatureKey) return false;
  const raw = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const hash = crypto.createHash('sha512').update(raw).digest('hex');
  // bandingkan dengan timing-safe
  const a = Buffer.from(hash), b = Buffer.from(String(signatureKey));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Petakan transaction_status Midtrans -> status order DigiPasar.
 * Mengembalikan status baru atau null jika tidak ada perubahan.
 */
function mapStatus(n) {
  const ts = n.transaction_status;
  const fraud = n.fraud_status;
  if (ts === 'capture') {
    // capture = kartu kredit; hanya anggap lunas jika fraud_status=accept
    return fraud === 'challenge' ? null : 'diproses';
  }
  if (ts === 'settlement') return 'diproses';
  if (ts === 'pending') return null;
  if (['deny', 'cancel', 'expire', 'failure'].includes(ts)) return 'dibatalkan';
  return null;
}

module.exports = { cfg, enabled, apiBase, snapJsUrl, createSnapTransaction, verifySignature, mapStatus };
