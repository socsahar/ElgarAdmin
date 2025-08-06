const { supabaseAdmin } = require('../config/supabase');

class Logger {
  static async log(level, message, source = 'Web', userId = null, metadata = {}) {
    try {
      // Ensure source is valid according to database constraint
      const validSources = ['App', 'Web'];
      const finalSource = validSources.includes(source) ? source : 'Web';
      
      const logEntry = {
        level,
        message,
        source: finalSource,
        user_id: userId,
        metadata: typeof metadata === 'object' ? metadata : {},
        created_at: new Date().toISOString()
      };

      const { error } = await supabaseAdmin
        .from('logs')
        .insert([logEntry]);

      if (error) {
        console.error('❌ כשל ברישום לוג:', error);
        // Fallback to console logging
        console.log(`[${level.toUpperCase()}] ${finalSource}: ${message}`);
      }
    } catch (err) {
      console.error('❌ שגיאה ברישום לוג:', err);
      // Fallback to console logging
      console.log(`[${level.toUpperCase()}] ${source}: ${message}`);
    }
  }

  static async info(message, source = 'Web', userId = null, metadata = {}) {
    return this.log('info', message, source, userId, metadata);
  }

  static async warn(message, source = 'Web', userId = null, metadata = {}) {
    return this.log('warn', message, source, userId, metadata);
  }

  static async error(message, source = 'Web', userId = null, metadata = {}) {
    return this.log('error', message, source, userId, metadata);
  }

  static async debug(message, source = 'Web', userId = null, metadata = {}) {
    return this.log('debug', message, source, userId, metadata);
  }

  static async logAPI(method, url, statusCode, duration, userId = null, metadata = {}) {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    const message = `${method} ${url} - ${statusCode} (${duration}ms)`;
    
    const apiMetadata = {
      ...metadata,
      method,
      url,
      status_code: statusCode,
      duration_ms: duration,
      api_call: true
    };

    return this.log(level, message, 'Web', userId, apiMetadata); // Changed from 'API' to 'Web'
  }

  static async logAuth(action, userId, success = true, metadata = {}) {
    const level = success ? 'info' : 'warn';
    const message = `${action} ${success ? 'הצליח' : 'נכשל'}${userId ? ` למשתמש ${userId}` : ''}`;
    
    const authMetadata = {
      ...metadata,
      auth_action: action,
      success,
      user_id: userId
    };

    return this.log(level, message, 'Web', userId, authMetadata); // Changed from 'Auth' to 'Web'
  }

  static async logSystem(event, metadata = {}) {
    const message = `אירוע מערכת: ${event}`;
    
    const systemMetadata = {
      ...metadata,
      system_event: event,
      timestamp: new Date().toISOString()
    };

    return this.log('info', message, 'Web', null, systemMetadata); // Changed from 'System' to 'Web'
  }
}

module.exports = Logger;
