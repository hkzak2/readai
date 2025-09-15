import React, { useState, useEffect } from 'react';
import { generatePdfThumbnail } from '../lib/pdf-utils';
import { generatePdfThumbnailFromUrl } from '../lib/pdf-utils-react';

const PDFTestComponent: React.FC = () => {
  const [status, setStatus] = useState('Ready to test');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [booksContextStatus, setBooksContextStatus] = useState('Not tested');

  const testPdfUrl = 'https://nmmmnfoahmdvaikcpvcn.supabase.co/storage/v1/object/public/readai-media/pdfs/7a59017e-b2d2-4ca6-b7b8-5f8e6c9b8e61/e7043122-246e-4200-99a0-c47bcdd2cc4a/UUUU_UU_UU_U_UUU_UU_UUUU.pdf';

  const testPdfLoading = async () => {
    setStatus('Testing PDF access...');
    
    try {
      // Test URL accessibility
      const response = await fetch(testPdfUrl, { method: 'HEAD' });
      setStatus(`URL test: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        setStatus('❌ PDF URL not accessible');
        return;
      }
      
      // Test NEW URL-based approach (like ReadingArea)
      setStatus('Generating thumbnail (URL-based approach)...');
      const thumbnailUrl = await generatePdfThumbnailFromUrl(testPdfUrl);
      
      if (thumbnailUrl && thumbnailUrl !== '/placeholder.svg') {
        setThumbnailUrl(thumbnailUrl);
        setStatus('✅ Thumbnail generated successfully with URL approach!');
      } else {
        setStatus('❌ URL-based thumbnail generation failed, trying data approach...');
        
        // Fallback to old data-based approach
        const pdfResponse = await fetch(testPdfUrl);
        const arrayBuffer = await pdfResponse.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);
        
        setStatus(`PDF fetched: ${pdfData.length} bytes, generating thumbnail...`);
        const fallbackThumbnail = await generatePdfThumbnail(pdfData);
        
        if (fallbackThumbnail && fallbackThumbnail !== '/placeholder.svg') {
          setThumbnailUrl(fallbackThumbnail);
          setStatus('✅ Thumbnail generated with data approach!');
        } else {
          setStatus('❌ Both thumbnail generation methods failed');
        }
      }
      
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('PDF test error:', error);
    }
  };

  const testBooksContextData = () => {
    setBooksContextStatus('Checking BooksContext data...');
    
    // Check if books data is available from BooksContext debugging
    const booksState = (window as any).booksState;
    
    if (booksState && Array.isArray(booksState)) {
      setBooksContextStatus(`Found ${booksState.length} books in state`);
      
      console.log('=== BOOKS STATE ANALYSIS ===');
      booksState.forEach((book: any, index: number) => {
        console.log(`Book ${index + 1}:`, {
          id: book.id,
          title: book.title,
          pdf_url: book.pdf_url,
          thumbnail_url: book.thumbnail_url,
          defaultCover: book.defaultCover,
          coverUrl: book.coverUrl,
          hasCover: !!(book.thumbnail_url || book.defaultCover || book.coverUrl)
        });
      });
      console.log('=== END ANALYSIS ===');
      
      const booksWithCovers = booksState.filter((book: any) => 
        book.thumbnail_url || book.defaultCover || book.coverUrl
      );
      
      setBooksContextStatus(
        `📚 ${booksState.length} books total, ${booksWithCovers.length} with covers`
      );
    } else {
      setBooksContextStatus('❌ No books state found. Try accessing the library first.');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>PDF Loading & Cover Generation Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Direct PDF.js Test</h3>
        <p>Status: {status}</p>
        <button onClick={testPdfLoading} style={{ padding: '10px 20px', margin: '10px 0' }}>
          Test PDF Loading
        </button>
        
        {thumbnailUrl && (
          <div>
            <h3>Generated Thumbnail:</h3>
            <img 
              src={thumbnailUrl} 
              alt="PDF Thumbnail" 
              style={{ maxWidth: '200px', border: '1px solid #ccc' }}
            />
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>BooksContext State Test</h3>
        <p>Status: {booksContextStatus}</p>
        <button onClick={testBooksContextData} style={{ padding: '10px 20px', margin: '10px 0' }}>
          Check BooksContext Data
        </button>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Test URL:</h3>
        <p style={{ wordBreak: 'break-all', fontSize: '12px' }}>
          {testPdfUrl}
        </p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>First, test the direct PDF loading to verify PDF.js works</li>
          <li>Then, log into the app and visit the library page</li>
          <li>Finally, come back here and click "Check BooksContext Data" to see book state</li>
        </ol>
      </div>
    </div>
  );
};

export default PDFTestComponent;
