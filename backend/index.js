const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// PDF proxy endpoint
app.get('/api/pdf-proxy', async (req, res) => {
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

    console.log(`Fetching PDF from: ${url}`);

    // Fetch the PDF from the external URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ReadAI-PDF-Proxy/1.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch PDF: ${response.statusText}` 
      });
    }

    // Get the content type
    const contentType = response.headers.get('content-type');
    
    // Verify it's a PDF
    if (!contentType || !contentType.includes('application/pdf')) {
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

  } catch (error) {
    console.error('Error in PDF proxy:', error);
    res.status(500).json({ 
      error: 'Internal server error while fetching PDF' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ReadAI Backend Server is running',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`ReadAI Backend Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`PDF Proxy: http://localhost:${PORT}/api/pdf-proxy?url=[PDF_URL]`);
});

module.exports = app;
