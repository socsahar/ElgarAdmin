require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function checkLogs() {
  try {
    console.log('🔍 Checking recent logs...');
    
    // Get recent logs
    const { data: recentLogs, error } = await supabaseAdmin
      .from('logs')
      .select('level, message, source, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error fetching logs:', error);
      return;
    }
    
    console.log('\n📋 Recent logs:');
    recentLogs.forEach((log, index) => {
      const emoji = log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : 'ℹ️';
      console.log(`${index + 1}. ${emoji} [${log.level.toUpperCase()}] ${log.message} (${log.source}) - ${log.created_at}`);
    });
    
    // Get log counts by level in last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: allLogs, error: countError } = await supabaseAdmin
      .from('logs')
      .select('level')
      .gte('created_at', last24Hours.toISOString());
    
    if (!countError && allLogs) {
      const counts = allLogs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📊 Log counts (last 24 hours):');
      Object.entries(counts).forEach(([level, count]) => {
        const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
        console.log(`${emoji} ${level}: ${count}`);
      });
      
      const total = allLogs.length;
      const errors = counts.error || 0;
      const warnings = counts.warn || 0;
      const errorRate = total > 0 ? ((errors + warnings * 0.5) / total) : 0;
      
      console.log(`\n📈 Error rate: ${(errorRate * 100).toFixed(1)}% (${errors} errors + ${warnings} warnings out of ${total} total logs)`);
    }
    
  } catch (error) {
    console.error('Error checking logs:', error);
  }
  
  process.exit(0);
}

checkLogs();
