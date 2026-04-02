'use client';

import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const { data: metrics, loading, error } = useApi(() => api.metrics.summary(), []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-gray-500 text-sm">Total Agents</div>
          <div className="text-3xl font-bold mt-2">{metrics?.agents || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-gray-500 text-sm">Active Projects</div>
          <div className="text-3xl font-bold mt-2">{metrics?.projects || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-gray-500 text-sm">Workflows</div>
          <div className="text-3xl font-bold mt-2">{metrics?.workflows || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-gray-500 text-sm">Total Cost</div>
          <div className="text-3xl font-bold mt-2">${metrics?.cost || 0}</div>
        </div>
      </div>
    </div>
  );
}
