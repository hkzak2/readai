const express = require('express');
const pdfController = require('../controllers/pdfController');

const router = express.Router();

// PDF proxy endpoint
router.get('/pdf-proxy', pdfController.proxyPdf);

module.exports = router;
