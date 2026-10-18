'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

const TEMPLATE_FILE = path.join(__dirname, '..', 'config.template.json');

let cachedTemplate = null;

/* ------------------------------------------------------------------ *
 *  Template loading
 * ------------------------------------------------------------------ */

function loadTemplate() {
  if (cachedTemplate !== null) return cachedTemplate;

  if (!fs.existsSync(TEMPLATE_FILE)) {
    throw new Error(`Missing config template: ${TEMPLATE_FILE}`);
  }

  cachedTemplate = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  console.log(`[config] loaded template ${TEMPLATE_FILE}`);
  return cachedTemplate;
}

/** Force a re-read on next build (useful if you edit the template live). */
function reloadTemplate() {
  cachedTemplate = null;
  return loadTemplate();
}

/* ------------------------------------------------------------------ *
 *  Config body
 * ------------------------------------------------------------------ */

function buildConfig(keyName, record) {
  // Per-key auth override wins; otherwise the key name is the credential.
  const auth = (record && record.auth) || keyName;

  const raw = loadTemplate()
    .replace(/\{\{KEY\}\}/g, JSON.stringify(keyName))
    .replace(/\{\{AUTH\}\}/g, JSON.stringify(auth));

  return JSON.parse(raw);
}

/* ------------------------------------------------------------------ *
 *  Full Happ subscription payload
 * ------------------------------------------------------------------ */

function buildSubscription(keyName, record) {
  const expireUnix = Math.floor(record.expiresAt / 1000);
  const body = JSON.stringify(buildConfig(keyName, record), null, 2);

  const header = [
    `#profile-title: ${config.PROFILE_TITLE}`,
    `#subscription-userinfo: upload=0; download=0; total=${config.TOTAL_BYTES}; expire=${expireUnix}`,
    `#profile-update-interval: ${config.UPDATE_INTERVAL}`,
    ''
  ].join('\n');

  return `${header}\n${body}`;
}

module.exports = {
  buildConfig,
  buildSubscription,
  reloadTemplate,
  TEMPLATE_FILE
};
