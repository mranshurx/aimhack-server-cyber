'use strict';

const express = require('express');
const store = require('../lib/store');
const keys = require('../lib/key-utils');
const { requireAdmin, extractSecret, checkPassword } = require('../middleware/admin-auth');

const router = express.Router();

/* ------------------------------------------------------------------ *
 *  POST /api/admin/login
 * ------------------------------------------------------------------ */

router.post('/login', (req, res) => {
  const supplied = extractSecret(req);

  if (!checkPassword(supplied)) {
    return res.status(401).json({ success: false, error: 'Invalid password' });
  }

  return res.json({
    success: true,
    message: 'Authenticated',
    token: require('../config').ADMIN_PASSWORD
  });
});

/* ------------------------------------------------------------------ *
 *  POST /api/admin/create-key
 *  body: { key?, auth?, days?, hours?, minutes?, note?, extend? }
 * ------------------------------------------------------------------ */

router.post('/create-key', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};

    const days = keys.toInt(body.days, 0);
    const hours = keys.toInt(body.hours, 0);
    const minutes = keys.toInt(body.minutes, 0);
    const durationMs = keys.durationToMs(days, hours, minutes);

    if (durationMs <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Duration must be greater than zero (provide days, hours and/or minutes)'
      });
    }

    let keyName = String(body.key || body.name || '').trim();
    if (!keyName) keyName = keys.generateUniqueKey(store.getKeys());

    const existingName = keys.resolveStoredName(store.getKeys(), keyName);
    const extend = body.extend === true || body.extend === 'true';

    const base = extend && existingName && !keys.isExpired(store.getKeys()[existingName])
      ? store.getKeys()[existingName].expiresAt
      : keys.now();

    const expiresAt = base + durationMs;

    const record = {
      key: keyName,
      auth: String(body.auth || '').trim() || keyName,
      createdAt: existingName ? store.getKeys()[existingName].createdAt : keys.now(),
      expiresAt,
      duration: { days, hours, minutes }
    };

    if (typeof body.note === 'string' && body.note.trim()) {
      record.note = body.note.trim().slice(0, 200);
    }

    store.setKey(keyName, record);
    await store.save();

    return res.status(201).json({
      success: true,
      message: existingName ? 'Key updated' : 'Key created',
      key: keyName,
      auth: record.auth,
      expiresAt,
      expiresAtIso: new Date(expiresAt).toISOString(),
      expireUnix: Math.floor(expiresAt / 1000),
      durationMs,
      durationHuman: keys.humanDuration(durationMs)
    });
  } catch (err) {
    console.error('[admin/create-key]', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/* ------------------------------------------------------------------ *
 *  GET /api/admin/keys
 *  ?includeExpired=false to hide expired keys
 * ------------------------------------------------------------------ */

router.get('/keys', requireAdmin, (req, res) => {
  const includeExpired = req.query.includeExpired !== 'false';

  const list = Object.entries(store.getKeys())
    .map(([name, record]) => keys.publicKeyView(name, record))
    .filter((view) => includeExpired || view.status === 'active')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return res.json({
    success: true,
    count: list.length,
    active: list.filter((k) => k.status === 'active').length,
    expired: list.filter((k) => k.status === 'expired').length,
    serverTime: keys.now(),
    keys: list
  });
});

/* ------------------------------------------------------------------ *
 *  POST /api/admin/delete-key
 *  body: { key }
 * ------------------------------------------------------------------ */

router.post('/delete-key', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const keyName = String(body.key || body.name || req.query.key || '').trim();

  if (!keyName) {
    return res.status(400).json({ success: false, error: 'Missing "key"' });
  }

  const stored = keys.resolveStoredName(store.getKeys(), keyName);
  if (!stored) {
    return res.status(404).json({ success: false, error: 'Key not found', key: keyName });
  }

  store.removeKey(stored);
  await store.save();

  return res.json({ success: true, message: 'Key deleted', key: stored });
});

/* ------------------------------------------------------------------ *
 *  POST /api/admin/update-key
 *  body: { key, days?, hours?, minutes?, reset?, auth?, note? }
 * ------------------------------------------------------------------ */

router.post('/update-key', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const keyName = String(body.key || body.name || '').trim();

  if (!keyName) {
    return res.status(400).json({ success: false, error: 'Missing "key"' });
  }

  const stored = keys.resolveStoredName(store.getKeys(), keyName);
  if (!stored) {
    return res.status(404).json({ success: false, error: 'Key not found' });
  }

  const record = store.getKeys()[stored];

  if (body.auth !== undefined) {
    record.auth = String(body.auth).trim() || stored;
  }
  if (body.note !== undefined) {
    record.note = String(body.note).slice(0, 200);
  }

  const days = keys.toInt(body.days, 0);
  const hours = keys.toInt(body.hours, 0);
  const minutes = keys.toInt(body.minutes, 0);
  const deltaMs = keys.durationToMs(days, hours, minutes);

  if (deltaMs > 0) {
    const reset = body.reset === true || body.reset === 'true';
    const base = reset ? keys.now() : record.expiresAt;
    record.expiresAt = base + deltaMs;
    record.duration = { days, hours, minutes };
  }

  await store.save();

  return res.json({
    success: true,
    message: 'Key updated',
    ...keys.publicKeyView(stored, record)
  });
});

module.exports = router;
