// =============================================================================
// Samar-Minime Systems — Temporal Activities (Production)
// =============================================================================
// Activities execute real LLM calls via AgentRuntime → ModelRouter → Providers.
// Each activity wraps an agent execution, S3 upload, or service call.

import { prisma } from '@samar/database';
import { getLogger } from '@samar/observability';
import { AgentRuntime } from '@samar/agent-core';
import type { AgentDefinition, AgentInput, AgentRunContext } from '@samar/agent-core';
import { ModelRouter } from '@samar/routing';
import { createProvidersFromEnv } from '@samar/providers';
import { ArtifactTypeSchema, NotificationChannelSchema, ModelSpecSchema } from '@samar/schemas';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const logger = getLogger('worker-activities');

// ── Singleton Initialization ────────────────────────────────────────────────

let _runtime: AgentRuntime | null = null;
let _s3: S3Client | null = null;

function getRuntime(): AgentRuntime {
  if (!_runtime) {
    if (!process.env.MODEL_CATALOG_JSON) throw new Error('Verified model catalog is not configured');
    const router = new ModelRouter(ModelSpecSchema.array().min(1).parse(JSON.parse(process.env.MODEL_CATALOG_JSON)));
    const providers = createProvidersFromEnv();

    _runtime = new AgentRuntime({
      router,
      providers,
      onRunStart: async (agent, input, context) => {
        logger.info({ agentId: agent.id, tier: agent.tier }, 'Agent run starting');
        return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      },
      onRunComplete: async (runId, output) => {
        logger.info({
          runId,
          model: output.modelUsed,
          tokens: output.totalTokens,
          costUsd: output.costUsd,
          latencyMs: output.latencyMs,
        }, 'Agent run completed');
      },
      onRunError: async (runId, error) => {
        logger.error({ runId, error: error.message }, 'Agent run failed');
      },
    });
  }
  return _runtime;
}

function getS3(): S3Client {
  if (!_s3) {
    if (!process.env.S3_ENDPOINT || !process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) throw new Error("Object storage is not configured");
    _s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
      region: process.env.S3_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }
  return _s3;
}

// ── Agent Execution (Real LLM Calls) ────────────────────────────────────────

export async function executeAgentTask(input: {
  agentId: string;
  prompt: string;
  projectId: string;
  workflowId: string;
  taskId: string;
  tier: string;
  maxCostUsd: number;
  requiresJson: boolean;
}): Promise<{ content: string; modelUsed: string; costUsd: number; tokens: number; latencyMs: number }> {
  logger.info({ agentId: input.agentId, taskId: input.taskId }, 'Executing agent task');

  if (process.env.ENABLE_AGENT_EXECUTION !== 'true') throw new Error('Agent execution is disabled pending scoped integration acceptance');
  const agentConfig = await prisma.agentConfig.findUnique({ where: { id: input.agentId } });

  if (!agentConfig) {
    throw new Error(`Agent config not found: ${input.agentId}`);
  }

  if (!agentConfig.enabled || !agentConfig.systemPrompt) throw new Error('Agent is disabled or instructions are missing');
  const task = await prisma.task.findUniqueOrThrow({ where: { id: input.taskId } });
  if (task.projectId !== input.projectId || task.workflowId !== input.workflowId) throw new Error('Task scope mismatch');
  const agentDef: AgentDefinition = {
    id: agentConfig.id, name: agentConfig.name, tier: agentConfig.tier,
    description: agentConfig.description ?? '', systemPrompt: agentConfig.systemPrompt,
    maxTokens: agentConfig.maxTokens, capabilities: agentConfig.capabilities,
  };

  // Create agent run record
  const agentRun = await prisma.agentRun.create({
    data: {
      taskId: input.taskId,
      agentConfigId: agentConfig.id,
      status: 'RUNNING',
      modelUsed: agentConfig.defaultModel,
      tier: agentConfig.tier,
      workflowId: input.workflowId,
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
      latencyMs: 0,
    },
  });

  try {
    // Get remaining budget for this project
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: input.projectId },
      select: { budgetLimitUsd: true, budgetUsedUsd: true },
    });

    const budgetRemaining = project.budgetLimitUsd - project.budgetUsedUsd;

    // Build agent input
    const agentInput: AgentInput = {
      prompt: input.prompt,
      maxCostUsd: Math.min(input.maxCostUsd, budgetRemaining, task.budgetLimitUsd),
      requiresJson: input.requiresJson,
    };

    // Build run context
    const context: AgentRunContext = {
      projectId: input.projectId,
      workflowId: input.workflowId,
      taskId: input.taskId,
      budgetRemainingUsd: budgetRemaining,
      retryCount: 0,
      maxRetries: 3,
    };

    // Execute real LLM call via AgentRuntime
    const runtime = getRuntime();
    const output = await runtime.execute(agentDef, agentInput, context);

    // Update agent run with real results
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'COMPLETED',
        modelUsed: output.modelUsed,
        tier: output.tier,
        totalTokens: output.totalTokens,
        output: { content: output.content },
        completedAt: new Date(),
        promptTokens: output.promptTokens,
        completionTokens: output.completionTokens,
        costUsd: output.costUsd,
        latencyMs: output.latencyMs,
      },
    });

    // Track cost record
    await prisma.costRecord.create({
      data: {
        projectId: input.projectId,
        workflowId: input.workflowId,
        taskId: input.taskId,
        agentRunId: agentRun.id,
        model: output.modelUsed,
        provider: _detectProvider(output.modelUsed),
        tier: input.tier as any,
        promptTokens: output.promptTokens,
        completionTokens: output.completionTokens,
        costUsd: output.costUsd,
      },
    });

    logger.info({
      agentId: input.agentId,
      taskId: input.taskId,
      model: output.modelUsed,
      tokens: output.totalTokens,
      costUsd: output.costUsd,
      latencyMs: output.latencyMs,
    }, 'Agent task completed');

    return {
      content: output.content,
      modelUsed: output.modelUsed,
      costUsd: output.costUsd,
      tokens: output.totalTokens,
      latencyMs: output.latencyMs,
    };
  } catch (error: any) {
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: { status: 'FAILED' },
    });

    logger.error({ agentId: input.agentId, taskId: input.taskId, error: error.message }, 'Agent task failed');
    throw error;
  }
}

