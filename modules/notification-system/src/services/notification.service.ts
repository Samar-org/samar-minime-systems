import { Notification, NotificationSchema, NotificationChannel, NotificationChannelSchema } from '../models/notification.types';

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private channels: Map<string, NotificationChannel> = new Map();

  sendNotification(notification: Notification): void {
    const validated = NotificationSchema.parse(notification);
    this.notifications.set(validated.id, validated);
  }

  getUserNotifications(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter(
      n => n.userId === userId
    );
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  setChannelPreferences(channel: NotificationChannel): void {
    const validated = NotificationChannelSchema.parse(channel);
    this.channels.set(validated.userId, validated);
  }
}
