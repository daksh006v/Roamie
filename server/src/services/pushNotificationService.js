const { Expo } = require('expo-server-sdk');

const expo = new Expo();

/**
 * Send push notifications to Expo push tokens
 */
const sendPushNotifications = async (messages) => {
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending push notification chunk:', error);
    }
  }

  return tickets;
};

/**
 * Helper to build and send push message to specific user's token
 */
const sendUserNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
    return null;
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  return await sendPushNotifications([message]);
};

module.exports = {
  sendPushNotifications,
  sendUserNotification,
};
