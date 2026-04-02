import { z } from 'zod';

export const ProjectStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']);
export const WorkflowStatusSchema = z.enum(['PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED']);
export const TaskStatusSchema = z.enum(['PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'BLOCKED']);
export const AgentTierSchema = z.enum(['UTILITY', 'BUILDER', 'DIRECTOR', 'SPECIALIST']);
export const AgentRunStatusSchema = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'TIMEOUT']);
export const ApprovalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']);
export const DocumentTypeSchema = z.enum(['PRD', 'SPEC', 'API_DOC', 'SOP', 'RELEASE_NOTES', 'CAMPAIGN_BRIEF', 'RESEARCH_REPORT', 'DECISION_MEMO', 'TRAINING_MODULE', 'CREATIVE_BRIEF']);
export const CampaignStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']);
export const CRMContactStatusSchema = z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED', 'REACTIVATED']);
export const ArtifactTypeSchema = z.enum(['CODE', 'DOCUMENT', 'IMAGE', 'VIDEO_SCRIPT', 'STORYBOARD', 'AD_COPY', 'LANDING_PAGE', 'EMAIL', 'SOCIAL_POST', 'TRAINING_CONTENT', 'RESEARCH', 'REPORT', 'CONFIG']);
export const PipelineTypeSchema = z.enum(['MARKET_RESEARCH', 'STRATEGIC_RECOMMENDATION', 'DEVELOPMENT', 'DOCUMENTATION', 'TESTING_QA', 'SEO', 'ADS', 'SALES_FUNNEL', 'CRM_RETENTION', 'OPTIMIZATION', 'CREATIVE_PRODUCTION', 'UI_GENERATION', 'TRAINING']);
export const NotificationChannelSchema = z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'SLACK', 'WEBHOOK']);

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type AgentTier = z.infer<typeof AgentTierSchema>;
export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export type CRMContactStatus = z.infer<typeof CRMContactStatusSchema>;
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;
export type PipelineType = z.infer<typeof PipelineTypeSchema>;
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
