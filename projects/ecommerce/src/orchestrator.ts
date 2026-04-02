import { createLogger } from '@samar/observability';
import type { EcommerceConfig } from './config.js';
import { productLaunchPipeline } from './pipelines/product-launch.pipeline.js';
import { campaignLaunchPipeline } from './pipelines/campaign-launch.pipeline.js';
import { contentCalendarPipeline } from './pipelines/content-calendar.pipeline.js';

const logger = createLogger('ecommerce-orchestrator');

export class EcommerceOrchestrator {
  constructor(private config: EcommerceConfig) {}

  async start() {
    logger.info('Ecommerce Orchestrator starting', { projectId: this.config.projectId });

    // Start listening for events
    this.startEventListeners();
  }

  private startEventListeners() {
    logger.info('Starting event listeners');

    // Example: trigger product launch pipeline
    this.triggerProductLaunch({
      productName: 'New Product',
      description: 'Amazing new product',
      price: 99.99,
      category: 'Electronics',
    });
  }

  private async triggerProductLaunch(product: any) {
    logger.info('Triggering product launch', { product });
    await productLaunchPipeline(this.config, product);
  }
}
