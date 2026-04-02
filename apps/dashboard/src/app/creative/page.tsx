'use client';

import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';

interface Creative {
  id: string;
  name: string;
  type: string;
  status: string;
  engagement: number;
}

export default function CreativePage() {
  const { data: creatives, loading, error } = useApi(() => api.creative.list(), []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Creative Assets</h1>
      <div className="grid grid-cols-2 gap-4">
        {(creatives as Creative[] || []).map(creative => (
          <div key={creative.id} className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{creative.name}</h3>
              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">{creative.type}</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Status: {creative.status}</p>
            <div className="text-lg font-bold text-blue-600">{creative.engagement.toFixed(1)}% engagement</div>
          </div>
        ))}
      </div>
    </div>
  );
}
