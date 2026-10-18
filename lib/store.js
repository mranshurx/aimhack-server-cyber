'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

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
  getKeys,
  setKey,
  removeKey,
  count
};
