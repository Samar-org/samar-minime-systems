'use client';

import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { useState, useMemo } from 'react';

const TIER_COLORS: Record<string, string> = {
  DIRECTOR: 'bg-purple-100 text-purple-800',
  BUILDER: 'bg-blue-100 text-blue-800',
  UTILITY: 'bg-green-100 text-green-800',
  SPECIALIST: 'bg-amber-100 text-amber-800',
};

const TIER_LABELS: Record<string, string> = {
  DIRECTOR: 'Director',
  BUILDER: 'Builder',
  UTILITY: 'Utility',
  SPECIALIST: 'Specialist',
};

interface Agent {
  id: string;
  name: string;
  tier: string;
  modelId: string;
  config?: Record<string, unknown>;
}

interface TierStats {
  tier: string;
  _count: number;
  _sum: { costUsd: number | null; totalTokens: number | null };
  _avg: { latencyMs: number | null; qualityScore: number | null };
}

export default function AgentsPage() {
  const { data: agents, loading: agentsLoading, error: agentsError } = useApi(() => api.agents.list(), []);
  const { data: tierData, loading: tierLoading, error: tierError } = useApi(() => api.agents.tierSummary(), []);

  const groupedAgents = useMemo(() => {
    if (!agents) return {};
    const grouped: Record<string, Agent[]> = {};
    (agents as Agent[]).forEach(agent => {
      if (!grouped[agent.tier]) grouped[agent.tier] = [];
      grouped[agent.tier].push(agent);
    });
    return grouped;
  }, [agents]);

  if (agentsLoading || tierLoading) return <div>Loading...</div>;
  if (agentsError || tierError) return <div>Error loading agents</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Agents</h1>
      {(tierData as TierStats[] || []).map((tier) => (
        <div key={tier.tier} className="mb-12">
          <h2 className="text-xl font-semibold mb-4">{TIER_LABELS[tier.tier] || tier.tier}</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded border border-gray-200">
              <div className="text-gray-500 text-sm">Count</div>
              <div className="text-2xl font-bold">{tier._count}</div>
            </div>
            <div className="bg-white p-4 rounded border border-gray-200">
              <div className="text-gray-500 text-sm">Avg Latency</div>
              <div className="text-2xl font-bold">{(tier._avg.latencyMs || 0).toFixed(0)}ms</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {(groupedAgents[tier.tier] || []).map(agent => (
              <div key={agent.id} className="bg-white p-4 rounded border border-gray-200">
                <div className={`inline-block px-3 py-1 rounded text-sm ${TIER_COLORS[tier.tier]}`}>
                  {TIER_LABELS[tier.tier]}
                </div>
                <h3 className="font-semibold mt-2">{agent.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{agent.modelId}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
