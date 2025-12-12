const supabaseService = require('../services/supabaseService');
const logger = require('../utils/logger');

const MAX_NOTE_LENGTH = 2000;
const MAX_TITLE_LENGTH = 200;

const validateContent = (content) => {
  if (typeof content !== 'string' || !content.trim()) {
    return 'Note content is required';
  }

  if (content.trim().length > MAX_NOTE_LENGTH) {
    return `Note content must be ${MAX_NOTE_LENGTH} characters or fewer`;
  }

  return null;
};

const validateTitle = (title) => {
  if (title === undefined || title === null) {
    return null;
  }

  if (typeof title !== 'string') {
    return 'Title must be a string';
  }

  if (title.trim().length > MAX_TITLE_LENGTH) {
    return `Title must be ${MAX_TITLE_LENGTH} characters or fewer`;
  }

  return null;
};

const parsePositionMetadata = (metadata) => {
  if (metadata === undefined || metadata === null) {
    return {};
  }

  if (typeof metadata === 'object') {
    return metadata;
  }

  try {
    return JSON.parse(metadata);
  } catch (error) {
    return {};
  }
};

const ensureAccess = async (userId, bookId) => {
  const hasAccess = await supabaseService.ensureUserHasBookAccess(userId, bookId);
  return hasAccess;
};

const listNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookId } = req.params;

    const hasAccess = await ensureAccess(userId, bookId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this book' });
    }

    const notes = await supabaseService.getBookNotes(userId, bookId);

    return res.json({ success: true, notes });
  } catch (error) {
    logger.error('Error listing book notes:', error);
    return res.status(500).json({ error: 'Failed to load notes' });
  }
};

const createNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookId } = req.params;
    const {
      content,
      title,
      pageNumber,
      pageId,
      textSelection,
      noteType,
      positionMetadata,
      isPrivate,
    } = req.body;

    const hasAccess = await ensureAccess(userId, bookId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this book' });
    }

    const contentError = validateContent(content);
    if (contentError) {
      return res.status(400).json({ error: contentError });
    }

    const titleError = validateTitle(title);
    if (titleError) {
      return res.status(400).json({ error: titleError });
    }

    if (pageNumber !== undefined && pageNumber !== null && Number.isNaN(Number(pageNumber))) {
      return res.status(400).json({ error: 'Page number must be a valid number' });
    }

    const noteData = {
      content: content.trim(),
      title: title ? title.trim() : null,
      page_number: pageNumber !== undefined && pageNumber !== null ? Number(pageNumber) : null,
      page_id: pageId || null,
      text_selection: textSelection || null,
      note_type: noteType || 'general',
      position_metadata: parsePositionMetadata(positionMetadata),
      is_private: typeof isPrivate === 'boolean' ? isPrivate : true,
    };

    const note = await supabaseService.createBookNote(userId, bookId, noteData);

    return res.status(201).json({ success: true, note });
  } catch (error) {
    logger.error('Error creating book note:', error);
    return res.status(500).json({ error: 'Failed to create note' });
  }
};

const updateNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookId, noteId } = req.params;
    const {
      content,
      title,
      pageNumber,
      textSelection,
      noteType,
      positionMetadata,
      isPrivate,
    } = req.body;

    const hasAccess = await ensureAccess(userId, bookId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this book' });
    }

    const updates = {};

    if (content !== undefined) {
      const contentError = validateContent(content);
      if (contentError) {
        return res.status(400).json({ error: contentError });
      }
      updates.content = content.trim();
    }

    if (title !== undefined) {
      const titleError = validateTitle(title);
      if (titleError) {
        return res.status(400).json({ error: titleError });
      }
      updates.title = title ? title.trim() : null;
    }

    if (pageNumber !== undefined) {
      if (pageNumber !== null && Number.isNaN(Number(pageNumber))) {
        return res.status(400).json({ error: 'Page number must be a valid number' });
      }
      updates.page_number = pageNumber !== null ? Number(pageNumber) : null;
    }

    if (textSelection !== undefined) {
      updates.text_selection = textSelection;
    }

    if (noteType !== undefined) {
      updates.note_type = noteType || 'general';
    }

    if (positionMetadata !== undefined) {
      updates.position_metadata = parsePositionMetadata(positionMetadata);
    }

    if (isPrivate !== undefined) {
      updates.is_private = Boolean(isPrivate);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const updated = await supabaseService.updateBookNote(userId, noteId, updates);

    if (!updated) {
      return res.status(404).json({ error: 'Note not found' });
    }

    return res.json({ success: true, note: updated });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ error: 'You do not have permission to modify this note' });
    }
    logger.error('Error updating book note:', error);
    return res.status(500).json({ error: 'Failed to update note' });
  }
};

const deleteNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookId, noteId } = req.params;

    const hasAccess = await ensureAccess(userId, bookId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this book' });
    }

    const deleted = await supabaseService.deleteBookNote(userId, noteId);

    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ error: 'You do not have permission to modify this note' });
    }
    logger.error('Error deleting book note:', error);
    return res.status(500).json({ error: 'Failed to delete note' });
  }
};

module.exports = {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
};
