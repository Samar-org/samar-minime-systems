import { createLogger } from '@samar/observability';
import { loadClientPortalConfig } from './config.js';
import { ClientPortalOrchestrator } from './orchestrator.js';

const logger = createLogger('client-portal-project');

async function main() {
  try {
    logger.info('Starting Client Portal Minime System');
    const config = loadClientPortalConfig();
    const orchestrator = new ClientPortalOrchestrator(config);
    await orchestrator.start();
  } catch (error) {
    logger.error('Fatal error', { error });
    process.exit(1);
  }
}

main();
