export interface TaskRunResult {
  taskId: string;
  status: 'success' | 'failure';
  error?: string;
  output?: unknown;
  duration: number;
}

export interface WorkflowRunResult {
  workflowId: string;
  status: 'success' | 'failure';
  taskResults: TaskRunResult[];
  duration: number;
}
