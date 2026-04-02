'use client';

import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';

interface Workflow {
  id: string;
  name: string;
  status: string;
  progress: number;
}

export default function WorkflowsPage() {
  const { data: workflows, loading, error } = useApi(() => api.workflows.list(), []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Workflows</h1>
      <div className="space-y-4">
        {(workflows as Workflow[] || []).map(workflow => (
          <div key={workflow.id} className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg">{workflow.name}</h3>
              <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-800">{workflow.status}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${workflow.progress}%` }}></div>
            </div>
            <div className="mt-2 text-sm text-gray-500">{workflow.progress}% complete</div>
          </div>
        ))}
      </div>
    </div>
  );
}
