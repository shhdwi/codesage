"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Agent {
  id: string;
  name: string;
  enabled: boolean;
}

interface Repository {
  id: string;
  fullName: string;
  _count: { reviews: number };
  agentBindings: Array<{
    agentId: string;
    enabled: boolean;
    agent: {
      id: string;
      name: string;
    };
  }>;
}

export default function ReposClient({
  initialRepos,
  initialAgents,
}: {
  initialRepos: Repository[];
  initialAgents: Agent[];
}) {
  const router = useRouter();
  const [repos, setRepos] = useState<Repository[]>(initialRepos);
  const [agents] = useState<Agent[]>(initialAgents);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    try {
      setError(null);
      setSyncing(true);

      const response = await fetch("/api/repos?sync=true");

      if (!response.ok) {
        throw new Error(`Failed to sync repos: ${response.statusText}`);
      }

      const reposData = await response.json();
      setRepos(Array.isArray(reposData) ? reposData : []);
      
      // Refresh the server component data
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync repositories");
    } finally {
      setSyncing(false);
    }
  };

  const toggleAgent = async (repoId: string, agentId: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/repos/${repoId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) throw new Error("Failed to update agent binding");

      // Optimistically update UI
      setRepos((prevRepos) =>
        prevRepos.map((repo) => {
          if (repo.id !== repoId) return repo;

          const existingBinding = repo.agentBindings.find((b) => b.agentId === agentId);
          
          if (existingBinding) {
            return {
              ...repo,
              agentBindings: repo.agentBindings.map((b) =>
                b.agentId === agentId ? { ...b, enabled: !b.enabled } : b
              ),
            };
          } else {
            const agent = agents.find((a) => a.id === agentId);
            return {
              ...repo,
              agentBindings: [
                ...repo.agentBindings,
                {
                  agentId,
                  enabled: true,
                  agent: { id: agentId, name: agent?.name || "" },
                },
              ],
            };
          }
        })
      );

      // Refresh server data
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle agent");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-slide-in">
      {/* Hero Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Repositories</h1>
            <p className="text-lg text-gray-600">
              Manage which agents review your repositories
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Repos
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
          <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Empty State */}
      {repos.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-16 text-center space-y-6">
          <div className="flex justify-center">
            <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-gray-900">No repositories found</h3>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Install the CodeSage GitHub App on your repositories to get started
            </p>
          </div>
          <div className="flex gap-4 justify-center pt-4">
            <a
              href={`https://github.com/apps/YOUR_GITHUB_APP_SLUG/installations/new`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              Manage GitHub App
            </a>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
            >
              Refresh if Already Installed
            </button>
          </div>
        </div>
      ) : (
        /* Repositories Table */
        <div className="rounded-2xl border-2 border-gray-200 bg-white shadow-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Repository
                </th>
                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Reviews
                </th>
                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Active Agents
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {repos.map((repo) => (
                <tr
                  key={repo.id}
                  className="hover:bg-blue-50/50 transition-colors duration-150"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.840 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      <span className="font-semibold text-gray-900 text-base">
                        {repo.fullName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-semibold text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {repo._count.reviews}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-2">
                      {agents.map((agent) => {
                        const binding = repo.agentBindings.find(
                          (b) => b.agentId === agent.id
                        );
                        const isEnabled = binding?.enabled ?? false;

                        return (
                          <label
                            key={agent.id}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-all duration-150 border-2 border-transparent hover:border-gray-200"
                          >
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => toggleAgent(repo.id, agent.id)}
                              className="h-5 w-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                            />
                            <span className={`text-sm font-medium transition-colors ${
                              isEnabled ? 'text-blue-700' : 'text-gray-600'
                            }`}>
                              {agent.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

