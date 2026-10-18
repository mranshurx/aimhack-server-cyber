'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const keys = require('./key-utils');

const KEYS_FILE = path.join(config.DATA_DIR, config.KEYS_FILE);

/* ------------------------------------------------------------------ *
 *  In-memory shape
 * ------------------------------------------------------------------ */

let store = {
  version: 1,
  updatedAt: Date.now(),
  keys: {} // KEY_NAME -> { key, auth, createdAt, expiresAt, duration, note }
};

let writeQueue = Promise.resolve();

/* ------------------------------------------------------------------ *
 *  Disk I/O
 * ------------------------------------------------------------------ */

function ensureDataDir() {
  if (!fs.existsSync(config.DATA_DIR)) {
    fs.mkdirSync(config.DATA_DIR, { recursive: true });
    console.log(`[store] created data directory ${config.DATA_DIR}`);
  }
}

function load() {
  ensureDataDir();

  if (!fs.existsSync(KEYS_FILE)) {
    console.log(`[store] ${KEYS_FILE} not found — creating a fresh store`);
    save();
    return store;
  }

  try {
    const raw = fs.readFileSync(KEYS_FILE, 'utf8');
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === 'object') {
      if (parsed.keys && typeof parsed.keys === 'object') {
        store.keys = parsed.keys;
      } else {
        // tolerate a bare { KEY: {...} } map
        store.keys = parsed;
      }
      if (typeof parsed.version === 'number') store.version = parsed.version;
    }

    console.log(`[store] loaded ${Object.keys(store.keys).length} key(s) from ${KEYS_FILE}`);
  } catch (err) {
    console.error('[store] failed to parse keys file:', err.message);
    try {
      fs.copyFileSync(KEYS_FILE, `${KEYS_FILE}.corrupt.${Date.now()}.bak`);
    } catch (_) { /* ignore */ }
    store.keys = {};
    save();
  }

  return store;
}

/** Serialised, atomic write: temp file -> rename. */
function save() {
  writeQueue = writeQueue
    .then(async () => {
      ensureDataDir();
      store.updatedAt = Date.now();
      const tmp = `${KEYS_FILE}.tmp`;
      await fs.promises.writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
      await fs.promises.rename(tmp, KEYS_FILE);
    })
    .catch((err) => console.error('[store] save failed:', err.message));

  return writeQueue;
}

/** Resolves once every queued write has hit disk. */
function flush() {
  return writeQueue;
}

/* ------------------------------------------------------------------ *
 *  Optional env seeding
 *
 *  SEED_KEYS="Aimhack-98BD:30:AMHK-F92A-20BB-98BD,OtherKey:7"
 *  Format per entry: NAME:DAYS[:AUTH]  (AUTH defaults to NAME, DAYS defaults to 30)
 *
 *  Runs on boot and only creates keys that are missing, so it is safe to
 *  leave enabled on hosts with an ephemeral filesystem.
 * ------------------------------------------------------------------ */

function seedFromEnv() {
  const raw = process.env.SEED_KEYS;
  if (!raw) return 0;

  let created = 0;

  raw.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const parts = entry.split(':');
      const name = (parts[0] || '').trim();
      if (!name) return;

      if (keys.resolveStoredName(store.keys, name)) return;

      const days = Number(parts[1]);
      const auth = (parts[2] || '').trim() || name;
      const durationMs = (Number.isFinite(days) && days > 0 ? days : 30) * 86400000;
      const createdAt = Date.now();

      store.keys[name] = {
        key: name,
        auth,
        createdAt,
        expiresAt: createdAt + durationMs,
        duration: { days: Math.floor(durationMs / 86400000), hours: 0, minutes: 0 },
        note: 'seeded from env'
      };
      created++;
    });

  if (created) {
    console.log(`[store] seeded ${created} key(s) from SEED_KEYS`);
    save();
  }

  return created;
}

/* ------------------------------------------------------------------ *
 *  Accessors
 * ------------------------------------------------------------------ */

function getKeys() {
  return store.keys;
}

function setKey(name, record) {
  store.keys[name] = record;
}

function removeKey(name) {
  delete store.keys[name];
}

function count() {
  return Object.keys(store.keys).length;
}

module.exports = {
  KEYS_FILE,
  load,
  save,
  flush,
  seedFromEnv,
  getKeys,
  setKey,
  removeKey,
  count
};
