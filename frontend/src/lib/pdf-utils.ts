import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker source for pdfjs-dist using local file (same as ReadingArea)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export async function generatePdfThumbnail(pdfData: Uint8Array): Promise<string | undefined> {
  try {
    console.log('🖼️ Starting PDF thumbnail generation, data size:', pdfData.length);
    console.log('🖼️ PDF.js worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    console.log('🖼️ PDF loaded successfully, pages:', pdf.numPages);
    
    const page = await pdf.getPage(1); // Get the first page
    console.log('🖼️ First page loaded successfully');

    const viewport = page.getViewport({ scale: 0.5 }); // Use a smaller scale for thumbnail
    console.log('🖼️ Viewport created:', { width: viewport.width, height: viewport.height });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    console.log('🖼️ Canvas configured:', { width: canvas.width, height: canvas.height });

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    console.log('🖼️ Starting page render...');
    await page.render(renderContext).promise;
    console.log('🖼️ Page rendered to canvas successfully');
    
    // Return the canvas as a data URL
    const dataUrl = canvas.toDataURL('image/png');
    console.log('🖼️ Thumbnail generated successfully, size:', dataUrl.length);
    console.log('🖼️ Data URL preview:', dataUrl.substring(0, 50) + '...');
    return dataUrl;
  } catch (error) {
    console.error('🖼️ Failed to generate PDF thumbnail:', error);
    if (error instanceof Error) {
      console.error('🖼️ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    // Return a placeholder if thumbnail generation fails
    console.log('🖼️ Returning placeholder due to error');
    return '/placeholder.svg';
  }
}
