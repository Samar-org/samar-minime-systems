'use client';

import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';

interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export default function CostsPage() {
  const { data: costs, loading, error } = useApi(() => api.metrics.costs(), []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const total = (costs as CostBreakdown[] || []).reduce((sum, c) => sum + c.amount, 0);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Costs</h1>
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-8">
        <div className="text-gray-600 text-sm">Total Monthly Cost</div>
        <div className="text-4xl font-bold text-blue-600 mt-2">${total.toFixed(2)}</div>
      </div>
      <div className="space-y-4">
        {(costs as CostBreakdown[] || []).map((cost, idx) => (
          <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{cost.category}</span>
              <span className="text-lg font-bold">${cost.amount.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${cost.percentage}%` }}></div>
            </div>
            <div className="text-right text-sm text-gray-500 mt-1">{cost.percentage.toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
