import { createLogger } from '@samar/observability';
import type { MarketplaceConfig } from './config.js';
import { vendorOnboardingPipeline } from './pipelines/vendor-onboarding.pipeline.js';
import { marketplaceGrowthPipeline } from './pipelines/marketplace-growth.pipeline.js';

const logger = createLogger('marketplace-orchestrator');

export class MarketplaceOrchestrator {
  constructor(private config: MarketplaceConfig) {}

  async start() {
    logger.info('Marketplace Orchestrator starting', { projectId: this.config.projectId });

    // Start listening for events
    this.startEventListeners();
  }

  private startEventListeners() {
    logger.info('Starting event listeners');

    // Example: trigger vendor onboarding
    this.triggerVendorOnboarding({
      vendorName: 'New Vendor',
      email: 'vendor@example.com',
      category: 'Electronics',
    });
  }

  private async triggerVendorOnboarding(vendor: any) {
    logger.info('Triggering vendor onboarding', { vendor });
    await vendorOnboardingPipeline(this.config, vendor);
  }
}
