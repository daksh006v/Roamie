import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL } from './api';

let socket: Socket | null = null;
let connectingPromise: Promise<Socket> | null = null;
let currentSocketToken: string | null = null;

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
  const token = await getAuthToken();

  // If the authenticated user changed, tear down the stale socket before reconnecting
  if (socket && token !== currentSocketToken) {
    socket.disconnect();
    socket = null;
    currentSocketToken = null;
    connectingPromise = null;
  }

  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    const latestToken = token || (await getAuthToken());
    const socketUrl = getSocketUrl();
    currentSocketToken = latestToken;

    socket = io(socketUrl, {
      forceNew: true,
      auth: { token: latestToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 10000,
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
  })();

  try {
    return await connectingPromise;
  } finally {
    connectingPromise = null;
  }
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  connectingPromise = null;
  currentSocketToken = null;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
