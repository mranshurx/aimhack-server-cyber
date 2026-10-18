'use strict';

const crypto = require('crypto');
const config = require('../config');

/* ------------------------------------------------------------------ *
 *  Time
 * ------------------------------------------------------------------ */

function now() {
  return Date.now();
}

function isExpired(record) {
  return !record || typeof record.expiresAt !== 'number' || record.expiresAt <= now();
}

function durationToMs(days, hours, minutes) {
  return ((days * 24 + hours) * 60 + minutes) * 60 * 1000;
}

function humanDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(totalMinutes / 1440);
  const h = Math.floor((totalMinutes % 1440) / 60);
  const m = totalMinutes % 60;
  return `${d}d ${h}h ${m}m`;
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

/* ------------------------------------------------------------------ *
 *  Key generation
 * ------------------------------------------------------------------ */

/** e.g. AMHK-1F4C-9A02-BE73 */
function generateKey() {
  const block = () =>
    crypto.randomBytes(config.KEY_BLOCK_BYTES).toString('hex').toUpperCase();

  const blocks = [];
  for (let i = 0; i < config.KEY_BLOCKS; i++) blocks.push(block());
  return `${config.KEY_PREFIX}-${blocks.join('-')}`;
}

/** Guarantees a key that is not already present in the supplied map. */
function generateUniqueKey(existingKeys) {
  let candidate;
  let guard = 0;
  do {
    candidate = generateKey();
    guard++;
  } while (existingKeys[candidate] && guard < 1000);
  return candidate;
}

/* ------------------------------------------------------------------ *
 *  Lookup (exact match, then case-insensitive fallback)
 * ------------------------------------------------------------------ */

function resolveStoredName(keys, name) {
  if (!name || typeof name !== 'string') return null;
  const clean = name.trim();
  if (!clean) return null;
  if (keys[clean]) return clean;

  const lower = clean.toLowerCase();
  return Object.keys(keys).find((k) => k.toLowerCase() === lower) || null;
}

function findKey(keys, name) {
  const stored = resolveStoredName(keys, name);
  return stored ? keys[stored] : null;
}

/* ------------------------------------------------------------------ *
 *  Views
 * ------------------------------------------------------------------ */

function publicKeyView(name, record) {
  const expired = isExpired(record);
  const remaining = expired ? 0 : record.expiresAt - now();

  return {
    key: name,
    auth: record.auth || name,
    createdAt: record.createdAt || null,
    createdAtIso: record.createdAt ? new Date(record.createdAt).toISOString() : null,
    expiresAt: record.expiresAt || null,
    expiresAtIso: record.expiresAt ? new Date(record.expiresAt).toISOString() : null,
    expireUnix: record.expiresAt ? Math.floor(record.expiresAt / 1000) : null,
    duration: record.duration || null,
    note: record.note || null,
    status: expired ? 'expired' : 'active',
    remainingMs: remaining,
    remainingHuman: humanDuration(remaining)
  };
}

module.exports = {
  now,
  isExpired,
  durationToMs,
  humanDuration,
  toInt,
  generateKey,
  generateUniqueKey,
  resolveStoredName,
  findKey,
  publicKeyView
};
