'use strict';

/**
 * ============================================================================
 *  AIMHACK License / Subscription Server — entry point
 * ============================================================================
 *  Modular layout:
 *    config.js               constants
 *    lib/store.js            keys.json persistence
 *    lib/key-utils.js        key + expiry helpers
 *    lib/routing.js          routing tables
 *    lib/config-builder.js   Happ payload builder
 *    routes/*.routes.js      HTTP routes
 *    views/dashboard.html    admin UI   (served at /)
 *    views/portal.html       client UI  (served at /portal)
 * ============================================================================
 */

const express = require('express');
const config = require('./config');
const store = require('./lib/store');

const dashboardRoutes = require('./routes/dashboard.routes');
const adminRoutes = require('./routes/admin.routes');
const clientRoutes = require('./routes/client.routes');
const portalRoutes = require('./routes/portal.routes');

const app = express();

/* ------------------------------------------------------------------ *
 *  Core middleware
 * ------------------------------------------------------------------ */

app.disable('x-powered-by');
app.set('trust proxy', true);

app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// Permissive CORS so the client website can call the API from anywhere
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

/* ------------------------------------------------------------------ *
 *  Routes
 * ------------------------------------------------------------------ */

app.use('/api/admin', adminRoutes);   // admin API
app.use('/', dashboardRoutes);        // admin dashboard UI at  /
app.use('/api', clientRoutes);        // /api/verify, /api/get-config
app.use('/', portalRoutes);           // client portal at /portal + /api/portal/info

/* ------------------------------------------------------------------ *
 *  Fallbacks
 * ------------------------------------------------------------------ */

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found', path: req.path });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ success: false, error: 'Internal server error' });
});

/* ------------------------------------------------------------------ *
 *  Boot
 * ------------------------------------------------------------------ */

store.load();
store.seedFromEnv();   // optional: re-create keys on ephemeral hosts

const server = app.listen(config.PORT, config.HOST, () => {
  console.log('=========================================================');
  console.log('  AIMHACK license server');
  console.log(`  listening   : http://${config.HOST}:${config.PORT}`);
  console.log(`  public base : ${config.PUBLIC_BASE_URL || '(derived from Host header)'}`);
  console.log(`  admin panel : http://localhost:${config.PORT}/`);
  console.log(`  client portal: http://localhost:${config.PORT}/portal`);
  console.log(`  data dir    : ${config.DATA_DIR}`);
  console.log(`  keys file   : ${store.KEYS_FILE}`);
  console.log(`  keys loaded : ${store.count()}`);
  console.log(`  remote node : hysteria2://${config.HYSTERIA.address}:${config.HYSTERIA.port}`);
  console.log('=========================================================');
});

function shutdown(signal) {
  console.log(`\n[${signal}] shutting down...`);
  server.close(() => {
    store.flush().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));

module.exports = app;
