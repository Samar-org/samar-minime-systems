import { createLogger } from '@samar/observability';
import type { ClientPortalConfig } from './config.js';
import { clientOnboardingPipeline } from './pipelines/client-onboarding.pipeline.js';
import { reportingPipeline } from './pipelines/reporting.pipeline.js';

const logger = createLogger('client-portal-orchestrator');

export class ClientPortalOrchestrator {
  constructor(private config: ClientPortalConfig) {}

  async start() {
    logger.info('Client Portal Orchestrator starting', { projectId: this.config.projectId });

    // Start listening for events
    this.startEventListeners();
  }

  private startEventListeners() {
    logger.info('Starting event listeners');

    // Example: trigger client onboarding
    this.triggerClientOnboarding({
      clientName: 'New Client Inc',
      tier: 'premium',
      industry: 'Technology',
    });
  }

  private async triggerClientOnboarding(client: any) {
    logger.info('Triggering client onboarding', { client });
    await clientOnboardingPipeline(this.config, client);
  }
}
