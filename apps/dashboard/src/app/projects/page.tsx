'use client';

import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export default function ProjectsPage() {
  const { data: projects, loading, error } = useApi(() => api.projects.list(), []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Projects</h1>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(projects as Project[] || []).map(project => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{project.name}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                    {project.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(project.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
