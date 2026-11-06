const API_BASE = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// These routes remain unavailable until the scoped backend is configured.
export const api = {
  projects: {list: () => apiFetch('/projects')},
  workflows: {list: () => apiFetch('/workflows')},
  campaigns: {list: () => apiFetch('/campaigns')},
  crm: {list: () => apiFetch('/crm')},
  creative: {list: () => apiFetch('/creative')},
  metrics: {summary: () => apiFetch<{agents:number;projects:number;workflows:number;cost:number}>('/metrics/summary'),costs: () => apiFetch('/metrics/costs')},
  agents: {
    list: () => apiFetch('/agents'),
    tierSummary: () => apiFetch('/agents/tier-summary'),
  },
  approvals: {
    list: () => apiFetch('/approvals'),
    approve: (id: string) => apiFetch(`/approvals/${id}/approve`, { method: 'POST' }),
  },
};
