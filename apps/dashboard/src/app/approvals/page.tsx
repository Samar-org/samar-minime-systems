'use client';

import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { useState } from 'react';

interface Approval {
  id: string;
  subject: string;
  requestedBy: string;
  status: string;
  createdAt: string;
}

export default function ApprovalsPage() {
  const { data: approvals, loading, error, refetch } = useApi(() => api.approvals.list(), []);
  const [approving, setApproving] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setApproving(id);
    try {
      await api.approvals.approve(id);
      await refetch();
    } finally {
      setApproving(null);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Approvals</h1>
      <div className="space-y-4">
        {(approvals as Approval[] || []).map(approval => (
          <div key={approval.id} className="bg-white p-6 rounded-lg border border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{approval.subject}</h3>
              <p className="text-sm text-gray-600 mt-1">Requested by {approval.requestedBy}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(approval.createdAt).toLocaleString()}</p>
            </div>
            {approval.status === 'PENDING' && (
              <button
                onClick={() => handleApprove(approval.id)}
                disabled={approving === approval.id}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {approving === approval.id ? 'Approving...' : 'Approve'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
