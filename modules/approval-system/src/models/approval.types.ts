import { z } from 'zod';

export const ApprovalStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED'
]);

export const ApprovalRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  requiresCount: z.number().min(1),
  roles: z.array(z.string()),
  description: z.string().optional()
});

export const ApprovalRequestSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  contentType: z.string(),
  status: ApprovalStatusSchema,
  requestedBy: z.string(),
  requestedAt: z.date(),
  approvals: z.array(z.object({
    approvedBy: z.string(),
    status: ApprovalStatusSchema,
    comment: z.string().optional(),
    approvedAt: z.date().optional()
  }))
});

export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
export type ApprovalRule = z.infer<typeof ApprovalRuleSchema>;
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
