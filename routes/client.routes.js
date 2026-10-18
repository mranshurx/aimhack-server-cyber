'use strict';

const express = require('express');
const config = require('../config');
const store = require('../lib/store');
const keys = require('../lib/key-utils');
const { buildSubscription } = require('../lib/config-builder');

const router = express.Router();

/* ------------------------------------------------------------------ *
 *  POST /api/verify
 * ------------------------------------------------------------------ */

router.post('/verify', (req, res) => {
  const body = req.body || {};
  const keyName = String(body.key || body.license || req.query.key || '').trim();

  if (!keyName) {
    return res.status(400).json({ success: false, valid: false, error: 'Missing key' });
  }

  const record = keys.findKey(store.getKeys(), keyName);

  if (!record) {
    return res.status(404).json({ success: false, valid: false, error: 'Invalid key' });
  }

  if (keys.isExpired(record)) {
    return res.json({
      success: true,
      valid: false,
      status: 'expired',
      key: keyName,
      expiresAt: record.expiresAt,
      expireUnix: Math.floor(record.expiresAt / 1000),
      remainingMs: 0
    });
  }

  return res.json({
    success: true,
    valid: true,
    status: 'active',
    key: keyName,
    expiresAt: record.expiresAt,
    expiresAtIso: new Date(record.expiresAt).toISOString(),
    expireUnix: Math.floor(record.expiresAt / 1000),
    remainingMs: record.expiresAt - keys.now(),
    remainingHuman: keys.humanDuration(record.expiresAt - keys.now()),
    totalBytes: config.TOTAL_BYTES
  });
});

/* ------------------------------------------------------------------ *
 *  GET /api/verify?key=...
 * ------------------------------------------------------------------ */

router.get('/verify', (req, res) => {
  const keyName = String(req.query.key || '').trim();

  if (!keyName) {
    return res.status(400).json({ success: false, valid: false, error: 'Missing key' });
  }

  const record = keys.findKey(store.getKeys(), keyName);

  if (!record) {
    return res.status(404).json({ success: false, valid: false, error: 'Invalid key' });
  }

  const expired = keys.isExpired(record);

  return res.json({
    success: true,
    valid: !expired,
    status: expired ? 'expired' : 'active',
    key: keyName,
    expireUnix: Math.floor(record.expiresAt / 1000),
    remainingMs: expired ? 0 : record.expiresAt - keys.now()
  });
});

/* ------------------------------------------------------------------ *
 *  GET /api/get-config?key=KEY_NAME[&format=json|text|base64]
 *
 *  Default is application/json + pure JSON body, which is what Happ
 *  auto-detects. Metadata (title / expiry) travels in HTTP headers.
 * ------------------------------------------------------------------ */

router.get('/get-config', (req, res) => {
  const keyName = String(req.query.key || req.query.name || '').trim();

  const plainErr = (status, msg) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(status).send(msg);
  };

  if (!keyName) {
    return plainErr(400, '# ERROR: missing ?key= parameter');
  }

  const record = keys.findKey(store.getKeys(), keyName);

  if (!record) {
    return plainErr(
      404,
      `# ERROR: invalid key "${keyName}" (store has ${store.count()} key(s))`
    );
  }

  if (keys.isExpired(record)) {
    const strict = req.query.strict === '1' || req.query.strict === 'true';
    if (strict) {
      return plainErr(403, `# ERROR: key "${keyName}" expired`);
    }
    // Otherwise still serve so Happ renders the expired state from expire=
  }

  const { headers, body } = buildSubscription(keyName, record, req.query.format);

  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  return res.status(200).send(body);
});

module.exports = router;
