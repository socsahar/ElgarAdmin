require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function checkSchema() {
  try {
    console.log('🔍 Checking event_volunteer_assignments table structure...');
    
    // Get table structure
    const { data: columns, error: colError } = await supabaseAdmin
      .rpc('exec', { 
        query: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'event_volunteer_assignments' 
          ORDER BY ordinal_position
        ` 
      });
    
    if (colError) {
      console.error('❌ Error getting columns:', colError);
    } else {
      console.log('✅ Current table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    // Check for specific tracking columns
    const trackingColumns = [
      'response_type', 'departure_time', 'arrival_time', 'completion_time',
      'departure_latitude', 'departure_longitude', 'arrival_latitude', 
      'arrival_longitude', 'completion_latitude', 'completion_longitude'
    ];
    
    console.log('\n🔍 Checking for tracking columns:');
    for (const col of trackingColumns) {
      const exists = columns.some(c => c.column_name === col);
      console.log(`  - ${col}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }
    
    // Get a sample row to see current structure
    const { data: sample, error: sampleError } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.log('\n⚠️ Could not get sample data:', sampleError.message);
    } else if (sample && sample.length > 0) {
      console.log('\n📄 Sample data structure:');
      console.log(Object.keys(sample[0]).join(', '));
    } else {
      console.log('\n📄 Table exists but is empty');
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
  process.exit(0);
}

checkSchema();
