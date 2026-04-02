import { z } from 'zod';

export const EventTypeSchema = z.enum([
  'PAGE_VIEW',
  'CLICK',
  'CONVERSION',
  'FORM_SUBMISSION',
  'VIDEO_VIEW',
  'DOWNLOAD',
  'SHARE',
  'CUSTOM'
]);

export const EventSchema = z.object({
  id: z.string(),
  type: EventTypeSchema,
  userId: z.string().optional(),
  sessionId: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
  properties: z.record(z.any()).optional()
});

export const MetricSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  timestamp: z.date(),
  dimension: z.record(z.string()).optional()
});

export const AnalyticsReportSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  period: z.object({
    startDate: z.date(),
    endDate: z.date()
  }),
  events: z.array(EventSchema),
  metrics: z.array(MetricSchema),
  summary: z.object({
    totalEvents: z.number(),
    uniqueUsers: z.number(),
    conversionRate: z.number()
  })
});

export type EventType = z.infer<typeof EventTypeSchema>;
export type Event = z.infer<typeof EventSchema>;
export type Metric = z.infer<typeof MetricSchema>;
export type AnalyticsReport = z.infer<typeof AnalyticsReportSchema>;
