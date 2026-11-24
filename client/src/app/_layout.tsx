import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppAlertHost, showAppAlert } from '../components/AppAlertHost';
import {
  registerForPushNotificationsAsync,
  setupNotificationListeners,
} from '../services/notificationService';
import { setupDeepLinkListeners } from '../services/deepLinkService';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppServicesSync() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    // 1. Register push token with backend profile
    registerForPushNotificationsAsync().catch(() => {});

    // 2. Handle push notification interaction
    const cleanupNotifications = setupNotificationListeners(
      undefined,
      (data) => {
        if (data.roomId) {
          router.push({ pathname: '/room/[id]', params: { id: data.roomId } } as any);
        }
      }
    );

    // 3. Handle incoming deep links (roamie://join?code=... or roamie://room/...)
    const cleanupDeepLinks = setupDeepLinkListeners({
      onJoinCode: (code) => {
        router.push({ pathname: '/rooms', params: { joinCode: code } } as any);
      },
      onOpenRoom: (roomId) => {
        router.push({ pathname: '/room/[id]', params: { id: roomId } } as any);
      },
    });

    return () => {
      cleanupNotifications();
      cleanupDeepLinks();
    };
  }, [user]);

  return null;
}

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
        <AppServicesSync />
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
