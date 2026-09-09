import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL } from './api';

let socket: Socket | null = null;

const getSocketUrl = (): string => {
  return API_URL.replace(/\/api\/?$/, '');
};

export const getAuthToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem('roamie_auth_token');
    }
    return await SecureStore.getItemAsync('roamie_auth_token');
  } catch (err) {
    console.warn('Error reading socket auth token:', err);
    return null;
  }
};

export const connectSocket = async (): Promise<Socket> => {
  if (socket && socket.connected) {
    return socket;
  }

  const token = await getAuthToken();
  const socketUrl = getSocketUrl();

  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('⚡ Socket connected to server:', socketUrl);
  });

  socket.on('connect_error', (err) => {
    console.warn('⚠️ Socket connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
