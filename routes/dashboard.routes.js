'use strict';

const path = require('path');
const express = require('express');
const store = require('../lib/store');

const router = express.Router();

/* GET /  — static admin dashboard */
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});

/* GET /api/health */
router.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    keys: store.count(),
    time: Date.now()
  });
});

module.exports = router;
