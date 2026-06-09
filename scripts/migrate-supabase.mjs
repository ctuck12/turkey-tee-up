import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const SUPABASE_URL = 'https://dqxpnqkfkzpxlivulqhe.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxeHBucWtma3pweGxpdnVscWhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk2MzE1NywiZXhwIjoyMDk2NTM5MTU3fQ.I4VAiM-4NUjlCsPj56xGiTl4xsdI-5XY0cmrCUteuxg';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxeHBucWtma3pweGxpdnVscWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NjMxNTcsImV4cCI6MjA5NjUzOTE1N30.Ynml7I10elQr9sLgayOyKiwyN9TLp3Gt7sJxrCbG5z4';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws }
});

// Hole data: pars for holes 1-18: 4,4,4,3,4,4,5,3,5,3,4,4,5,3,5,4,3,4
// CTP holes: 4, 8, 10, 14, 17 (all par 3s)
const HOLE_PARS = [4,4,4,3,4,4,5,3,5,3,4,4,5,3,5,4,3,4];
const CTP_HOLES = new Set([4, 8, 10, 14, 17]);
const CTP_LABELS = { 4: 'CTP Hole 1', 8: 'CTP Hole 2', 10: 'CTP Hole 3', 14: 'CTP Hole 4', 17: 'CTP Hole 5' };

async function run() {
  console.log('🔌 Connecting to Supabase...');

  // 1. Test connection
  const { error: testErr } = await supabase.from('tournament_settings').select('id').limit(1);
  if (testErr && testErr.code !== 'PGRST116' && testErr.code !== '42P01') {
    console.log('❌ Connection error:', testErr.message);
    // Still proceed — tables might not exist yet
  } else {
    console.log('✅ Connected!');
  }

  // 2. Seed tournament settings
  console.log('\n📋 Seeding tournament settings...');
  const { error: settingsErr } = await supabase
    .from('tournament_settings')
    .upsert({
      id: 1,
      tournament_name: 'Abilene Turkey Drive Golf Tournament',
      year: 2025,
      course_holes: 18,
      admin_password: 'atdadmin2025',
      scorekeeper_password: 'atd2025',
      is_active: true
    }, { onConflict: 'id' });
  if (settingsErr) console.log('  Settings error:', settingsErr.message);
  else console.log('  ✅ Settings seeded');

  // 3. Seed holes
  console.log('\n⛳ Seeding holes...');
  const { count } = await supabase.from('holes').select('*', { count: 'exact', head: true });
  if (count > 0) {
    console.log(`  ℹ️  Holes already seeded (${count} rows), skipping`);
  } else {
    const holeRows = HOLE_PARS.map((par, i) => ({
      hole_number: i + 1,
      par,
      handicap: i + 1,
      yardage_blue: 0,
      yardage_white: 0,
      yardage_red: 0,
      is_ctp_hole: CTP_HOLES.has(i + 1),
      ctp_label: CTP_LABELS[i + 1] || null
    }));
    const { error: holesErr } = await supabase.from('holes').insert(holeRows);
    if (holesErr) console.log('  Holes error:', holesErr.message);
    else console.log(`  ✅ ${holeRows.length} holes seeded`);
  }

  console.log('\n🎉 Migration complete!');
  console.log('\nNext: update the app to use Supabase instead of SQLite.');
}

run().catch(console.error);
