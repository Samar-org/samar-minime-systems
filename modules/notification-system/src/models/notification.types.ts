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
