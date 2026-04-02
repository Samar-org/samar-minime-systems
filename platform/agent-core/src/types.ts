export interface AgentCapability {
  name: string;
  version: string;
  description: string;
}

export interface AgentState {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'paused' | 'error';
  currentTask?: {
    id: string;
    startedAt: Date;
    progress: number; // 0-100
  };
  lastExecuted?: Date;
  successCount: number;
  errorCount: number;
}

export interface AgentMetrics {
  totalTasksExecuted: number;
  successRate: number;
  averageLatency: number;
  totalCost: number;
  tokenUsagePattern: {
    inputTokens: number;
    outputTokens: number;
  };
}
