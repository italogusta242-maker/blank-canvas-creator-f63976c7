import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'post_comments' });
  if (error) {
    // If RPC doesn't exist, try a simple select
    const { data: cols, error: err2 } = await supabase.from('post_comments').select('*').limit(1);
    if (err2) {
      console.error('Error fetching columns:', err2);
    } else {
      console.log('Columns in post_comments:', Object.keys(cols[0] || {}));
    }
  } else {
    console.log('Table info:', data);
  }
}

checkSchema();
