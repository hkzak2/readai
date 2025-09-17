import { Document, Page, pdfjs } from 'react-pdf';
import * as pdfjsLib from 'pdfjs-dist';

// Use the same worker configuration as ReadingArea
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export async function generatePdfThumbnail(pdfData: Uint8Array): Promise<string | undefined> {
  try {
    // Create a blob URL from the PDF data (same as ReadingArea approach)
    const blob = new Blob([new Uint8Array(pdfData)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    try {
      // Use the direct pdfjs-dist approach (same as react-pdf uses internally)
      const pdf = await pdfjsLib.getDocument({ url: url }).promise;
      
      const page = await pdf.getPage(1); // Get the first page

      const viewport = page.getViewport({ scale: 0.5 }); // Use a smaller scale for thumbnail
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      
      // Return the canvas as a data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      return dataUrl;
    } finally {
      // Clean up the blob URL
      URL.revokeObjectURL(url);
    }
  } catch (error) {
  // Silent fallback
    return '/placeholder.svg';
  }
}

// New approach: Generate thumbnail directly from PDF URL (like ReadingArea)
export async function generatePdfThumbnailFromUrl(pdfUrl: string): Promise<string | undefined> {
  try {
    // Use the URL directly (same approach as ReadingArea)
    const pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
    
    const page = await pdf.getPage(1); // Get the first page

    const viewport = page.getViewport({ scale: 0.5 }); // Use a smaller scale for thumbnail
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    
    // Return the canvas as a data URL
    const dataUrl = canvas.toDataURL('image/png');
    
    return dataUrl;
  } catch (error) {
  // Silent fallback
    return '/placeholder.svg';
  }
}
