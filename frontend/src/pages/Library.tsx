import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Pencil, Link, Plus, FileText, Search, Grid, List, SortAsc, SortDesc, Filter } from "lucide-react";
import { useBooks, Book } from "@/contexts/BooksContext";
import { useNavigate } from "react-router-dom";
import { EditBookModal } from "@/components/EditBookModal";
import { useState, useCallback } from "react";
import { generatePdfThumbnail } from "@/lib/pdf-utils";
import apiService from "@/services/apiService";
import { toast } from "@/hooks/use-toast";
import { ContentLayout } from "@/components/layouts/ContentLayout";

export default function Library() {
  const { books, addBook, removeBook, setCurrentBook, updateBook } = useBooks();
  const navigate = useNavigate();
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [addBookModalOpen, setAddBookModalOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState("file");
  
  // New state for enhanced library features
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'author'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'favorites'>('all');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate file type
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid File",
          description: "Please upload a PDF file",
          variant: "destructive"
        });
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
      
      // Close modal on successful upload
      setAddBookModalOpen(false);
    } catch (error) {
      console.error('Failed to process PDF:', error);
    } finally {
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleUrlUpload = async () => {
    if (!urlInput.trim()) return;

    setIsLoadingUrl(true);
    try {
      // Validate URL format
      let urlStr = urlInput.trim();
      
      // Handle Google Drive URLs by converting to direct download links
      if (urlStr.includes('drive.google.com')) {
        // Extract file ID from various Google Drive URL formats
        let fileId = '';
        if (urlStr.includes('/file/d/')) {
          fileId = urlStr.split('/file/d/')[1].split('/')[0];
        } else if (urlStr.includes('id=')) {
          fileId = urlStr.split('id=')[1].split('&')[0];
        }
        
        if (fileId) {
          urlStr = `https://drive.google.com/uc?export=download&id=${fileId}`;
          console.log('Converted Google Drive URL to direct download:', urlStr);
        }
      }
      
      const url = new URL(urlStr);
      
      // Use our API service to fetch the PDF
      const pdfBlob = await Promise.race([
        apiService.proxyPdf(url.toString()),
        new Promise<Blob>((_, reject) => 
          setTimeout(() => reject(new Error('URL fetch timeout')), 30000)
        )
      ]);
      
      // Get the PDF data
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdfData = new Uint8Array(arrayBuffer);
      
      // Validate that this is actually a PDF by checking the header
      const pdfHeader = pdfData.slice(0, 4);
      const pdfSignature = String.fromCharCode(...pdfHeader);
      if (pdfSignature !== '%PDF') {
        throw new Error('The downloaded file is not a valid PDF. Please check the URL and try again.');
      }
      
      // Generate thumbnail
      const defaultCover = await generatePdfThumbnail(pdfData);

      // Extract filename from URL or use default
      const urlPath = url.pathname;
      const filename = urlPath.split('/').pop() || 'Downloaded PDF';
      const title = filename.replace(/\.pdf$/i, '');

      // Add the book to our context with data
      addBook({
        title,
        pdfData,
        defaultCover,
      });

      // Clear the URL input and close modal
      setUrlInput("");
      setAddBookModalOpen(false);
    } catch (error) {
      console.error('Failed to process PDF from URL:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to add PDF from URL.';
      if (error instanceof Error) {
        if (error.message.includes('not a valid PDF')) {
          errorMessage = error.message;
        } else if (error.message.includes('timeout')) {
          errorMessage = 'The download timed out. Please check your connection and try again.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to access the PDF. Please check the URL or try a different link.';
        }
      }
      
      // TODO: Replace with proper toast notification
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoadingUrl(false);
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

  // Filter and sort books
  const filteredAndSortedBooks = books
    .filter(book => {
      const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (book.author || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterBy === 'recent') {
        const isRecent = new Date(book.uploadDate).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000);
        return matchesSearch && isRecent;
      }
      
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'author':
          comparison = (a.author || '').localeCompare(b.author || '');
          break;
        case 'date':
          comparison = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <ContentLayout
      title="Library"
      description="Manage your book collection and discover new content"
    >
      <div className="space-y-6">
        {/* Library Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Books</p>
                <p className="text-2xl font-bold text-foreground">{books.length}</p>
              </div>
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Grid className="w-4 h-4 text-primary" />
              </div>
            </div>
          </Card>
          
          <Card className="glass p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Uploads</p>
                <p className="text-2xl font-bold text-foreground">
                  {books.filter(book => 
                    new Date(book.uploadDate).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                <SortAsc className="w-4 h-4 text-green-500" />
              </div>
            </div>
          </Card>
          
          <Card className="glass p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pages</p>
                <p className="text-2xl font-bold text-foreground">
                  {books.length > 0 ? (books.length * 150) : 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <List className="w-4 h-4 text-blue-500" />
              </div>
            </div>
          </Card>
          
          <Card className="glass p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Storage Used</p>
                <p className="text-2xl font-bold text-foreground">
                  {books.length > 0 ? `${(books.length * 2.5).toFixed(1)}MB` : '0MB'}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Filter className="w-4 h-4 text-purple-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Upload Section */}
        <Card className="glass p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Add New Book</h2>
            <Button
              variant="outline"
              onClick={() => setAddBookModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload PDF files from your device or add books via URL to expand your library
          </p>
        </Card>

        {/* Search and Filter Controls */}
        <Card className="glass p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search books by title or author..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50"
                />
              </div>

              {/* Filter */}
              <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                <SelectTrigger className="w-32 bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Books</SelectItem>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="favorites">Favorites</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32 bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date Added</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="author">Author</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={sortOrder === 'asc' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-10 h-10 p-0"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
              
              <div className="flex rounded-lg border border-border/50 bg-background/50">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none border-r border-border/50"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || filterBy !== 'all') && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm("")}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filterBy !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Filter: {filterBy}
                  <button
                    onClick={() => setFilterBy('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
        </Card>

        {/* Books Grid/List */}
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {filteredAndSortedBooks.length > 0 ? (
            filteredAndSortedBooks.map((book) => (
              viewMode === 'grid' ? (
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
              ) : (
                <Card 
                  key={book.id}
                  className="glass p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleBookClick(book)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-16 bg-muted rounded-lg flex items-center justify-center">
                        {(book.coverUrl || book.defaultCover) ? (
                          <img 
                            src={book.coverUrl || book.defaultCover}
                            alt={book.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <FileText className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate text-sm">
                            {book.title}
                          </h3>
                          {book.author && (
                            <p className="text-xs text-muted-foreground truncate">
                              by {book.author}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(book.uploadDate).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
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
                      </div>
                    </div>
                  </div>
                </Card>
              )
            ))
          ) : books.length === 0 ? (
            <Card className="glass p-12 text-center col-span-full">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <FileText className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No books in your library</h3>
              <p className="text-muted-foreground mb-6">
                Upload your first book to get started with AI-powered reading
              </p>
              <Button onClick={() => setAddBookModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Book
              </Button>
            </Card>
          ) : (
            <Card className="glass p-12 text-center col-span-full">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <Search className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No books found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search terms or filters
              </p>
              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setFilterBy('all');
              }}>
                Clear Filters
              </Button>
            </Card>
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

        {/* Add Book Modal */}
        <Dialog open={addBookModalOpen} onOpenChange={setAddBookModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Add a book
              </DialogTitle>
            </DialogHeader>
            
            <Tabs value={uploadTab} onValueChange={setUploadTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload file
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  From URL
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="file" className="mt-6">
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Choose a PDF file from your device to add to your library.
                  </div>
                  <Button
                    variant="outline"
                    className="relative overflow-hidden w-full h-24 border-dashed"
                    size="lg"
                  >
                    <div className="flex flex-col items-center">
                      <Upload className="h-6 w-6 mb-2" />
                      <span>Click to select PDF file</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="url" className="mt-6">
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Enter a direct link to a PDF file. The file will be downloaded and added to your library.
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="Paste PDF URL here..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isLoadingUrl) {
                          handleUrlUpload();
                        }
                      }}
                    />
                    <Button
                      onClick={handleUrlUpload}
                      disabled={!urlInput.trim() || isLoadingUrl}
                    >
                      {isLoadingUrl ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </ContentLayout>
  );
}
