export interface ClientPortalProject {
  id: string;
  name: string;
  clients: string[];
  config: {
    reportingFrequency: 'daily' | 'weekly' | 'monthly';
    slaMetrics: string[];
    supportTier: 'standard' | 'premium' | 'enterprise';
  };
}

export interface Client {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'paused' | 'churned';
  since: string;
}

export interface ClientReport {
  id: string;
  clientId: string;
  period: string;
  metrics: Record<string, unknown>;
  insights: string[];
  generatedAt: string;
}

export interface SLAMetric {
  id: string;
  name: string;
  target: number;
  actual: number;
  status: 'on-track' | 'at-risk' | 'breached';
}
