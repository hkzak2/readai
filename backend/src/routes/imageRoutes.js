const express = require('express');
const imageController = require('../controllers/imageController');

const router = express.Router();

// Image to text endpoint
router.post('/image-to-text', imageController.imageToText);

module.exports = router;
