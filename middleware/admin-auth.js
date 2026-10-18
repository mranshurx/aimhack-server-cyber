'use strict';

const crypto = require('crypto');
const config = require('../config');

/** Pulls the admin credential out of header, body or query. */
function extractSecret(req) {
  return String(
    req.get('x-admin-password') ||
    (req.body && (req.body.password || req.body.adminPassword)) ||
    req.query.password ||
    ''
  );
}

/** Timing-safe comparison against the configured admin password. */
function checkPassword(supplied) {
  const a = Buffer.from(String(supplied));
  const b = Buffer.from(config.ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res, next) {
  const supplied = extractSecret(req);

  if (!supplied) {
    return res.status(401).json({ success: false, error: 'Missing admin password' });
  }
  if (!checkPassword(supplied)) {
    return res.status(403).json({ success: false, error: 'Invalid admin password' });
  }
  return next();
}

module.exports = { requireAdmin, extractSecret, checkPassword };
