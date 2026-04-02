import { Worker } from '@temporalio/worker';
import * as activities from './activities.js';
 import * as workflows from './workflows.js';
import { createLogger } from '@samar/observability';

const logger = createLogger('temporal-worker');

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? 'samar-minime';
const TASK_QUEUE = process.env.TASK_QUEUE ?? 'samar-minime-main';

async function run() {
  const worker = await Worker.create({
    workflowsPath: new URL('./workflows.js', import.meta.url).pathname,
    activitiesPath: new URL('./activities.js', import.meta.url).pathname,
    taskQueue: TASK_QUEUE,
    namespace: TEMPORAL_NAMESPACE,
    serverOptions: {
      address: TEMPORAL_ADDRESS,
    },
  });

  logger.info(`Worker started on task queue: ${TASK_QUEUE}`);
  await worker.run();
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});
