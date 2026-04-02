import { z } from 'zod';

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Customer = z.infer<typeof CustomerSchema>;

export const InteractionSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  type: z.enum(['email', 'call', 'meeting', 'note']),
  content: z.string(),
  timestamp: z.date()
});

export type Interaction = z.infer<typeof InteractionSchema>;
