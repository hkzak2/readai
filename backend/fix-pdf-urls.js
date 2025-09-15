const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPdfUrls() {
  try {
    console.log('Fetching books with malformed PDF URLs...');
    
    // Get all books where pdf_url is malformed
    const { data: books, error } = await supabase
      .from('books')
      .select('id, title, pdf_url')
      .or('pdf_url.eq.{},pdf_url.is.null');

    if (error) {
      console.error('Error fetching books:', error);
      return;
    }

    console.log(`Found ${books.length} books with malformed PDF URLs`);

    for (const book of books) {
      console.log(`\nProcessing book: ${book.title} (${book.id})`);
      console.log(`Current PDF URL: ${book.pdf_url}`);
      
      // Try to construct the expected file path
      // The PDF should be at: pdfs/{userId}/{bookId}/{filename}
      // We need to get the user_id from user_books table
      const { data: userBooks, error: userError } = await supabase
        .from('user_books')
        .select('user_id')
        .eq('book_id', book.id)
        .single();

      if (userError) {
        console.log(`Could not find user for book ${book.id}:`, userError);
        continue;
      }

      const userId = userBooks.user_id;
      console.log(`User ID: ${userId}`);

      // List files in the expected directory
      const { data: files, error: listError } = await supabase.storage
        .from('readai-media')
        .list(`pdfs/${userId}/${book.id}`);

      if (listError) {
        console.log(`Error listing files for book ${book.id}:`, listError);
        continue;
      }

      if (files && files.length > 0) {
        const pdfFile = files.find(file => file.name.endsWith('.pdf'));
        if (pdfFile) {
          const filePath = `pdfs/${userId}/${book.id}/${pdfFile.name}`;
          const { data } = supabase.storage
            .from('readai-media')
            .getPublicUrl(filePath);

          const correctUrl = data.publicUrl;
          console.log(`Found PDF file: ${pdfFile.name}`);
          console.log(`Correct URL: ${correctUrl}`);

          // Update the book with the correct URL
          const { error: updateError } = await supabase
            .from('books')
            .update({ pdf_url: correctUrl })
            .eq('id', book.id);

          if (updateError) {
            console.log(`Error updating book ${book.id}:`, updateError);
          } else {
            console.log(`✅ Successfully updated PDF URL for book ${book.id}`);
          }
        } else {
          console.log(`❌ No PDF file found in directory for book ${book.id}`);
        }
      } else {
        console.log(`❌ No files found in directory for book ${book.id}`);
      }
    }

    console.log('\n🎉 PDF URL fix completed!');
  } catch (error) {
    console.error('Error in fixPdfUrls:', error);
  }
}

fixPdfUrls();
