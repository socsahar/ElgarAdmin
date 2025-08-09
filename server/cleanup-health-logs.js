require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function cleanupHealthLogs() {
  try {
    console.log('🧹 Cleaning up health check error logs...');
    
    // Delete health check logs
    const { error: deleteError, count } = await supabaseAdmin
      .from('logs')
      .delete({ count: 'exact' })
      .or(
        'message.like.%בדיקת בריאות מערכת%,' +
        'message.like.%health_check%,' +
        'metadata->>system_event.eq.health_check,' +
        'metadata->>system_event.eq.health_check_failed'
      );
    
    if (deleteError) {
      console.error('❌ Error deleting health logs:', deleteError);
      return;
    }
    
    console.log(`✅ Deleted ${count} health check logs`);
    
    // Check remaining log distribution
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: remainingLogs, error: countError } = await supabaseAdmin
      .from('logs')
      .select('level')
      .gte('created_at', last24Hours.toISOString());
    
    if (!countError && remainingLogs) {
      const counts = remainingLogs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📊 Remaining log counts (last 24 hours):');
      Object.entries(counts).forEach(([level, count]) => {
        const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
        console.log(`${emoji} ${level}: ${count}`);
      });
      
      const total = remainingLogs.length;
      const errors = counts.error || 0;
      const warnings = counts.warn || 0;
      const errorRate = total > 0 ? ((errors + warnings * 0.5) / total) : 0;
      
      console.log(`\n📈 New error rate: ${(errorRate * 100).toFixed(1)}% (${errors} errors + ${warnings} warnings out of ${total} total logs)`);
    }
    
  } catch (error) {
    console.error('❌ Error cleaning logs:', error);
  }
  
  process.exit(0);
}

cleanupHealthLogs();
