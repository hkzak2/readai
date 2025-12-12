import React, { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Worker is configured globally in main.tsx - no need to set it here

interface SimplePdfThumbnailProps {
  pdfUrl: string;
  onThumbnailGenerated: (thumbnailUrl: string) => void;
  onError?: (error: string) => void;
}

export const SimplePdfThumbnail: React.FC<SimplePdfThumbnailProps> = ({
  pdfUrl,
  onThumbnailGenerated,
  onError
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);

  const onPageLoadSuccess = () => {
    setIsReady(true);
  };

  const captureCanvas = () => {
    if (!canvasRef.current) return;
    
    // Find the PDF canvas that react-pdf created
    const pdfCanvas = document.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement;
    if (!pdfCanvas) {
      onError?.('Could not find PDF canvas');
      return;
    }

    // Copy the PDF canvas to our capture canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onError?.('Could not get canvas context');
      return;
    }

    canvas.width = pdfCanvas.width;
    canvas.height = pdfCanvas.height;
    ctx.drawImage(pdfCanvas, 0, 0);

    // Generate thumbnail URL
    const thumbnailUrl = canvas.toDataURL('image/png');
    onThumbnailGenerated(thumbnailUrl);
  };

  useEffect(() => {
    if (isReady) {
      // Small delay to ensure the canvas is fully rendered
      setTimeout(captureCanvas, 100);
    }
  }, [isReady]);

  return (
    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '200px', height: '300px' }}>
      <Document
        file={pdfUrl}
        onLoadError={(error) => onError?.(error.message)}
      >
        <Page
          pageNumber={1}
          width={200}
          onLoadSuccess={onPageLoadSuccess}
          renderAnnotationLayer={false}
          renderTextLayer={false}
        />
      </Document>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
