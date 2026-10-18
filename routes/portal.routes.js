'use strict';

const path = require('path');
const express = require('express');
const config = require('../config');
const store = require('../lib/store');
const keys = require('../lib/key-utils');

const router = express.Router();

/** Absolute base URL for subscription links. */
function baseUrl(req) {
  if (config.PUBLIC_BASE_URL) return config.PUBLIC_BASE_URL.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

/* ------------------------------------------------------------------ *
 *  GET /portal — client-facing page
 * ------------------------------------------------------------------ */

router.get('/portal', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, '..', 'views', 'portal.html'));
});

/* ------------------------------------------------------------------ *
 *  GET /api/portal/info?key=...
 *  Public lookup used by the portal.
 * ------------------------------------------------------------------ */

router.get('/api/portal/info', (req, res) => {
  const keyName = String(req.query.key || '').trim();

  if (!keyName) {
    return res.status(400).json({ success: false, error: 'Missing key' });
  }

  const record = keys.findKey(store.getKeys(), keyName);

  if (!record) {
    return res.status(404).json({
      success: false,
      valid: false,
      error: 'Invalid key',
      storeKeys: store.count()
    });
  }

  const expired = keys.isExpired(record);
  const remaining = expired ? 0 : record.expiresAt - keys.now();

  // Use the resolved stored name so links work even when the user typed
  // the auth credential instead of the key name.
  const resolvedName = keys.resolveStoredName(store.getKeys(), keyName) || keyName;
  const subUrl = `${baseUrl(req)}/api/get-config?key=${encodeURIComponent(resolvedName)}`;

  return res.json({
    success: true,
    valid: !expired,
    status: expired ? 'expired' : 'active',
    key: resolvedName,
    expiresAt: record.expiresAt,
    expiresAtIso: new Date(record.expiresAt).toISOString(),
    expireUnix: Math.floor(record.expiresAt / 1000),
    remainingMs: remaining,
    remainingHuman: keys.humanDuration(remaining),
    totalBytes: config.TOTAL_BYTES,
    subscriptionUrl: subUrl,
    happDeeplink: `happ://add/${encodeURIComponent(subUrl)}`
  });
});

module.exports = router;
