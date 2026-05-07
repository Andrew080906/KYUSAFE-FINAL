import { createClient } from '@supabase/supabase-js';
const supabase = createClient('my-supabase-url', 'fake-key');
try {
  await supabase.auth.getSession();
  console.log('Success');
} catch (err) {
  console.log('Error:', err.message);
}
