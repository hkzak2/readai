const express = require('express');
const cors = require('cors');
const pdfRoutes = require('./pdfRoutes');
const imageRoutes = require('./imageRoutes');
const audioRoutes = require('./audioRoutes');

const router = express.Router();

// Enable CORS preflight for all routes
router.options('*', cors());

// Mount feature routes
router.use('/', pdfRoutes);
router.use('/', imageRoutes);
router.use('/', audioRoutes);

module.exports = router;
