import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import api from '../services/api';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  pushToken?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'roamie_auth_token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveToken = async (newToken: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, newToken);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    }
    setToken(newToken);
  };

  const removeToken = async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    setToken(null);
    setUser(null);
  };

  // Restore existing session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        let storedToken: string | null = null;
        if (Platform.OS === 'web') {
          storedToken = localStorage.getItem(TOKEN_KEY);
        } else {
          storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        }

        if (storedToken) {
          setToken(storedToken);
          const response = await api.get('/auth/me');
          if (response.data?.success && response.data?.data?.user) {
            setUser(response.data.data.user);
          } else {
            await removeToken();
          }
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
        await removeToken();
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success) {
        const { user: userData, token: userToken } = res.data.data;
        await saveToken(userToken);
        setUser(userData);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Login failed' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      return { success: false, message: msg };
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    try {
      const res = await api.post('/auth/register', { name, email, password, phone });
      if (res.data?.success) {
        const { user: userData, token: userToken } = res.data.data;
        await saveToken(userToken);
        setUser(userData);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Registration failed' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    await removeToken();
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const res = await api.put('/auth/profile', data);
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
        return { success: true };
      }
      return { success: false, message: 'Failed to update profile' };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Update failed';
      return { success: false, message: msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
