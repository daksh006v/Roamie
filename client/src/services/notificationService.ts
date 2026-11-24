import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';

// Configure foreground notification presentation options
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPayloadData {
  type?: string;
  roomId?: string;
  itemId?: string;
  expenseId?: string;
  senderName?: string;
  [key: string]: any;
}

/**
 * Requests push notification permissions and registers the Expo push token
 * with the backend via PUT /api/auth/profile
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Roamie Trip Updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#243C32',
      });
    }

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token: permission not granted.');
      return null;
    }

    // Resolve projectId from Constants if available
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    token = tokenData.data;

    if (token) {
      // Register push token with backend profile
      await api.put('/auth/profile', { pushToken: token });
      console.log('✅ Push notification token registered with backend:', token);
    }
  } catch (error) {
    console.warn('Error obtaining or registering push token:', error);
  }

  return token;
}

/**
 * Subscribes to foreground notifications and user tap response interactions
 * Returns a cleanup unsubscribe callback
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (data: NotificationPayloadData) => void
): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      onNotificationReceived?.(notification);
    }
  );

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content
        .data as NotificationPayloadData;
      if (data) {
        onNotificationTapped?.(data);
      }
    }
  );

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
