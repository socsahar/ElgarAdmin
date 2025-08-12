require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function runSimpleMigration() {
  try {
    console.log('🚀 Running simple tracking migration...');
    
    // Check if columns already exist
    console.log('🔍 Checking existing columns...');
    const { data: existingData, error: existingError } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .select('*')
      .limit(1);
    
    if (existingError) {
      console.error('❌ Error checking existing table:', existingError);
      return;
    }
    
    const existingColumns = existingData?.[0] ? Object.keys(existingData[0]) : [];
    console.log('📄 Current columns:', existingColumns.join(', '));
    
    // Check if tracking columns exist
    const trackingColumns = ['response_type', 'departure_time', 'arrival_time', 'completion_time'];
    const missingColumns = trackingColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('✅ All tracking columns already exist!');
      return;
    }
    
    console.log('⚠️ Missing columns:', missingColumns.join(', '));
    console.log('🛠️ Need to add columns using Supabase SQL Editor manually');
    console.log('\n📋 SQL to run in Supabase SQL Editor:');
    console.log('```sql');
    console.log('-- Add tracking columns to event_volunteer_assignments table');
    console.log('ALTER TABLE public.event_volunteer_assignments');
    console.log('ADD COLUMN IF NOT EXISTS response_type TEXT DEFAULT \'assigned\',');
    console.log('ADD COLUMN IF NOT EXISTS departure_time TIMESTAMP WITH TIME ZONE,');
    console.log('ADD COLUMN IF NOT EXISTS departure_latitude DECIMAL(10,8),');
    console.log('ADD COLUMN IF NOT EXISTS departure_longitude DECIMAL(11,8),');
    console.log('ADD COLUMN IF NOT EXISTS arrival_time TIMESTAMP WITH TIME ZONE,');
    console.log('ADD COLUMN IF NOT EXISTS arrival_latitude DECIMAL(10,8),');
    console.log('ADD COLUMN IF NOT EXISTS arrival_longitude DECIMAL(11,8),');
    console.log('ADD COLUMN IF NOT EXISTS completion_time TIMESTAMP WITH TIME ZONE,');
    console.log('ADD COLUMN IF NOT EXISTS completion_latitude DECIMAL(10,8),');
    console.log('ADD COLUMN IF NOT EXISTS completion_longitude DECIMAL(11,8);');
    console.log('');
    console.log('-- Add constraint for response_type values');
    console.log('ALTER TABLE public.event_volunteer_assignments');
    console.log('DROP CONSTRAINT IF EXISTS event_volunteer_assignments_response_type_check;');
    console.log('');
    console.log('ALTER TABLE public.event_volunteer_assignments');
    console.log('ADD CONSTRAINT event_volunteer_assignments_response_type_check');
    console.log('CHECK (response_type IN (\'assigned\', \'departure\', \'arrived_at_scene\', \'task_completed\', \'cancelled\'));');
    console.log('```');
    
    console.log('\n🌐 Go to: https://supabase.com/dashboard/project/smchvtbqzqssywlgshjj/sql/new');
    console.log('📝 Copy and paste the SQL above, then run it');
    
  } catch (err) {
    console.error('💥 Error:', err);
  }
  
  process.exit(0);
}

runSimpleMigration();
