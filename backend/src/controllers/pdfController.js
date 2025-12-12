const fetch = require('node-fetch');
const logger = require('../utils/logger');

/**
 * PDF Proxy controller for fetching PDFs from external sources
 */
const pdfController = {
  /**
   * Fetch and proxy a PDF from an external URL
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async proxyPdf(req, res, next) {
    try {
      const { url } = req.query;
      
      if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      logger.info(`Proxying PDF from URL: ${url}`);

      // Fetch the PDF from the external URL
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ReadAI-PDF-Proxy/1.0'
        }
      });

      if (!response.ok) {
        logger.warn(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ 
          error: `Failed to fetch PDF: ${response.statusText}` 
        });
      }

      // Get the content type
      const contentType = response.headers.get('content-type');
      
      // Verify it's a PDF
      if (!contentType || !contentType.includes('application/pdf')) {
        logger.warn(`URL does not point to a PDF file: ${contentType}`);
        return res.status(400).json({ 
          error: 'URL does not point to a PDF file' 
        });
      }

      // Set appropriate headers
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
      });

      // Stream the PDF content
      response.body.pipe(res);
      logger.debug('PDF successfully streamed to client');

    } catch (error) {
      logger.error('Error in PDF proxy:', error);
      next(error);
    }
  }
};

module.exports = pdfController;
