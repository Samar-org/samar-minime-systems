import { getLogger } from './logger';

const logger = getLogger('metrics');

export interface Metrics {
  tasksCompleted: number;
  tasksFailedCount: number;
  averageTaskDuration: number;
  totalTokensUsed: number;
}

let metrics: Metrics = {
  tasksCompleted: 0,
  tasksFailedCount: 0,
  averageTaskDuration: 0,
  totalTokensUsed: 0,
};

export function getMetrics(): Metrics {
  return { ...metrics };
}

export function recordTaskCompletion(duration: number): void {
  metrics.tasksCompleted++;
  metrics.averageTaskDuration =
    (metrics.averageTaskDuration * (metrics.tasksCompleted - 1) + duration) / metrics.tasksCompleted;
  logger.debug('Task completed', { duration, avg: metrics.averageTaskDuration });
}

export function recordTaskFailure(): void {
  metrics.tasksFailedCount++;
  logger.debug('Task failed', { totalFailed: metrics.tasksFailedCount });
}

export function recordTokenUsage(tokens: number): void {
  metrics.totalTokensUsed += tokens;
}