// ── Artifact Persistence (Real S3 Upload) ──────────────────────────────────

export async function persistArtifact(input: {
  projectId: string;
  taskId: string;
  name: string;
  type: string;
  content: string;
}): Promise<{ artifactId: string; s3Key: string }> {
  const s3Key = `artifacts/${input.projectId}/${input.taskId}/${input.name}`;
  const bucket = process.env.S3_BUCKET ?? 'samar-artifacts';
  const contentBytes = Buffer.from(input.content, 'utf-8');

  // Upload to S3/MinIO
  try {
    const s3 = getS3();
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: contentBytes,
        ContentType: _inferContentType(input.name),
        Metadata: {
          projectId: input.projectId,
          taskId: input.taskId,
          artifactType: input.type,
        },
      }),
    );
    logger.info({ s3Key, bucket, sizeBytes: contentBytes.length }, 'Artifact uploaded to S3');
  } catch (error: any) {
    logger.error({ event: 'artifact_upload_failed' }, 'Artifact upload failed');
    throw error;
  }

  // Create DB record
  const artifact = await prisma.artifact.create({
    data: {
      taskId: input.taskId,
      name: input.name,
      type: ArtifactTypeSchema.parse(input.type),
      projectId: input.projectId,
      s3Key,
      sizeBytes: contentBytes.length,
    },
  });

  return { artifactId: artifact.id, s3Key };
}

// ── Notifications ───────────────────────────────────────────────────────────

export async function sendNotification(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
  channel: string;
  actionUrl?: string;
}): Promise<{ sent: boolean; notificationId: string }> {
  if (NotificationChannelSchema.parse(input.channel) !== 'IN_APP') throw new Error('External notification delivery is not configured');
  const notification = await prisma.notification.create({ data: {
    recipient: input.userId, subject: input.title, body: input.message, channel: 'IN_APP',
    metadata: { type: input.type, actionUrl: input.actionUrl ?? null }, sent: false,
  }});
  logger.info({ notificationId: notification.id }, 'Notification queued; delivery not verified');
  return { sent: false, notificationId: notification.id };
}

// ── Budget Checking ─────────────────────────────────────────────────────────

export async function checkBudget(input: {
  projectId: string;
}): Promise<{ budgetRemainingUsd: number; budgetLimitUsd: number; budgetUsedUsd: number; isOverBudget: boolean }> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: input.projectId },
    select: { budgetLimitUsd: true, budgetUsedUsd: true },
  });

  const remaining = project.budgetLimitUsd - project.budgetUsedUsd;

  return {
    budgetRemainingUsd: Math.max(0, remaining),
    budgetLimitUsd: project.budgetLimitUsd,
    budgetUsedUsd: project.budgetUsedUsd,
    isOverBudget: remaining <= 0,
  };
}

