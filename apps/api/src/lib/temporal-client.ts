import { Client, Connection } from '@temporalio/client';

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? 'samar-minime';
const TASK_QUEUE = 'samar-minime-main';

let _client: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (_client) return _client;

  const connection = await Connection.connect({ address: TEMPORAL_ADDRESS });
  _client = new Client({ connection, namespace: TEMPORAL_NAMESPACE });
  return _client;
}

export type WorkflowType =
  | 'pipelineWorkflow'
  | 'marketResearchWorkflow'
  | 'creativeWorkflow'
  | 'uiGenerationWorkflow'
  | 'adsWorkflow'
  | 'seoWorkflow';

export async function startWorkflow<T>(
  workflowType: WorkflowType,
  args: unknown[]
): Promise<string> {
  const client = await getTemporalClient();
  const handle = await client.workflow.start(workflowType, {
    args,
    taskQueue: TASK_QUEUE,
  });
  return handle.workflowId;
}

export async function getWorkflowResult(workflowId: string): Promise<unknown> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);
  return await handle.result();
}
