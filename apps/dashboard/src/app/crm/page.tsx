'use client';

import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';

interface Contact {
  id: string;
  name: string;
  email: string;
  stage: string;
}

export default function CRMPage() {
  const { data: contacts, loading, error } = useApi(() => api.crm.list(), []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">CRM</h1>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(contacts as Contact[] || []).map(contact => (
              <tr key={contact.id}>
                <td className="px-6 py-4 text-sm text-gray-900">{contact.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{contact.email}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">
                    {contact.stage}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
