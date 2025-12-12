const geminiService = require('../services/geminiService');
const { convertToWav } = require('../utils/audioUtils');
const logger = require('../utils/logger');

/**
 * Audio processing controller
 */
const audioController = {
  /**
   * Convert text to audio
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async textToAudio(req, res, next) {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      // Limit text length to avoid overloading the API
      const maxTextLength = 1000;
      const truncatedText = text.length > maxTextLength ? 
        text.substring(0, maxTextLength) + "..." : 
        text;
      
      logger.info(`Processing text-to-audio request, text length: ${text.length} chars (${truncatedText.length} after truncation if needed)`);
      
      // Generate audio with Gemini
      const { data, mimeType } = await geminiService.generateAudio(truncatedText);
      
      if (!data) {
        throw new Error('No audio data received from service');
      }
      
      logger.debug('Audio data received, length:', data.length);
      
      // Convert to WAV format
      const wavBuffer = convertToWav(data, mimeType);
      
      // Set headers for audio file
      res.set({
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'inline',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      });
      
      // Send the complete WAV file
      res.end(wavBuffer);
      logger.debug('Audio successfully sent to client');
      
    } catch (error) {
      logger.error('Error in text-to-audio processing:', error);
      
      let statusCode = 500;
      let errorMessage = 'Internal server error while generating audio';
      
      // Handle specific error types
      if (error.message && error.message.includes('429')) {
        statusCode = 429;
        errorMessage = 'API rate limit exceeded. Please try again later.';
      }
      
      res.status(statusCode).json({ 
        error: errorMessage,
        details: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      });
    }
  }
};

module.exports = audioController;
