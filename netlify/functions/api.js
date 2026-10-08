// Satu function untuk semua rute: /api/* dan /img/uploads/* (lihat netlify.toml).
// Express dijalankan apa adanya lewat serverless-http — kontrak respons identik
// dengan versi lokal, jadi front-end tidak perlu diubah sama sekali.
const serverless = require('serverless-http');
const app = require('../../server');

module.exports.handler = serverless(app);
