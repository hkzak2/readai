const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testGetPublicUrl() {
  try {
    // Test with a known file path that should exist in the bucket
    const bucketName = 'readai-media';
    const testPath = 'pdfs/7c1e9188-1755-4e06-b4f6-0a8f57c26db0/d785d97b-52b4-4186-b17f-4e0ff7825cf7/المشوق_إلى_القرآن_الإصدار_الثاني_عمرو_الشرقاوي.pdf';
    
    console.log(`Testing getPublicUrl for bucket: ${bucketName}, path: ${testPath}`);
    
    const result = supabase.storage
      .from(bucketName)
      .getPublicUrl(testPath);
    
    console.log('Full result:', JSON.stringify(result, null, 2));
    console.log('Data:', result.data);
    console.log('Data type:', typeof result.data);
    console.log('Public URL:', result.data?.publicUrl);
    
    // Also test with a simpler path format
    const simplePath = 'test/file.pdf';
    console.log(`\nTesting with simpler path: ${simplePath}`);
    
    const result2 = supabase.storage
      .from(bucketName)
      .getPublicUrl(simplePath);
    
    console.log('Simple path result:', JSON.stringify(result2, null, 2));
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testGetPublicUrl();