// ── Task Status Management ──────────────────────────────────────────────────

export async function updateTaskStatus(input: {
  taskId: string;
  status: string;
  output?: unknown;
  error?: string;
}): Promise<void> {
  const now = new Date();
  const data: any = { status: input.status };

  if (input.status === 'RUNNING') data.startedAt = now;
  if (input.status === 'COMPLETED') data.completedAt = now;
  if (input.status === 'FAILED') { data.completedAt = now; data.error = input.error; }
  if (input.output) data.output = input.output as any;

  await prisma.task.update({
    where: { id: input.taskId },
    data,
  });

  logger.info({ taskId: input.taskId, status: input.status }, 'Task status updated');
}

// ── Update Workflow Status ──────────────────────────────────────────────────

export async function updateWorkflowStatus(input: {
  workflowId: string;
  status: string;
}): Promise<void> {
  const now = new Date();
  const data: any = { status: input.status };

  if (input.status === 'RUNNING') data.startedAt = now;
  if (input.status === 'COMPLETED' || input.status === 'FAILED') data.completedAt = now;

  await prisma.workflow.update({
    where: { id: input.workflowId },
    data,
  });

  logger.info({ workflowId: input.workflowId, status: input.status }, 'Workflow status updated');
}

// ── Update Project Budget ───────────────────────────────────────────────────

export async function updateProjectBudget(input: {
  projectId: string;
  costToAdd: number;
}): Promise<void> {
  await prisma.project.update({
    where: { id: input.projectId },
    data: {
      budgetUsedUsd: { increment: input.costToAdd },
    },
  });
}

// ── Output Quality Evaluation ───────────────────────────────────────────────

export async function evaluateOutput(input: {
  agentRunId: string;
  output: string;
  criteria: string[];
}): Promise<{ score: number; feedback: string; passed: boolean }> {
  let score = 70;

  // Check content length (non-trivial output)
  if (input.output.length > 100) score += 10;
  if (input.output.length > 500) score += 5;
  if (input.output.length < 10) score -= 30;

  // Check for JSON validity if it looks like JSON
  if (input.output.trim().startsWith('{') || input.output.trim().startsWith('[')) {
    try {
      JSON.parse(input.output);
      score += 10;
    } catch {
      score -= 20;
    }
  }

  // Check for common failure patterns
  if (input.output.includes('I cannot') || input.output.includes('I am unable')) {
    score -= 15;
  }

  // Cap at 100
  score = Math.min(100, Math.max(0, score));
  const passed = score >= 60;
  const feedback = passed ? 'Output meets quality criteria' : 'Output below quality threshold';

  // Persist evaluation
  await prisma.evaluation.create({
    data: {
      agentRunId: input.agentRunId,
      criteria: input.criteria,
      scores: { heuristic: score },
      overallScore: score,
      feedback,
      evaluatedBy: 'heuristic-not-independent-qa',
    },
  });

  return { score, feedback, passed };
}

// ── Create Approval Request ─────────────────────────────────────────────────

export async function createApprovalRequest(input: {
  projectId: string;
  entityType: string;
  entityId: string;
  requestedBy: string;
  reason: string;
}): Promise<{ approvalId: string }> {
  const approval = await prisma.approval.create({
    data: {
      projectId: input.projectId,
      entityType: input.entityType,
      entityId: input.entityId,
      requestedBy: input.requestedBy,
      reason: input.reason,
      status: 'PENDING',
    },
  });

  return { approvalId: approval.id };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function _detectProvider(model: string): string {
  if (model.includes('gpt') || model.includes('o1')) return 'openai';
  if (model.includes('claude')) return 'anthropic';
  if (model.includes('llama')) return 'llama';
  return 'openai';
}

function _inferContentType(filename: string): string {
  if (filename.endsWith('.json')) return 'application/json';
  if (filename.endsWith('.md')) return 'text/markdown';
  if (filename.endsWith('.html')) return 'text/html';
  if (filename.endsWith('.csv')) return 'text/csv';
  if (filename.endsWith('.tsx') || filename.endsWith('.ts')) return 'text/typescript';
  if (filename.endsWith('.jsx') || filename.endsWith('.js')) return 'text/javascript';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  return 'text/plain';
}
