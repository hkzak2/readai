const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkBooks() {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, pdf_url, pdf_source')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    console.log('Recent books in database:');
    data.forEach(book => {
      console.log(`- ID: ${book.id}`);
      console.log(`  Title: ${book.title}`);
      console.log(`  PDF URL: ${book.pdf_url}`);
      console.log(`  PDF Source: ${book.pdf_source}`);
      console.log(`  URL Type: ${typeof book.pdf_url}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBooks();
