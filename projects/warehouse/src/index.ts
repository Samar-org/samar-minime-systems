import { createLogger } from '@samar/observability';
import { loadWarehouseConfig } from './config.js';
import { WarehouseOrchestrator } from './orchestrator.js';

const logger = createLogger('warehouse-project');

async function main() {
  try {
    logger.info('Starting Warehouse Minime System');
    const config = loadWarehouseConfig();
    const orchestrator = new WarehouseOrchestrator(config);
    await orchestrator.start();
  } catch (error) {
    logger.error('Fatal error', { error });
    process.exit(1);
  }
}

main();
