import { createLogger } from '@samar/observability';
import type { WarehouseConfig } from './config.js';
import { sopGenerationPipeline } from './pipelines/sop-generation.pipeline.js';
import { onboardingPackPipeline } from './pipelines/onboarding-pack.pipeline.js';

const logger = createLogger('warehouse-orchestrator');

export class WarehouseOrchestrator {
  constructor(private config: WarehouseConfig) {}

  async start() {
    logger.info('Warehouse Orchestrator starting', { projectId: this.config.projectId });

    // Start listening for events
    this.startEventListeners();
  }

  private startEventListeners() {
    logger.info('Starting event listeners');

    // Example: trigger SOP generation
    this.triggerSOPGeneration({
      processName: 'Customer Onboarding',
      department: 'Sales',
      complexity: 'medium',
    });
  }

  private async triggerSOPGeneration(process: any) {
    logger.info('Triggering SOP generation', { process });
    await sopGenerationPipeline(this.config, process);
  }
}
