const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dqxpnqkfkzpxlivulqhe.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxeHBucWtma3pweGxpdnVscWhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk2MzE1NywiZXhwIjoyMDk2NTM5MTU3fQ.I4VAiM-4NUjlCsPj56xGiTl4xsdI-5XY0cmrCUteuxg';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function migrate() {
  console.log('Testing connection...');
  const { data, error } = await supabase.from('_test_nonexistent').select('*').limit(1);
  // Expected to fail with table not found, not auth error
  if (error && error.code === '42P01') {
    console.log('Connection works (table not found as expected)');
  } else if (error) {
    console.log('Error:', error);
  } else {
    console.log('Connected');
  }
}

migrate();
