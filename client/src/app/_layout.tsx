import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../context/AuthContext';
import { AppAlertHost, showAppAlert } from '../components/AppAlertHost';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after initialization
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    const nativeAlert = Alert.alert;
    Alert.alert = showAppAlert as typeof Alert.alert;
    return () => {
      Alert.alert = nativeAlert;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppAlertHost />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="rooms" options={{ headerShown: false }} />
          <Stack.Screen name="create-room" options={{ headerShown: false }} />
          <Stack.Screen name="room/[id]" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
