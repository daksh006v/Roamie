const cron = require('node-cron');
const ItineraryItem = require('../models/ItineraryItem');
const RoomMember = require('../models/RoomMember');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendPushNotifications } = require('./pushNotificationService');

/**
 * Scheduled job to check upcoming itinerary activities and fire reminders
 */
const initReminderCron = () => {
  // Run every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      const now = new Date();
      const nextWindow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour ahead

      // Find items that have reminders, not yet sent, within date window
      const pendingItems = await ItineraryItem.find({
        reminderMinutesBefore: { $ne: null, $gt: 0 },
        reminderSent: false,
        isCompleted: false,
        date: {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      }).populate('roomId', 'name destination');

      for (const item of pendingItems) {
        if (!item.startTime) continue;

        const [hours, minutes] = item.startTime.split(':').map(Number);
        const itemDateTime = new Date(item.date);
        itemDateTime.setHours(hours, minutes, 0, 0);

        const reminderTime = new Date(
          itemDateTime.getTime() - item.reminderMinutesBefore * 60 * 1000
        );

        const currentTime = new Date();

        if (currentTime >= reminderTime && currentTime < itemDateTime) {
          // Time to trigger reminder!
          const members = await RoomMember.find({ roomId: item.roomId._id });
          const userIds = members.map((m) => m.userId);
          const users = await User.find({ _id: { $in: userIds }, pushToken: { $ne: '' } });

          const pushMessages = [];
          for (const user of users) {
            pushMessages.push({
              to: user.pushToken,
              sound: 'default',
              title: `🗓️ Upcoming: ${item.title}`,
              body: `${item.title} starts in ${item.reminderMinutesBefore} minutes at ${item.startTime} (${item.roomId?.name || 'Trip'})`,
              data: {
                type: 'itinerary_reminder',
                roomId: item.roomId._id.toString(),
                itemId: item._id.toString(),
              },
            });

            // Save in-app notification
            await Notification.create({
              recipientId: user._id,
              roomId: item.roomId._id,
              type: 'itinerary_reminder',
              title: `Upcoming: ${item.title}`,
              body: `${item.title} in ${item.reminderMinutesBefore}m`,
              data: { itemId: item._id },
            });
          }

          if (pushMessages.length > 0) {
            await sendPushNotifications(pushMessages);
          }

          item.reminderSent = true;
          await item.save();
        }
      }
    } catch (error) {
      console.error('Error running itinerary reminder cron:', error);
    }
  });
  console.log('⏰ Itinerary Reminder Cron initialized');
};

module.exports = { initReminderCron };
