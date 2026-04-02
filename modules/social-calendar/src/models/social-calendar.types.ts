import { z } from 'zod';

export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  platforms: z.array(z.enum(['twitter', 'instagram', 'facebook', 'linkedin'])),
  createdAt: z.date()
});

export type CalendarEvent = z.infer<typeof EventSchema>;

export const CalendarSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  events: z.array(EventSchema),
  createdAt: z.date()
});

export type Calendar = z.infer<typeof CalendarSchema>;
