const { supabaseAdmin } = require('../config/supabase');

class HealthMonitor {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.checkIntervalMs = 5 * 60 * 1000; // 5 minutes
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
      
      // Check recent error rates
      const last24Hours = new Date(checkTime.getTime() - 24 * 60 * 60 * 1000);
      const { data: recentLogs, error: logsError } = await supabaseAdmin
        .from('logs')
        .select('level')
        .gte('created_at', last24Hours.toISOString());
      
      let healthStatus = 'healthy';
      let errorRate = 0;
      let totalLogs = 0;
      
      if (!logsError && recentLogs) {
        totalLogs = recentLogs.length;
        const errorLogs = recentLogs.filter(log => log.level === 'error').length;
        const warnLogs = recentLogs.filter(log => log.level === 'warn').length;
        
        errorRate = totalLogs > 0 ? ((errorLogs + warnLogs * 0.5) / totalLogs) : 0;
        
        // Determine health status
        if (!dbHealthy || errorRate > 0.1 || errorLogs > 50) {
          healthStatus = 'critical';
        } else if (errorRate > 0.05 || errorLogs > 20 || dbTime > 2000) {
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
