// lib/persist.js — persistensi DB demo di Netlify Blobs.
//
// Mode Lambda (Linux + NETLIFY=true): seluruh SQLite di-dump ke satu dokumen
// Blobs ('app-db'). Tiap request /api di-hydrate ulang (strong consistency),
// tiap metode tulis di-save sebelum respons keluar. Lokal: modul ini mati
// (on=false), server pakai file SQLite biasa seperti biasa.
const { IS_LAMBDA, dumpState, loadState } = require('../db');

const persist = { on: false, store: null };

if (IS_LAMBDA) {
  try {
    const { getStore } = require('@netlify/blobs');
    // Auto-detect gagal di runtime (tidak ada NETLIFY_SITE_ID/NETLIFY_AUTH_TOKEN) —
    // pakai env yang tersedia: SITE_ID + NETLIFY_FUNCTIONS_TOKEN.
    persist.store = getStore({
      name: 'digipasar-db',
      siteID: process.env.SITE_ID,
      token: process.env.BLOBS_TOKEN || process.env.NETLIFY_FUNCTIONS_TOKEN,
      consistency: 'strong',
    });
    persist.on = true;
    console.log('[persist] Netlify Blobs aktif (mode demo serverless).');
  } catch (e) {
    persist.error = String((e && e.message) || e);
    console.warn('[persist] Blobs tidak tersedia — jalan dengan seed lokal:', persist.error);
  }
}

const KEY = 'app-db';

// Ganti isi DB instance ini dengan snapshot terbaru (kalau ada).
// Snapshot belum ada = biarkan seed bawaan (seed identik di semua instance).
persist.hydrate = async () => {
  if (!persist.on) return false;
  let snap = null;
  try {
    snap = await persist.store.get(KEY, { type: 'json' });
  } catch (e) {
    const s = e && (e.status || e.statusCode);
    if (s && s !== 404) console.warn('[persist] hydrate:', e.message);
    return false; // 404 = belum pernah disimpan
  }
  if (!snap) return false;
  return loadState(snap) !== false;
};

// Simpan snapshot penuh. Dipanggil dari wrapper res.json sebelum respons
// dilepas, supaya fungsi tidak dibekukan Netlify di tengah tulisan.
persist.save = async () => {
  if (!persist.on) return false;
  await persist.store.setJSON(KEY, dumpState());
  return true;
};

module.exports = persist;
