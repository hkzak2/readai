import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Pencil } from "lucide-react";
import { useBooks, Book } from "@/contexts/BooksContext";
import { useNavigate } from "react-router-dom";
import { EditBookModal } from "@/components/EditBookModal";
import { useState, useCallback } from "react";
import { generatePdfThumbnail } from "@/lib/pdf-utils";

export default function Library() {
  const { books, addBook, removeBook, setCurrentBook, updateBook } = useBooks();
  const navigate = useNavigate();
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate file type
      if (file.type !== 'application/pdf') {
        console.error('Invalid file type');
        return;
      }

      // Read the file as ArrayBuffer with timeout
      const arrayBuffer = await Promise.race([
        file.arrayBuffer(),
        new Promise<ArrayBuffer>((_, reject) => 
          setTimeout(() => reject(new Error('File reading timeout')), 10000)
        )
      ]);
      
      const pdfData = new Uint8Array(arrayBuffer);
      const defaultCover = await generatePdfThumbnail(pdfData);

      // Add the book to our context with data
      addBook({
        title: file.name.replace(/\.pdf$/i, ''),
        pdfData,
        defaultCover,
      });
    } catch (error) {
      console.error('Failed to process PDF:', error);
    } finally {
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleEditSave = (bookId: string, updates: Partial<Book>) => {
    updateBook(bookId, updates);
    setEditingBook(null);
  };

  const handleBookClick = (book: Book) => {
    setCurrentBook(book);
    navigate('/read');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light">Library</h1>
        <Button
          variant="outline"
          className="relative overflow-hidden"
          size="lg"
        >
          <Upload className="h-4 w-4 mr-2" />
          Add Book
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {books.map((book) => (
          <Card 
            key={book.id}
            className="glass bg-card/95 p-4 flex flex-col relative cursor-pointer hover:shadow-lg transition-shadow group"
            onClick={() => handleBookClick(book)}
          >
            <div className="aspect-[3/4] bg-muted mb-4 rounded-lg flex items-center justify-center">
              {(book.coverUrl || book.defaultCover) ? (
                <img 
                  src={book.coverUrl || book.defaultCover}
                  alt={book.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-muted-foreground text-sm">No Cover</div>
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="font-medium mb-1 line-clamp-2">{book.title}</h3>
              {book.author && (
                <p className="text-sm text-muted-foreground mb-2">{book.author}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Added {new Date(book.uploadDate).toLocaleDateString()}
              </p>
            </div>

            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingBook(book);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  removeBook(book.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}

        {books.length === 0 && (
          <div className="col-span-full text-center p-12 text-muted-foreground">
            No books in your library yet. Add your first book by clicking the button above.
          </div>
        )}
      </div>

      {editingBook && (
        <EditBookModal
          book={editingBook}
          isOpen={true}
          onClose={() => setEditingBook(null)}
          onSave={(updates) => handleEditSave(editingBook.id, updates)}
        />
      )}
    </div>
  );
}
