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
      const selectedModel = this.router.route({
        taskDescription: task.description,
        constraints: task.constraints || {},
      });

      logger.info(`Selected model: ${selectedModel.model}`);

      // Get adapter for selected model's provider
      const adapter = this.adapters.get(selectedModel.provider);
      if (!adapter) {
        throw new Error(`No adapter registered for provider: ${selectedModel.provider}`);
      }

      // Execute via adapter
      const response = await adapter.complete({
        model: selectedModel.model,
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
        taskId: task.id,
        status: 'COMPLETED',
        output: response.content,
        model: selectedModel.model,
        provider: selectedModel.provider,
        tokensUsed: response.totalTokens,
        latencyMs: latency,
        cost: selectedModel.estimatedCost,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error(`Task failed: ${task.id}`, error);

      return {
        taskId: task.id,
        status: 'FAILED',
        output: error instanceof Error ? error.message : 'Unknown error',
        model: '',
        provider: '',
        tokensUsed: { input: 0, output: 0 },
        latencyMs: latency,
        cost: 0,
      };
    }
  }
}
