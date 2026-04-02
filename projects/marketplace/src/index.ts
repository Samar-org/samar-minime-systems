import { createLogger } from '@samar/observability';
import { loadMarketplaceConfig } from './config.js';
import { MarketplaceOrchestrator } from './orchestrator.js';

const logger = createLogger('marketplace-project');

async function main() {
  try {
    logger.info('Starting Marketplace Minime System');
    const config = loadMarketplaceConfig();
    const orchestrator = new MarketplaceOrchestrator(config);
    await orchestrator.start();
  } catch (error) {
    logger.error('Fatal error', { error });
    process.exit(1);
  }
}

main();
