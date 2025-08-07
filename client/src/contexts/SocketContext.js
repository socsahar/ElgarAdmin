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
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (user) {
      const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
      const newSocket = io(SOCKET_URL, {
        auth: {
          userId: user.id,
          role: user.role
        },
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to server');
        setConnected(true);
        
        // Join admin room for real-time updates with user details
        newSocket.emit('join-admin', { 
          id: user.id,
          userId: user.id, 
          role: user.role,
          username: user.username,
          full_name: user.full_name,
          id_number: user.id_number,
          photo_url: user.photo_url
        });
        
        // Request current online users immediately after joining
        setTimeout(() => {
          console.log('📡 Requesting online users after connection');
          newSocket.emit('get-online-users');
        }, 500);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from server:', reason);
        setConnected(false);
        setOnlineUsers([]);
      });

      // Handle force disconnect from admin
      newSocket.on('force-disconnect', (data) => {
        console.log('🔌 Force disconnected:', data);
        alert(data.message || 'חיבורך נותק על ידי מנהל המערכת');
        
        // Force logout
        localStorage.removeItem('token');
        window.location.href = '/login';
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Reconnected after', attemptNumber, 'attempts');
        setConnected(true);
        
        // Re-join admin room and request online users
        newSocket.emit('join-admin', { 
          id: user.id,
          userId: user.id, 
          role: user.role,
          username: user.username,
          full_name: user.full_name,
          id_number: user.id_number,
          photo_url: user.photo_url
        });
        
        setTimeout(() => {
          newSocket.emit('get-online-users');
        }, 500);
      });

      // Handle online users updates
      newSocket.on('online-users-updated', (users) => {
        console.log('👥 Received online users update:', users?.length || 0);
        setOnlineUsers(users || []);
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

      return () => {
        newSocket.close();
      };
    }
  }, [user, enqueueSnackbar]);

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
