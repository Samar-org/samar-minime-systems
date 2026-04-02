import { prisma } from '@samar/database';
import { createLogger } from '@samar/observability';

const logger = createLogger('worker-activities');

export async function executeAgentTask(input: {
  agentId: string;
  prompt: string;
  projectId: string;
}): Promise<{
  agentId: string;
  projectId: string;
  result: string;
  tokensUsed: number;
  costUsd: number;
  completedAt: string;
}> {
  logger.info(`Executing agent task`, { agentId: input.agentId, projectId: input.projectId });

  // Simulate agent execution
  const tokensUsed = Math.floor(Math.random() * 5000) + 1000;
  const costUsd = (tokensUsed / 1000) * 0.002;

  // Record execution in database
  await prisma.agentExecution.create({
    data: {
      agentId: input.agentId,
      projectId: input.projectId,
      prompt: input.prompt,
      result: `Generated result for: ${input.prompt}`,
      tokensUsed,
      costUsd,
    },
  });

  return {
    agentId: input.agentId,
    projectId: input.projectId,
    result: `Completed agent task`,
    tokensUsed,
    costUsd,
    completedAt: new Date().toISOString(),
  };
}

export async function saveWorkflowResult(input: {
  workflowId: string;
  result: unknown;
  status: 'completed' | 'failed';
}): Promise<void> {
  logger.info(`Saving workflow result`, { workflowId: input.workflowId, status: input.status });

  await prisma.workflow.update({
    where: { id: input.workflowId },
    data: {
      status: input.status,
      result: input.result as any,
      completedAt: new Date(),
    },
  });
}

export async function updateProjectMetrics(input: {
  projectId: string;
  metrics: Record<string, unknown>;
}): Promise<void> {
  logger.info(`Updating project metrics`, { projectId: input.projectId });

  await prisma.project.update({
    where: { id: input.projectId },
    data: {
      metrics: input.metrics,
      lastUpdated: new Date(),
    },
  });
}

export async function notifyStakeholders(input: {
  projectId: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
}): Promise<void> {
  logger.info(`Notifying stakeholders`, { projectId: input.projectId, priority: input.priority });

  // Send notification (e.g., email, Slack, etc.)
  logger.info(`Would send notification: ${input.message}`);
}
