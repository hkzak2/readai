import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiService from '@/services/apiService';
import { toast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';

export interface BookNote {
  id: string;
  user_id: string;
  book_id: string;
  page_id?: string | null;
  title?: string | null;
  content: string;
  page_number?: number | null;
  text_selection?: string | null;
  note_type?: string | null;
  position_metadata?: Record<string, unknown> | null;
  is_private?: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateNotePayload {
  content: string;
  title?: string;
  pageNumber?: number | null;
  pageId?: string | null;
  textSelection?: string | null;
  noteType?: string;
  positionMetadata?: Record<string, unknown> | string;
  isPrivate?: boolean;
}

interface UpdateNotePayload {
  content?: string;
  title?: string | null;
  pageNumber?: number | null;
  textSelection?: string | null;
  noteType?: string;
  positionMetadata?: Record<string, unknown> | string;
  isPrivate?: boolean;
}

interface NotesContextType {
  getNotesForBook: (bookId: string) => BookNote[];
  isLoading: (bookId: string) => boolean;
  getError: (bookId: string) => string | null;
  fetchNotes: (bookId: string) => Promise<BookNote[]>;
  createNote: (bookId: string, payload: CreateNotePayload) => Promise<BookNote | null>;
  updateNote: (bookId: string, noteId: string, payload: UpdateNotePayload) => Promise<BookNote | null>;
  deleteNote: (bookId: string, noteId: string) => Promise<boolean>;
  clearAll: () => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const NotesProvider = ({ children }: { children: React.ReactNode }) => {
  const [notesByBook, setNotesByBook] = useState<Record<string, BookNote[]>>({});
  const [loadingByBook, setLoadingByBook] = useState<Record<string, boolean>>({});
  const [errorByBook, setErrorByBook] = useState<Record<string, string | null>>({});
  const { session } = useAuth();

  const setLoading = useCallback((bookId: string, isLoading: boolean) => {
    setLoadingByBook(prev => ({ ...prev, [bookId]: isLoading }));
  }, []);

  const setError = useCallback((bookId: string, error: string | null) => {
    setErrorByBook(prev => ({ ...prev, [bookId]: error }));
  }, []);

  const fetchNotes = useCallback(async (bookId: string) => {
    if (!bookId) return [];

    setLoading(bookId, true);
    setError(bookId, null);

    try {
      const response = await apiService.getBookNotes(bookId);
      const notes = response.notes ?? [];
      setNotesByBook(prev => ({ ...prev, [bookId]: notes }));
      return notes;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load notes';
      setError(bookId, message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
      return [];
    } finally {
      setLoading(bookId, false);
    }
  }, [setError, setLoading]);

  const createNote = useCallback(async (bookId: string, payload: CreateNotePayload) => {
    setLoading(bookId, true);
    setError(bookId, null);

    try {
      const response = await apiService.createBookNote(bookId, payload);
      if (!response.success) {
        throw new Error('Failed to create note');
      }

      const note: BookNote = response.note;
      setNotesByBook(prev => ({
        ...prev,
        [bookId]: [note, ...(prev[bookId] ?? [])],
      }));

      toast({ title: 'Note saved', description: 'Your note has been added to this book.' });
      return note;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create note';
      setError(bookId, message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(bookId, false);
    }
  }, [setError, setLoading]);

  const updateNote = useCallback(async (bookId: string, noteId: string, payload: UpdateNotePayload) => {
    setLoading(bookId, true);
    setError(bookId, null);

    try {
      const response = await apiService.updateBookNote(bookId, noteId, payload);
      if (!response.success) {
        throw new Error('Failed to update note');
      }

      const updatedNote: BookNote = response.note;
      setNotesByBook(prev => ({
        ...prev,
        [bookId]: (prev[bookId] ?? []).map(note => note.id === noteId ? updatedNote : note)
      }));

      toast({ title: 'Note updated', description: 'Your note changes have been saved.' });
      return updatedNote;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update note';
      setError(bookId, message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(bookId, false);
    }
  }, [setError, setLoading]);

  const deleteNote = useCallback(async (bookId: string, noteId: string) => {
    setLoading(bookId, true);
    setError(bookId, null);

    try {
      const response = await apiService.deleteBookNote(bookId, noteId);
      if (!response.success) {
        throw new Error('Failed to delete note');
      }

      setNotesByBook(prev => ({
        ...prev,
        [bookId]: (prev[bookId] ?? []).filter(note => note.id !== noteId)
      }));

      toast({ title: 'Note deleted', description: 'The note has been removed.' });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete note';
      setError(bookId, message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(bookId, false);
    }
  }, [setError, setLoading]);

  const clearAll = useCallback(() => {
    setNotesByBook({});
    setLoadingByBook({});
    setErrorByBook({});
  }, []);

  useEffect(() => {
    if (!session) {
      clearAll();
    }
  }, [session, clearAll]);

  const getNotesForBook = useCallback((bookId: string) => notesByBook[bookId] ?? [], [notesByBook]);

  const isLoading = useCallback((bookId: string) => Boolean(loadingByBook[bookId]), [loadingByBook]);

  const getError = useCallback((bookId: string) => errorByBook[bookId] ?? null, [errorByBook]);

  const value = useMemo<NotesContextType>(() => ({
    getNotesForBook,
    isLoading,
    getError,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    clearAll,
  }), [getNotesForBook, isLoading, getError, fetchNotes, createNote, updateNote, deleteNote, clearAll]);

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within NotesProvider');
  }
  return context;
};
