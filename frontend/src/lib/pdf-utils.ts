import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker source for pdfjs-dist using local file (same as ReadingArea)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export async function generatePdfThumbnail(pdfData: Uint8Array): Promise<string | undefined> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    
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
  // Silent failure; return a placeholder if thumbnail generation fails
    return '/placeholder.svg';
  }
}
