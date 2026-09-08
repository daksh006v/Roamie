import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Dynamically resolves the development API URL:
 * 1. Checks EXPO_PUBLIC_API_URL environment variable.
 * 2. On Web, defaults to http://localhost:5000/api.
 * 3. On mobile devices (Expo Go / physical phone / emulator), extracts the
 *    packager host IP from Constants.expoConfig?.hostUri so phones on Wi-Fi
 *    can reach the backend server on the development machine.
 * 4. Falls back to the machine's LAN IP (192.168.1.93).
 */
const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5000/api`;
    }
  }
  return 'http://192.168.1.93:5000/api';
};

export const API_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT auth token
api.interceptors.request.use(
  async (config) => {
    try {
      let token: string | null = null;
      if (Platform.OS === 'web') {
        token = localStorage.getItem('roamie_auth_token');
      } else {
        token = await SecureStore.getItemAsync('roamie_auth_token');
      }

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Error reading auth token:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
