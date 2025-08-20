const express = require('express');
const cors = require('cors');
const pdfRoutes = require('./pdfRoutes');
const imageRoutes = require('./imageRoutes');
const audioRoutes = require('./audioRoutes');
const booksRoutes = require('./booksRoutes');

const router = express.Router();

// Enable CORS preflight for all routes
router.options('*', cors());

// Mount feature routes
router.use('/', pdfRoutes);
router.use('/', imageRoutes);
router.use('/', audioRoutes);
router.use('/books', booksRoutes);

module.exports = router;
