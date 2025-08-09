const { supabaseAdmin } = require('../config/supabase');

class HealthMonitor {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.checkIntervalMs = 15 * 60 * 1000; // 15 minutes (less frequent)
    this.lastHealthStatus = null; // Track last status to avoid spam
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  מערכת ניטור הבריאות כבר פועלת');
      return;
    }

    console.log('🏥 מתחיל מערכת ניטור בריאות...');
    this.isRunning = true;
    
    // Run initial check
    this.performHealthCheck();
    
    // Set up periodic checks
    this.interval = setInterval(() => {
      this.performHealthCheck();
    }, this.checkIntervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('🛑 מערכת ניטור הבריאות הופסקה');
  }

  async performHealthCheck() {
    try {
      const checkTime = new Date();
      console.log(`🔍 מבצע בדיקת בריאות: ${checkTime.toLocaleString('he-IL')}`);
      
      // Check database connectivity
      const dbStart = Date.now();
      const { data: dbTest, error: dbError } = await supabaseAdmin
        .from('logs')
        .select('*', { count: 'exact', head: true });
      
      const dbTime = Date.now() - dbStart;
      const dbHealthy = !dbError && dbTime < 5000; // Healthy if responds within 5 seconds
      
      // Check recent error rates (excluding health check logs to avoid infinite loop)
      const last24Hours = new Date(checkTime.getTime() - 24 * 60 * 60 * 1000);
      const { data: recentLogs, error: logsError } = await supabaseAdmin
        .from('logs')
        .select('level, message, metadata')
        .gte('created_at', last24Hours.toISOString())
        .not('message', 'like', '%בדיקת בריאות מערכת%')  // Exclude health check logs
        .not('message', 'like', '%health_check%')        // Exclude English health check logs
        .not('metadata->system_event', 'eq', 'health_check'); // Exclude by metadata
      
      let healthStatus = 'healthy';
      let errorRate = 0;
      let totalLogs = 0;
      
      if (!logsError && recentLogs) {
        totalLogs = recentLogs.length;
        const errorLogs = recentLogs.filter(log => log.level === 'error').length;
        const warnLogs = recentLogs.filter(log => log.level === 'warn').length;
        
        errorRate = totalLogs > 0 ? ((errorLogs + warnLogs * 0.5) / totalLogs) : 0;
        
        // More reasonable thresholds for a development environment
        if (!dbHealthy || errorRate > 0.3 || errorLogs > 10) {
          healthStatus = 'critical';
        } else if (errorRate > 0.15 || errorLogs > 5 || dbTime > 3000) {
          healthStatus = 'warning';
        }
      }
      
      // Log health check results
      const healthMetadata = {
        system_event: 'health_check',
        health_status: healthStatus,
        database_response_time: dbTime,
        database_healthy: dbHealthy,
        error_rate: errorRate,
        total_logs_24h: totalLogs,
        check_timestamp: checkTime.toISOString()
      };
      
      // Only log health check if status changed or if critical
      const shouldLog = healthStatus !== this.lastHealthStatus || healthStatus === 'critical';
      
      if (shouldLog) {
        // Insert health log
        const healthLogLevel = healthStatus === 'critical' ? 'error' : 
                              healthStatus === 'warning' ? 'warn' : 'info';
        
        const healthMessage = `בדיקת בריאות מערכת: ${healthStatus === 'healthy' ? 'מערכת תקינה' : 
                              healthStatus === 'warning' ? 'אזהרה במערכת' : 'מערכת במצב קריטי'}`;
        
        await supabaseAdmin
          .from('logs')
          .insert([{
            level: healthLogLevel,
            message: healthMessage,
            source: 'Web', // Changed from 'HealthMonitor' to match constraint
            user_id: null,
            metadata: healthMetadata
          }]);
      }
      
      this.lastHealthStatus = healthStatus;
      
      console.log(`📊 בדיקת בריאות הושלמה: ${healthStatus} (${Math.round(errorRate * 100)}% שגיאות, ${dbTime}ms DB)`);
      
    } catch (error) {
      console.error('❌ שגיאה בבדיקת בריאות:', error);
      
      // Log the health check failure
      try {
        await supabaseAdmin
          .from('logs')
          .insert([{
            level: 'error',
            message: 'כשל בבדיקת בריאות המערכת',
            source: 'Web', // Changed from 'HealthMonitor' to match constraint
            user_id: null,
            metadata: {
              system_event: 'health_check_failed',
              error: error.message,
              check_timestamp: new Date().toISOString()
            }
          }]);
      } catch (logError) {
        console.error('❌ כשל נוסף ברישום שגיאת בדיקת בריאות:', logError);
      }
    }
  }
}

const healthMonitor = new HealthMonitor();

module.exports = { healthMonitor };
