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

function reloadTemplate() {
  cachedTemplate = null;
  return loadTemplate();
}

/* ------------------------------------------------------------------ *
 *  Config body
 * ------------------------------------------------------------------ */

function buildConfig(keyName, record) {
  const auth = (record && record.auth) || keyName;

  const raw = loadTemplate()
    .replace(/\{\{KEY\}\}/g, JSON.stringify(keyName))
    .replace(/\{\{AUTH\}\}/g, JSON.stringify(auth));

  return JSON.parse(raw);
}

/* ------------------------------------------------------------------ *
 *  Shared metadata headers
 * ------------------------------------------------------------------ */

function expireUnixOf(record) {
  const expiresAt = Number.isFinite(record && record.expiresAt)
    ? record.expiresAt
    : Date.now() + 24 * 60 * 60 * 1000;
  return Math.floor(expiresAt / 1000);
}

function commonHeaders(keyName, record) {
  const headers = {
    'Cache-Control': 'no-store',
    'Subscription-Userinfo':
      `upload=0; download=0; total=${config.TOTAL_BYTES}; expire=${expireUnixOf(record)}`,
    'Profile-Title': config.PROFILE_TITLE,
    'Profile-Update-Interval': String(config.UPDATE_INTERVAL)
  };

  if (config.PUBLIC_BASE_URL) {
    headers['Profile-Web-Page-Url'] =
      `${config.PUBLIC_BASE_URL.replace(/\/+$/, '')}/portal`;
  }

  return headers;
}

/* ------------------------------------------------------------------ *
 *  Format: json  (DEFAULT — what Happ auto-detects)
 *  application/json + pure JSON body + Subscription-Userinfo header
 * ------------------------------------------------------------------ */

function buildSubscriptionJson(keyName, record) {
  return {
    headers: {
      ...commonHeaders(keyName, record),
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${keyName}"`
    },
    body: JSON.stringify(buildConfig(keyName, record), null, 2)
  };
}

/* ------------------------------------------------------------------ *
 *  Format: text / comments  (v2ray / clash-meta style # headers + JSON)
 * ------------------------------------------------------------------ */

function buildSubscriptionText(keyName, record) {
  const lines = [
    `#profile-title: ${config.PROFILE_TITLE}`,
    `#subscription-userinfo: upload=0; download=0; total=${config.TOTAL_BYTES}; expire=${expireUnixOf(record)}`,
    `#profile-update-interval: ${config.UPDATE_INTERVAL}`
  ];

  if (config.PUBLIC_BASE_URL) {
    lines.push(`#profile-web-page-url: ${config.PUBLIC_BASE_URL.replace(/\/+$/, '')}/portal`);
  }

  return {
    headers: { ...commonHeaders(keyName, record), 'Content-Type': 'text/plain; charset=utf-8' },
    body: `${lines.join('\n')}\n\n${JSON.stringify(buildConfig(keyName, record), null, 2)}`
  };
}

/* ------------------------------------------------------------------ *
 *  Format: base64  (text/plain, base64 of the JSON body)
 * ------------------------------------------------------------------ */

function buildSubscriptionBase64(keyName, record) {
  const json = JSON.stringify(buildConfig(keyName, record));

  return {
    headers: { ...commonHeaders(keyName, record), 'Content-Type': 'text/plain; charset=utf-8' },
    body: Buffer.from(json, 'utf8').toString('base64')
  };
}

/* ------------------------------------------------------------------ *
 *  Dispatcher
 * ------------------------------------------------------------------ */

function buildSubscription(keyName, record, format) {
  switch (String(format || 'json').toLowerCase()) {
    case 'text':
    case 'comments':
      return buildSubscriptionText(keyName, record);
    case 'base64':
      return buildSubscriptionBase64(keyName, record);
    default:
      return buildSubscriptionJson(keyName, record);
  }
}

module.exports = {
  buildConfig,
  buildSubscription,
  buildSubscriptionJson,
  buildSubscriptionText,
  buildSubscriptionBase64,
  reloadTemplate,
  TEMPLATE_FILE
};
