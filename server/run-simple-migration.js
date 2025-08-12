require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🚀 Running simple tracking migration...');
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '..', 'simple-tracking-migration.sql'), 
      'utf8'
    );
    
    console.log('📄 Migration SQL loaded, executing...');
    
    // Execute the migration
    const { data, error } = await supabaseAdmin.rpc('exec', { 
      query: migrationSQL 
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }
    
    console.log('✅ Migration executed successfully!');
    if (data && data.length > 0) {
      console.log('📊 Results:');
      data.forEach(row => {
        console.log('  ', row);
      });
    }
    
    // Test the new columns by querying the table structure
    console.log('\n🔍 Verifying new columns...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .select('id, response_type, departure_time, arrival_time, completion_time')
      .limit(1);
    
    if (testError) {
      console.error('❌ Column verification failed:', testError);
    } else {
      console.log('✅ New columns verified successfully!');
      console.log('🎯 Sample structure:', testData?.[0] ? Object.keys(testData[0]) : 'No data to show structure');
    }
    
  } catch (err) {
    console.error('💥 Migration error:', err);
  }
  
  process.exit(0);
}

runMigration();
