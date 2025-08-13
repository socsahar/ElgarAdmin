import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useSnackbar } from 'notistack';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [lastUserData, setLastUserData] = useState(null);

  useEffect(() => {
    if (user) {
      // Only create new socket if user changed or no socket exists
      const userChanged = !lastUserData || lastUserData.id !== user.id;
      
      if (userChanged || !socket) {
        console.log('🔌 Creating persistent socket connection for user:', user.username);
        setConnecting(true);
        
        // Clean up existing socket if it exists
        if (socket) {
          socket.disconnect();
        }
        
        const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://elgaradmin-backend.onrender.com';
        const newSocket = io(SOCKET_URL, {
          auth: {
            userId: user.id,
            role: user.role
          },
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 3000, // Longer delay for Render's infrastructure
          reconnectionAttempts: 15, // More attempts for free tier
          timeout: 60000, // Much longer timeout for Render
          forceNew: false,
          // Use polling first for better Render compatibility
          transports: ['polling', 'websocket'],
          upgrade: true,
          // Render-specific optimizations
          closeOnBeforeunload: false,
          // Additional options for Render stability
          rememberUpgrade: false,
          maxHttpBufferSize: 1e6,
          pingTimeout: 60000,
          pingInterval: 25000
        });

        newSocket.on('connect', () => {
          console.log('✅ Connected to server with persistent connection');
          setConnected(true);
          setConnecting(false);
          
          // Join admin room for real-time updates with user details
          const userData = {
            id: user.id,
            userId: user.id, 
            role: user.role,
            username: user.username,
            full_name: user.full_name,
            id_number: user.id_number,
            phone_number: user.phone_number,
            photo_url: user.photo_url,
            has_car: user.has_car,
            car_type: user.car_type,
            license_plate: user.license_plate,
            car_color: user.car_color,
            // Add persistent connection flag
            persistentConnection: true
          };
          
          newSocket.emit('join-admin', userData);
          
          // Request current online users immediately after joining
          setTimeout(() => {
            console.log('📡 Requesting online users after persistent connection');
            newSocket.emit('get-online-users');
          }, 1000); // Slightly longer delay for stability
        });

        newSocket.on('disconnect', (reason) => {
          console.log('❌ Disconnected from server:', reason);
          setConnected(false);
          
          // Don't clear online users immediately - keep them for better UX
          if (reason === 'transport error' || reason === 'ping timeout') {
            console.log('� Network issue detected, maintaining user list during reconnection');
          } else {
            setOnlineUsers([]);
          }
          
          // Don't set connecting to false immediately for better UX
          setTimeout(() => {
            if (!connected) {
              setConnecting(false);
            }
          }, 3000);
        });

        // Enhanced reconnection handling
        newSocket.on('reconnect', (attemptNumber) => {
          console.log('🔄 Reconnected after', attemptNumber, 'attempts with persistent connection');
          setConnected(true);
          setConnecting(false);
          
          // Re-join admin room with persistent flag
          const userData = {
            id: user.id,
            userId: user.id, 
            role: user.role,
            username: user.username,
            full_name: user.full_name,
            id_number: user.id_number,
            phone_number: user.phone_number,
            photo_url: user.photo_url,
            has_car: user.has_car,
            car_type: user.car_type,
            license_plate: user.license_plate,
            car_color: user.car_color,
            persistentConnection: true,
            reconnection: true
          };
          
          newSocket.emit('join-admin', userData);
          
          setTimeout(() => {
            newSocket.emit('get-online-users');
          }, 1000);
        });

        // Handle reconnection attempts
        newSocket.on('reconnect_attempt', (attemptNumber) => {
          console.log('🔄 Reconnection attempt', attemptNumber);
          setConnecting(true);
        });

        newSocket.on('reconnect_error', (error) => {
          console.warn('⚠️ Reconnection error:', error);
        });

        newSocket.on('reconnect_failed', () => {
          console.error('❌ Failed to reconnect after maximum attempts');
          setConnecting(false);
        });

        // Handle force disconnect from admin
        newSocket.on('force-disconnect', (data) => {
          console.log('🔌 Force disconnected:', data);
          alert(data.message || 'חיבורך נותק על ידי מנהל המערכת');
          
          // Force logout
          localStorage.removeItem('token');
          window.location.href = '/login';
        });

        // Handle online users updates with better state management
        newSocket.on('online-users-updated', (users) => {
          console.log('👥 Received online users update:', users?.length || 0);
          // Only update if we have a significant change to prevent unnecessary re-renders
          setOnlineUsers(prevUsers => {
            if (!users) return prevUsers;
            
            // Simple comparison - update if count changed significantly
            if (Math.abs(prevUsers.length - users.length) > 0) {
              return users;
            }
            
            // Check if any user IDs changed
            const prevIds = new Set(prevUsers.map(u => u.id));
            const newIds = new Set(users.map(u => u.id));
            
            if (prevIds.size !== newIds.size || 
                [...prevIds].some(id => !newIds.has(id))) {
              return users;
            }
            
            return prevUsers; // No significant change
          });
        });

        // Real-time event listeners
        newSocket.on('event-created', (data) => {
          enqueueSnackbar(`אירוע חדש נוצר: ${data.event.title}`, { 
            variant: 'info',
            autoHideDuration: 5000 
          });
        });

        newSocket.on('event-updated', (data) => {
          enqueueSnackbar(`אירוע עודכן: ${data.event.title}`, { 
            variant: 'info',
            autoHideDuration: 5000 
          });
        });

        newSocket.on('user-marked-out', (data) => {
          enqueueSnackbar(`${data.attendance.user.name} סומן כיוצא`, { 
            variant: 'warning',
            autoHideDuration: 7000 
          });
        });

        newSocket.on('emergency-alert', (data) => {
          enqueueSnackbar(`🚨 התראת חירום: ${data.emergency.message}`, { 
            variant: 'error',
            autoHideDuration: 10000,
            persist: true
          });
        });

        newSocket.on('notification-sent', (data) => {
          enqueueSnackbar(`הודעה נשלחה ל-${data.notification.recipientCount} משתמשים`, { 
            variant: 'success',
            autoHideDuration: 5000 
          });
        });

        newSocket.on('event-status-changed', (data) => {
          enqueueSnackbar(`סטטוס אירוע השתנה: ${data.event.title}`, { 
            variant: 'info',
            autoHideDuration: 5000 
          });
        });

        setSocket(newSocket);
        setLastUserData(user);

        // Enhanced cleanup with better connection management
        return () => {
          console.log('🧹 Cleaning up socket connection');
          if (newSocket) {
            // Emit leave-admin before disconnecting for cleaner server-side handling
            newSocket.emit('leave-admin', { userId: user.id });
            
            setTimeout(() => {
              newSocket.disconnect();
            }, 100); // Small delay to ensure leave-admin is sent
          }
          setConnecting(false);
          setConnected(false);
        };
      } else {
        console.log('👤 User unchanged, keeping existing socket connection');
      }
    } else {
      // User logged out - clean disconnect
      if (socket) {
        console.log('👋 User logged out, disconnecting socket');
        socket.emit('leave-admin', { userId: lastUserData?.id });
        socket.disconnect();
        setSocket(null);
      }
      setConnecting(false);
      setConnected(false);
      setOnlineUsers([]);
      setLastUserData(null);
    }
  }, [user, enqueueSnackbar, socket, lastUserData]);

  const requestOnlineUsers = () => {
    if (socket && connected) {
      console.log('🔄 Manually requesting online users');
      socket.emit('get-online-users');
    } else {
      console.log('⚠️ Cannot request online users - socket not ready');
    }
  };

  const value = {
    socket,
    connected,
    connecting,
    onlineUsers,
    requestOnlineUsers,
    emit: (event, data) => socket?.emit(event, data),
    on: (event, callback) => socket?.on(event, callback),
    off: (event, callback) => socket?.off(event, callback),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
