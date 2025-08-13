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
const vehiclesRoutes = require('./routes/vehicles');

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
  uploadRoutes = require('./routes/upload-supabase');
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

// Trust proxy for rate limiting (needed when behind reverse proxy/load balancer)
app.set('trust proxy', 1);

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
app.use('/api/vehicles', vehiclesRoutes);

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
  },
  // Render optimization settings
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  // Better handling for Render's infrastructure
  upgradeTimeout: 30000,
  // Allow more time for connections on free tier
  connectTimeout: 60000
});

// Make io instance available to routes
app.set('io', io);

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
        phone_number: userData.phone_number,
        photo_url: userData.photo_url,
        has_car: userData.has_car,
        car_type: userData.car_type,
        license_plate: userData.license_plate,
        car_color: userData.car_color,
        connectedAt: new Date().toISOString()
      };
      
      // Add to online users
      onlineUsers.set(socket.id, socket.userInfo);
      
      // Join admin room
      socket.join('admin-room');
      
      // Broadcast updated online users list to all admins with location data
      try {
        const onlineUsersList = Array.from(onlineUsers.values());
        const userIds = onlineUsersList.map(user => user.id);
        
        if (userIds.length > 0) {
          // Fetch location data for online users
          const { data: usersWithLocation, error } = await supabaseAdmin
            .from('users')
            .select('id, last_latitude, last_longitude, last_location_update')
            .in('id', userIds);
          
          if (!error && usersWithLocation) {
            // Merge location data with online users info
            const enrichedUsers = onlineUsersList.map(user => {
              const locationData = usersWithLocation.find(u => u.id === user.id);
              return {
                ...user,
                last_latitude: locationData?.last_latitude,
                last_longitude: locationData?.last_longitude,
                last_location_update: locationData?.last_location_update
              };
            });
            
            io.to('admin-room').emit('online-users-updated', enrichedUsers);
            console.log(`👥 Online users count: ${enrichedUsers.length} (with location data)`);
          } else {
            // Fallback to users without location data
            io.to('admin-room').emit('online-users-updated', onlineUsersList);
            console.log(`👥 Online users count: ${onlineUsersList.length} (without location data)`);
          }
        } else {
          io.to('admin-room').emit('online-users-updated', []);
        }
      } catch (locationError) {
        console.error('Error fetching user locations:', locationError);
        // Fallback to basic user data
        const onlineUsersList = Array.from(onlineUsers.values());
        io.to('admin-room').emit('online-users-updated', onlineUsersList);
        console.log(`👥 Online users count: ${onlineUsersList.length} (fallback)`);
      }
    } catch (error) {
      console.error('Error handling admin join:', error);
    }
  });

  // Handle manual request for online users
  socket.on('get-online-users', async () => {
    try {
      console.log('📡 Client requesting online users list');
      
      // Get online users with location data from database
      const onlineUsersList = Array.from(onlineUsers.values());
      const userIds = onlineUsersList.map(user => user.id);
      
      if (userIds.length > 0) {
        // Fetch location data for online users
        const { data: usersWithLocation, error } = await supabaseAdmin
          .from('users')
          .select('id, last_latitude, last_longitude, last_location_update')
          .in('id', userIds);
        
        if (!error && usersWithLocation) {
          // Merge location data with online users info
          const enrichedUsers = onlineUsersList.map(user => {
            const locationData = usersWithLocation.find(u => u.id === user.id);
            return {
              ...user,
              last_latitude: locationData?.last_latitude,
              last_longitude: locationData?.last_longitude,
              last_location_update: locationData?.last_location_update
            };
          });
          
          socket.emit('online-users-updated', enrichedUsers);
          console.log(`📤 Sent ${enrichedUsers.length} online users with location data to client`);
        } else {
          // Fallback to users without location data
          socket.emit('online-users-updated', onlineUsersList);
          console.log(`📤 Sent ${onlineUsersList.length} online users without location data to client`);
        }
      } else {
        socket.emit('online-users-updated', []);
        console.log('📤 Sent empty online users list to client');
      }
    } catch (error) {
      console.error('Error sending online users:', error);
      socket.emit('online-users-updated', Array.from(onlineUsers.values()));
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

    // Graceful shutdown handlers - moved inside startServer to access server variable
    let isShuttingDown = false;
    
    const shutdown = (signal) => {
      if (isShuttingDown) {
        console.log(`⚠️  ${signal} received again, forcing exit...`);
        process.exit(1);
        return;
      }
      
      isShuttingDown = true;
      console.log(`📴 ${signal} received, shutting down gracefully`);
      
      // Close the HTTP server
      server.close((err) => {
        if (err) {
          console.error('❌ Error during server shutdown:', err);
          process.exit(1);
        }
        
        console.log('✅ Server closed');
        
        // Close socket.io connections
        io.close(() => {
          console.log('✅ Socket.io connections closed');
          process.exit(0);
        });
      });
      
      // Force exit after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        console.log('⚠️  Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
