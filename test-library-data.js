const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testLibraryData() {
  try {
    // Get user books directly
    const userId = '7a59017e-b2d2-4ca6-b7b8-5f8e6c9b8e61'; // The user ID we've been working with
    const { data, error } = await supabase
      .from('user_books')
      .select(`
        *,
        books (
          id,
          title,
          author,
          description,
          pdf_url,
          pdf_source,
          thumbnail_url,
          total_pages,
          processing_status,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    console.log('User books query result:');
    console.log('Error:', error);
    console.log('Data count:', data?.length || 0);
    
    if (data && data.length > 0) {
      data.forEach((userBook, index) => {
        console.log(`Book ${index + 1}:`, {
          userBookId: userBook.id,
          bookId: userBook.books?.id,
          title: userBook.books?.title,
          hasPdfUrl: !!userBook.books?.pdf_url,
          pdfUrl: userBook.books?.pdf_url,
          pdfUrlLength: userBook.books?.pdf_url?.length,
          pdfSource: userBook.books?.pdf_source
        });
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testLibraryData();
