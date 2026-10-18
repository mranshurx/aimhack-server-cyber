'use strict';

const path = require('path');

module.exports = {
  /* ---------- server ---------- */
  HOST: process.env.HOST || '0.0.0.0',
  PORT: process.env.PORT || 10000,

  /* ---------- auth ---------- */
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AimhackAdmin2026',

  /* ---------- storage ---------- */
  DATA_DIR: process.env.DATA_DIR || path.join(__dirname, 'data'),
  KEYS_FILE: 'keys.json',

  /* ---------- subscription metadata ---------- */
  PROFILE_TITLE: 'AIMHACK',
  UPDATE_INTERVAL: 1,            // hours — Happ re-pull interval
  TOTAL_BYTES: 74109405568,      // 69.0 GB as displayed by Happ

  /* ---------- key generation ---------- */
  KEY_PREFIX: 'AMHK',
  KEY_BLOCKS: 3,
  KEY_BLOCK_BYTES: 2,            // 2 bytes = 4 hex chars per block

  /* ---------- remote hysteria node ---------- */
  HYSTERIA: {
    address: 'wraith-bom2.aimhack.shop',
    port: 443,
    serverName: 'wraith-bom2.aimhack.shop',
    alpn: ['h3'],
    version: 2
  }
};
