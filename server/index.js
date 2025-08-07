const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

// Fix SSL certificate issues for corporate networks/firewalls
// This resolves the "unable to get local issuer certificate" error
// that prevents event synchronization between website and mobile app
if (process.env.NODE_ENV === 'development') {
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
  console.log('🔒 SSL certificate validation disabled for development environment');
}

// Import Supabase client
const { supabase, supabaseAdmin } = require('./config/supabase');

// Import database setup functions
const { migrateDatabase } = require('./scripts/migrateDatabase');
const createDefaultAdmin = require('./scripts/createDefaultAdmin');
const { initializeLogs } = require('./scripts/initializeLogs');
const { initializeSupabaseStorage } = require('./scripts/initializeStorage');
const { healthMonitor } = require('./utils/healthMonitor');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const attendanceRoutes = require('./routes/attendance');
const volunteerRoutes = require('./routes/volunteers');
const volunteerAssignmentRoutes = require('./routes/volunteer-assignments');
const permissionsRoutes = require('./routes/permissions');
const analyticsRoutes = require('./routes/analytics');
const actionReportsRoutes = require('./routes/action-reports');

// Check if all required routes exist
const fs = require('fs');
const path = require('path');

const requiredRoutes = [
  './routes/auth.js',
  './routes/admin.js', 
  './routes/volunteers.js',
  './routes/volunteer-assignments.js',
  './routes/permissions.js'
];

requiredRoutes.forEach(route => {
  if (!fs.existsSync(path.join(__dirname, route))) {
    console.warn(`⚠️ Warning: Route file ${route} not found`);
  }
});

// Additional routes that may exist
let userRoutes, uploadRoutes, debugRoutes;
try {
  userRoutes = require('./routes/users');
} catch (error) {
  console.warn('⚠️ Warning: users route not found');
}

try {
  uploadRoutes = require('./routes/upload');
} catch (error) {
  console.warn('⚠️ Warning: upload route not found');
}

try {
  debugRoutes = require('./routes/debug');
} catch (error) {
  console.warn('⚠️ Warning: debug route not found');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for uploaded images
app.use('/uploads', express.static('uploads'));

// Logging middleware for API requests
const authLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - start;
    const userId = req.user?.id || null;
    
    // Log API request (skip health checks and static files)
    if (!req.path.includes('/health') && !req.path.includes('/uploads')) {
      console.log(`📡 API: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms) - User: ${userId || 'Anonymous'}`);
    }
  });
  
  next();
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// API documentation setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Elgar Car Theft Tracking API',
      version: '1.0.0',
      description: 'Hebrew RTL Car Theft Tracking System API Documentation',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Elgar Admin Server',
    version: '1.0.0'
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Elgar Car Theft Tracking Server',
    status: 'Running',
    documentation: '/api/docs'
  });
});

// API Routes
app.use('/api/auth', authLogger, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/volunteer-assignments', volunteerAssignmentRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/action-reports', actionReportsRoutes);

// Optional routes (only if they exist)
if (userRoutes) {
  app.use('/api/users', userRoutes);
}
if (uploadRoutes) {
  app.use('/api/upload', uploadRoutes);
}
if (debugRoutes) {
  app.use('/api/debug', debugRoutes);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Server Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Socket.io setup for real-time features
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.CLIENT_URL
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store online users
const onlineUsers = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Handle admin user joining
  socket.on('join-admin', async (userData) => {
    try {
      console.log('🔐 Admin joining:', userData?.username || 'Unknown');
      
      // Store user information
      socket.userInfo = {
        id: userData.id,
        username: userData.username,
        full_name: userData.full_name,
        role: userData.role,
        id_number: userData.id_number,
        photo_url: userData.photo_url
      };
      
      // Add to online users
      onlineUsers.set(socket.id, socket.userInfo);
      
      // Join admin room
      socket.join('admin-room');
      
      // Broadcast updated online users list to all admins
      const onlineUsersList = Array.from(onlineUsers.values());
      io.to('admin-room').emit('online-users-updated', onlineUsersList);
      
      console.log(`👥 Online users count: ${onlineUsersList.length}`);
    } catch (error) {
      console.error('Error handling admin join:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
    
    // Remove from online users
    onlineUsers.delete(socket.id);
    
    // Broadcast updated online users list
    const onlineUsersList = Array.from(onlineUsers.values());
    io.to('admin-room').emit('online-users-updated', onlineUsersList);
    
    console.log(`👥 Online users count: ${onlineUsersList.length}`);
  });
});

// Database initialization and server startup
async function startServer() {
  try {
    console.log('🔍 Checking database connection...');
    console.log('📊 Environment check:');
    console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
    console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('- PORT:', process.env.PORT || 5000);
    
    // More robust database connection test
    try {
      console.log('🔗 Testing Supabase connection...');
      
      // First try a simple health check
      const { data: healthData, error: healthError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (healthError) {
        console.error('❌ Database health check failed:', healthError);
        
        // Try with admin client as fallback
        console.log('🔄 Trying with admin client...');
        const { data: adminData, error: adminError } = await supabaseAdmin
          .from('users')
          .select('id')
          .limit(1);
          
        if (adminError) {
          console.error('❌ Admin client also failed:', adminError);
          throw new Error(`Database connection failed: ${adminError.message}`);
        }
        
        console.log('✅ Admin client connection successful');
      } else {
        console.log('✅ Regular client connection successful');
      }
      
    } catch (dbError) {
      console.error('❌ Database connection test failed:', dbError.message);
      console.error('🔧 Troubleshooting suggestions:');
      console.error('1. Verify Supabase project is not paused');
      console.error('2. Check environment variables are correctly set');
      console.error('3. Verify Supabase URL format: https://xxx.supabase.co');
      console.error('4. Ensure keys are valid and not expired');
      
      // Don't exit in production, let server start anyway
      if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️ Starting server without database connection verification in production');
      } else {
        throw dbError;
      }
    }
    
    console.log('✅ Database connection verified');

    // Initialize default admin if needed
    await createDefaultAdmin();
    
    // Initialize logs table
    await initializeLogs();
    
    // Initialize Supabase Storage
    await initializeSupabaseStorage();
    
    // Start health monitoring
    healthMonitor.start();
    
    // Start server
    server.listen(PORT, () => {
      console.log('🚀 Elgar Admin Server running on port ' + PORT);
      console.log('📚 API Documentation: http://localhost:' + PORT + '/api/docs');
      console.log('🏥 Health Check: http://localhost:' + PORT + '/health');
      console.log('🌐 CORS enabled for:', [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.CLIENT_URL
      ].filter(Boolean).join(', '));
      console.log('📡 WebSocket server ready for real-time features');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = app;
