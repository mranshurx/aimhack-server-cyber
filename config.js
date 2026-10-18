'use strict';

const path = require('path');

module.exports = {
  /* ---------- server ---------- */
  HOST: process.env.HOST || '0.0.0.0',
  PORT: process.env.PORT || 10000,

  /* ---------- public URL ---------- *
   * Absolute base URL used to build subscription links.
   * SET THIS IN PRODUCTION, e.g. https://aimhack-server.onrender.com
   * If empty, links fall back to the request Host header.
   */
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || '',

  /* ---------- auth ---------- */
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AimhackAdmin2026',

  /* ---------- storage ---------- *
   * Point DATA_DIR at a PERSISTENT disk in production, e.g. /var/data
   * Otherwise keys.json is wiped on every deploy / restart.
   */
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
