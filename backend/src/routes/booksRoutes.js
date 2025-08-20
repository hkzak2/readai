const express = require('express');
const multer = require('multer');
const { authenticateUser, optionalAuth } = require('../middleware/authMiddleware');
const booksController = require('../controllers/booksController');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Public routes (no authentication required)
router.get('/public', booksController.getPublicBooks);

// Protected routes (authentication required)
router.get('/library', authenticateUser, booksController.getUserLibrary);
router.post('/', authenticateUser, booksController.createBook);
router.post('/upload', authenticateUser, upload.single('pdf'), booksController.uploadPDF);
router.post('/:bookId/add-to-library', authenticateUser, booksController.addToLibrary);
router.put('/:bookId/progress', authenticateUser, booksController.updateProgress);

module.exports = router;
