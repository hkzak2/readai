const supabaseService = require('../services/supabaseService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Get user's book library
 */
const getUserLibrary = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const books = await supabaseService.getUserBooks(userId);
    
    res.json({
      success: true,
      books: books || []
    });
  } catch (error) {
    logger.error('Error fetching user library:', error);
    res.status(500).json({
      error: 'Failed to fetch library'
    });
  }
};

/**
 * Create a new book
 */
const createBook = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      author,
      description,
      pdf_url,
      pdf_source = 'upload',
      thumbnail_url,
      total_pages
    } = req.body;

    if (!title) {
      return res.status(400).json({
        error: 'Book title is required'
      });
    }

    // Create the book
    const book = await supabaseService.createBook(userId, {
      title,
      author,
      description,
      pdf_url,
      pdf_source,
      thumbnail_url,
      total_pages
    });

    // Add to user's library automatically
    const userBook = await supabaseService.addBookToLibrary(userId, book.id);

    res.status(201).json({
      success: true,
      book,
      userBook
    });
  } catch (error) {
    logger.error('Error creating book:', error);
    res.status(500).json({
      error: 'Failed to create book'
    });
  }
};

/**
 * Add an existing book to user's library
 */
const addToLibrary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookId } = req.params;
    const { personal_title, tags, is_favorite } = req.body;

    const userBook = await supabaseService.addBookToLibrary(userId, bookId, {
      personal_title,
      tags,
      is_favorite
    });

    res.status(201).json({
      success: true,
      userBook
    });
  } catch (error) {
    logger.error('Error adding book to library:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        error: 'Book already in library'
      });
    }
    
    res.status(500).json({
      error: 'Failed to add book to library'
    });
  }
};

/**
 * Update reading progress
 */
const updateProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookId } = req.params;
    const {
      last_read_page,
      reading_progress,
      total_reading_time_minutes
    } = req.body;

    const updatedUserBook = await supabaseService.updateBookProgress(userId, bookId, {
      last_read_page,
      reading_progress,
      total_reading_time_minutes
    });

    res.json({
      success: true,
      userBook: updatedUserBook
    });
  } catch (error) {
    logger.error('Error updating reading progress:', error);
    res.status(500).json({
      error: 'Failed to update reading progress'
    });
  }
};

/**
 * Upload PDF and create book
 */
const uploadPDF = async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No PDF file provided'
      });
    }

    const { title, author, description } = req.body;
    
    if (!title) {
      return res.status(400).json({
        error: 'Book title is required'
      });
    }

    // Generate unique file path
    const bookId = uuidv4();
    const fileName = `${req.file.originalname}`;
    const filePath = `pdfs/${userId}/${bookId}/${fileName}`;

    // Upload PDF to Supabase Storage
    const uploadResult = await supabaseService.uploadFile(
      'readai-media',
      filePath,
      req.file.buffer,
      {
        contentType: req.file.mimetype,
        upsert: false
      }
    );

    // Get public URL
    const pdfUrl = supabaseService.getFileUrl('readai-media', filePath);

    // Create book record
    const book = await supabaseService.createBook(userId, {
      title,
      author,
      description,
      pdf_url: pdfUrl,
      pdf_source: 'upload',
      total_pages: null // Will be determined during processing
    });

    // Add to user's library
    const userBook = await supabaseService.addBookToLibrary(userId, book.id);

    res.status(201).json({
      success: true,
      message: 'PDF uploaded successfully',
      book,
      userBook,
      upload: uploadResult
    });
  } catch (error) {
    logger.error('Error uploading PDF:', error);
    res.status(500).json({
      error: 'Failed to upload PDF'
    });
  }
};

/**
 * Get public books for discovery
 */
const getPublicBooks = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    // Build query for public books
    let query = supabaseService.supabase
      .from('books')
      .select(`
        id,
        title,
        author,
        description,
        thumbnail_url,
        total_pages,
        processing_status,
        created_at,
        user_profiles!books_user_id_fkey (
          display_name
        )
      `)
      .eq('visibility', 'public')
      .eq('processing_status', 'completed')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      books: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: data && data.length === parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching public books:', error);
    res.status(500).json({
      error: 'Failed to fetch public books'
    });
  }
};

module.exports = {
  getUserLibrary,
  createBook,
  addToLibrary,
  updateProgress,
  uploadPDF,
  getPublicBooks
};
