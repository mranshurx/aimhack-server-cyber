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

/** Timing-safe comparison; hashing first hides the password length. */
function checkPassword(supplied) {
  const a = crypto.createHash('sha256').update(String(supplied)).digest();
  const b = crypto.createHash('sha256').update(String(config.ADMIN_PASSWORD)).digest();
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
