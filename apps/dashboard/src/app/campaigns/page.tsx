'use client';

import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';

interface Campaign {
  id: string;
  name: string;
  budget: number;
  spent: number;
  roi: number;
}

export default function CampaignsPage() {
  const { data: campaigns, loading, error } = useApi(() => api.campaigns.list(), []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Campaigns</h1>
      <div className="grid grid-cols-3 gap-4">
        {(campaigns as Campaign[] || []).map(campaign => (
          <div key={campaign.id} className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-4">{campaign.name}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Budget</span>
                <span className="font-medium">${campaign.budget}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Spent</span>
                <span className="font-medium">${campaign.spent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ROI</span>
                <span className="font-medium text-green-600">{campaign.roi.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
