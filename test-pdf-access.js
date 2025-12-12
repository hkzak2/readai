// Test script to verify PDF URL accessibility from frontend
const testPdfUrl = 'https://nmmmnfoahmdvaikcpvcn.supabase.co/storage/v1/object/public/readai-media/pdfs/7a59017e-b2d2-4ca6-b7b8-5f8e6c9b8e61/e7043122-246e-4200-99a0-c47bcdd2cc4a/UUUU_UU_UUU_U_UUU_UU_UUUU.pdf';

fetch(testPdfUrl, { method: 'HEAD' })
  .then(response => {
    console.log('PDF URL test result:', response.status, response.statusText);
    if (response.ok) {
      console.log('✅ PDF URL is accessible from frontend');
    } else {
      console.log('❌ PDF URL failed:', response.status);
    }
  })
  .catch(error => {
    console.error('❌ PDF URL fetch error:', error);
  });

console.log('Testing PDF URL accessibility...');
