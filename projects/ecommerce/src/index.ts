import { createLogger } from '@samar/observability';
import { loadEcommerceConfig } from './config.js';
import { EcommerceOrchestrator } from './orchestrator.js';

const logger = createLogger('ecommerce-project');

async function main() {
  try {
    logger.info('Starting Ecommerce Minime System');
    const config = loadEcommerceConfig();
    const orchestrator = new EcommerceOrchestrator(config);
    await orchestrator.start();
  } catch (error) {
    logger.error('Fatal error', { error });
    process.exit(1);
  }
}

main();
