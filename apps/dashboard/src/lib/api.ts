const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiClient {
  agents: {
    list: () => Promise<unknown>;
    tierSummary: () => Promise<unknown>;
  };
  projects: {
    list: () => Promise<unknown>;
  };
  workflows: {
    list: () => Promise<unknown>;
  };
  campaigns: {
    list: () => Promise<unknown>;
  };
  creative: {
    list: () => Promise<unknown>;
  };
  crm: {
    list: () => Promise<unknown>;
  };
  approvals: {
    list: () => Promise<unknown>;
    approve: (id: string) => Promise<unknown>;
  };
  metrics: {
    summary: () => Promise<unknown>;
    costs: () => Promise<unknown>;
  };
}

export const api: ApiClient = {
  agents: {
    list: async () => {
      const res = await fetch(`${BASE_URL}/agents`);
      return res.json();
    },
    tierSummary: async () => {
      const res = await fetch(`${BASE_URL}/agents/tiers`);
      return res.json();
    },
  },
  projects: {
    list: async () => {
      const res = await fetch(`${BASE_URL}/projects`);
      return res.json();
    },
  },
  workflows: {
    list: async () => {
      const res = await fetch(`${BASE_URL}/workflows`);
      return res.json();
    },
  },
  campaigns: {
    list: async () => {
      const res = await fetch(`${BASE_URL}/campaigns`);
      return res.json();
    },
  },
  creative: {
    list: async () => {
      const res = await fetch(`${BASE_URL}/creative`);
      return res.json();
    },
  },
  crm: {
    list: async () => {
      const res = await fetch(`${BASE_URL}/crm`);
      return res.json();
    },
  },
  approvals: {
    list: async () => {
      const res = await fetch(`${BASE_URL}/approvals`);
      return res.json();
    },
    approve: async (id: string) => {
      const res = await fetch(`${BASE_URL}/approvals/${id}`, {
        method: 'POST',
      });
      return res.json();
    },
  },
  metrics: {
    summary: async () => {
      const res = await fetch(`${BASE_URL}/metrics/summary`);
      return res.json();
    },
    costs: async () => {
      const res = await fetch(`${BASE_URL}/metrics/costs`);
      return res.json();
    },
  },
};
