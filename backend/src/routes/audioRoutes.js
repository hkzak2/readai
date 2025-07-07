const express = require('express');
const audioController = require('../controllers/audioController');

const router = express.Router();

// Text to audio endpoint
router.post('/text-to-audio', audioController.textToAudio);

module.exports = router;
