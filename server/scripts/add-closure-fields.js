const { supabaseAdmin } = require('../config/supabase');

async function addClosureFields() {
  console.log('Adding closure fields to events table...');
  
  try {
    // Check if columns already exist
    const { data: columns, error: checkError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'events')
      .eq('table_schema', 'public')
      .in('column_name', ['closure_reason', 'closed_at', 'closed_by_id']);

    if (checkError) {
      console.error('Error checking existing columns:', checkError);
      process.exit(1);
    }

    const existingColumns = columns.map(col => col.column_name);
    console.log('Existing closure columns:', existingColumns);

    if (existingColumns.includes('closure_reason')) {
      console.log('✅ Closure fields already exist in the database');
      return;
    }

    // Since we can't run DDL directly through Supabase client, 
    // we need to use the SQL editor in Supabase dashboard
    console.log('❌ Cannot execute DDL statements through Supabase client.');
    console.log('');
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('-- Add closure reason fields to events table');
    console.log('ALTER TABLE public.events');
    console.log('ADD COLUMN closure_reason text,');
    console.log('ADD COLUMN closed_at timestamp with time zone,');
    console.log('ADD COLUMN closed_by_id uuid references public.users(id);');
    console.log('');
    console.log('-- Add comments for documentation');
    console.log("COMMENT ON COLUMN public.events.closure_reason IS 'סיבת סגירת האירוע';");
    console.log("COMMENT ON COLUMN public.events.closed_at IS 'תאריך וזמן סגירת האירוע';");
    console.log("COMMENT ON COLUMN public.events.closed_by_id IS 'המשתמש שסגר את האירוע';");
    console.log('');
    console.log('🔗 Go to: https://app.supabase.com/project/[YOUR_PROJECT_ID]/sql');
    
  } catch (error) {
    console.error('Error during migration check:', error.message);
    process.exit(1);
  }
}

// Run the migration check
addClosureFields().then(() => {
  console.log('Migration check completed!');
  process.exit(0);
});
