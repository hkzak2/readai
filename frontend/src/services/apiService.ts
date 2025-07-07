/**
 * API service for interacting with the backend
 */

// Base API URL - can be configured based on environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Service for interacting with the ReadAI backend
 */
const apiService = {
  /**
   * Convert an image to text using AI
   * @param {string} imageBase64 - Base64 encoded image data
   * @returns {Promise<Object>} - Extracted text in JSON format
   */
  async imageToText(imageBase64) {
    try {
      const response = await fetch(`${API_BASE_URL}/image-to-text`, {
        method: 'POST',
        mode: 'cors',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ image: imageBase64 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract text from image");
      }

      return await response.json();
    } catch (error) {
      console.error('Error in image-to-text API call:', error);
      throw error;
    }
  },

  /**
   * Convert text to audio using AI
   * @param {string} text - Text to convert to audio
   * @returns {Promise<Blob>} - Audio blob
   */
  async textToAudio(text) {
    try {
      const response = await fetch(`${API_BASE_URL}/text-to-audio`, {
        method: 'POST',
        mode: 'cors',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'audio/wav'
        },
        body: JSON.stringify({ text }),
      });

      if (response.status === 429) {
        throw new Error("RATE_LIMIT_EXCEEDED");
      }

      if (!response.ok) {
        throw new Error(`Failed to generate audio: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error in text-to-audio API call:', error);
      throw error;
    }
  },

  /**
   * Proxy a PDF from an external URL
   * @param {string} url - URL of the PDF to proxy
   * @returns {Promise<Blob>} - PDF blob
   */
  async proxyPdf(url) {
    try {
      const response = await fetch(`${API_BASE_URL}/pdf-proxy?url=${encodeURIComponent(url)}`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to proxy PDF");
      }

      return await response.blob();
    } catch (error) {
      console.error('Error in PDF proxy API call:', error);
      throw error;
    }
  },

  /**
   * Check if the backend is available
   * @returns {Promise<boolean>} - True if backend is available
   */
  async checkHealth() {
    try {
      const baseUrl = API_BASE_URL.replace('/api', '');
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn('Health check failed with status:', response.status);
        return false;
      }
      
      const data = await response.json();
      console.log('Health check succeeded:', data);
      return true;
    } catch (error) {
      console.error('Error checking backend health:', error);
      return false;
    }
  }
};

export default apiService;
