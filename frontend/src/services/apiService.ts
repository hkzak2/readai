/**
 * API service for interacting with the backend
 */

// Base API URL - can be configured based on environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Get authentication headers from localStorage
 */
const getAuthHeaders = () => {
  const session = localStorage.getItem('readai_session');
  if (session) {
    try {
      const parsedSession = JSON.parse(session);
      console.log('Session check:', {
        hasToken: !!parsedSession.access_token,
        expiresAt: parsedSession.expires_at,
        currentTime: Date.now() / 1000,
        isExpired: parsedSession.expires_at <= Date.now() / 1000
      });
      
      if (parsedSession.access_token && parsedSession.expires_at > Date.now() / 1000) {
        return {
          'Authorization': `Bearer ${parsedSession.access_token}`
        };
      } else {
        console.warn('Session invalid or expired');
      }
    } catch (error) {
      console.error('Error parsing session:', error);
    }
  } else {
    console.warn('No session found in localStorage');
  }
  return {};
};

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
          'Accept': 'application/json',
          ...getAuthHeaders()
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
          'Accept': 'audio/wav',
          ...getAuthHeaders()
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
          'Accept': 'application/pdf',
          ...getAuthHeaders()
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
   * Get user's book library from backend
   * @returns {Promise<Object>} - User's books
   */
  async getUserLibrary() {
    try {
      const response = await fetch(`${API_BASE_URL}/books/library`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          ...getAuthHeaders()
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch library");
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user library:', error);
      throw error;
    }
  },

  /**
   * Create a new book in user's library
   * @param {Object} bookData - Book information
   * @returns {Promise<Object>} - Created book
   */
  async createBook(bookData: {
    title: string;
    author?: string;
    description?: string;
    pdf_url?: string;
    pdf_source?: string;
    thumbnail_url?: string;
    total_pages?: number;
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/books`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(bookData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create book");
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  },

  /**
   * Upload a PDF file
   * @param {File} file - PDF file to upload
   * @param {Object} metadata - Book metadata
   * @returns {Promise<Object>} - Upload result
   */
  async uploadPDF(file: File, metadata: { title: string; author?: string; description?: string }) {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('title', metadata.title);
      if (metadata.author) formData.append('author', metadata.author);
      if (metadata.description) formData.append('description', metadata.description);

      const response = await fetch(`${API_BASE_URL}/books/upload`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          ...getAuthHeaders()
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload PDF");
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading PDF:', error);
      throw error;
    }
  },

  /**
   * Create book from URL
   * @param {Object} bookData - Book data including URL
   * @returns {Promise<Object>} - Created book
   */
  async createBookFromUrl(bookData: {
    title: string;
    author?: string;
    description?: string;
    pdf_url: string;
  }) {
    return this.createBook({
      ...bookData,
      pdf_source: 'url'
    });
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
