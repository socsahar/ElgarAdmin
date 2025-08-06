const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL environment variable is missing');
  throw new Error('SUPABASE_URL is required');
}

if (!supabaseAnonKey) {
  console.error('❌ SUPABASE_ANON_KEY environment variable is missing');
  throw new Error('SUPABASE_ANON_KEY is required');
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is missing');
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.error('❌ Invalid SUPABASE_URL format. Expected: https://xxx.supabase.co');
  throw new Error('Invalid SUPABASE_URL format');
}

console.log('✅ Supabase environment variables validated');
console.log('🔗 Connecting to:', supabaseUrl);

// Client for regular operations (with RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false
  },
  global: {
    headers: {
      'User-Agent': 'ElgarAdmin/1.0.0'
    }
  }
});

// Admin client for operations that bypass RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'User-Agent': 'ElgarAdmin-Admin/1.0.0'
    }
  }
});

module.exports = {
  supabase,
  supabaseAdmin
};
