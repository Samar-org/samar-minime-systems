import { z } from 'zod';

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(['email', 'sms', 'push', 'in-app']),
  title: z.string(),
  message: z.string(),
  read: z.boolean().default(false),
  createdAt: z.date()
});

export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationChannelSchema = z.object({
  userId: z.string(),
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
  inApp: z.boolean()
});

export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

/** Required by the future authoritative notification outbox bridge. */
export interface NotificationScope {
  projectId: string;
  environment: 'development' | 'staging' | 'production';
}
export interface CreateNotificationInput extends NotificationScope {
  userId: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'SLACK' | 'WEBHOOK';
  title: string;
  message: string;
  type?: string;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}
export interface NotificationFilter {
  read?: boolean;
  channel?: CreateNotificationInput['channel'];
  type?: string;
  priority?: CreateNotificationInput['priority'];
}
export interface Pagination { page: number; limit: number; }
