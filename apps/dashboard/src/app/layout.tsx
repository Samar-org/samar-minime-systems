import type { ReactNode } from 'react';
import '../styles/globals.css';

export const metadata = {
  title: 'Samar Minime Dashboard',
  description: 'Multi-agent AI orchestration platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="text-2xl font-bold text-gray-900">Samar Minime</div>
                <div className="flex gap-8">
                  <a href="/" className="text-gray-600 hover:text-gray-900">Dashboard</a>
                  <a href="/agents" className="text-gray-600 hover:text-gray-900">Agents</a>
                  <a href="/projects" className="text-gray-600 hover:text-gray-900">Projects</a>
                  <a href="/workflows" className="text-gray-600 hover:text-gray-900">Workflows</a>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
