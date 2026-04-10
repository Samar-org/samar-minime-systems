import { AgentRunResult } from '@samar/schemas';
import { ProviderAdapter } from '@samar/providers';
import { ModelRouter } from '@samar/routing';
import { getLogger } from '@samar/observability';
import { getConfig } from '@samar/config';

const logger = getLogger('agent-runtime');

export interface AgentTask {
  id: string;
  description: string;
  constraints?: {
    maxTokens?: number;
    maxCost?: number;
    maxLatency?: number;
  };
}

export class AgentRuntime {
  private router: ModelRouter;
  private adapters: Map<string, ProviderAdapter> = new Map();

  constructor(router: ModelRouter) {
    this.router = router;
  }

  registerAdapter(provider: string, adapter: ProviderAdapter): void {
    this.adapters.set(provider, adapter);
  }

  async executeTask(task: AgentTask): Promise<AgentRunResult> {
    const startTime = Date.now();

    try {
      logger.info(`Executing task: ${task.id}`);

      // Select best model for task
      const decision = this.router.route({
        taskType: task.description,
        maxCostUsd: task.constraints?.maxCost,
      });

      logger.info(`Selected model: ${decision.model.name}`);

      // Get adapter for selected model's provider
      const adapter = this.adapters.get(decision.model.provider);
      if (!adapter) {
        throw new Error(`No adapter registered for provider: ${decision.model.provider}`);
      }

      // Execute via adapter
      const response = await adapter.complete({
        model: decision.model.id,
        messages: [
          {
            role: 'user',
            content: task.description,
          },
        ],
        maxTokens: task.constraints?.maxTokens,
      });

      const latency = Date.now() - startTime;

      return {
        agentRunId: task.id,
        status: 'COMPLETED',
        modelUsed: decision.model.name,
        tier: decision.model.tier,
        promptTokens: response.promptTokens || 0,
        completionTokens: response.completionTokens || 0,
        totalTokens: response.totalTokens || 0,
        costUsd: decision.estimatedCostUsd,
        latencyMs: latency,
        output: response.content,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error(`Task failed: ${task.id}`, error);

      return {
        agentRunId: task.id,
        status: 'FAILED',
        modelUsed: '',
        tier: 'UNKNOWN',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        latencyMs: latency,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
