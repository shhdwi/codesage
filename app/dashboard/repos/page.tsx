"use client";

import { useState, useEffect } from "react";

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
  }>;
}

export default function ReposPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingBindings, setUpdatingBindings] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async (sync = false) => {
    try {
      setError(null);
      if (sync) setSyncing(true);
      
      const reposUrl = sync ? "/api/repos?sync=true" : "/api/repos";
      const [reposResponse, agentsResponse] = await Promise.all([
        fetch(reposUrl),
        fetch("/api/agents"),
      ]);

      if (!reposResponse.ok) {
        throw new Error(`Failed to fetch repos: ${reposResponse.statusText}`);
      }
      
      if (!agentsResponse.ok) {
        throw new Error(`Failed to fetch agents: ${agentsResponse.statusText}`);
      }

      const reposData = await reposResponse.json();
      const agentsData = await agentsResponse.json();
      
      setRepos(Array.isArray(reposData) ? reposData : []);
      setAgents(Array.isArray(agentsData) ? agentsData : []);
    } catch (err: any) {
      console.error('Load data error:', err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = () => {
    loadData(true);
  };

  const toggleBinding = async (repoId: string, agentId: string, currentlyBound: boolean) => {
    const bindingKey = `${repoId}-${agentId}`;
    
    // Mark as updating
    setUpdatingBindings(prev => new Set(prev).add(bindingKey));
    
    // Optimistic UI update - instant feedback!
    setRepos(prevRepos => 
      prevRepos.map(repo => {
        if (repo.id !== repoId) return repo;
        
        if (currentlyBound) {
          // Remove the binding
          return {
            ...repo,
            agentBindings: repo.agentBindings.filter(b => b.agentId !== agentId)
          };
        } else {
          // Add the binding
          return {
            ...repo,
            agentBindings: [...repo.agentBindings, { agentId, enabled: true }]
          };
        }
      })
    );

    // Background API call (non-blocking)
    try {
      if (currentlyBound) {
        await fetch(`/api/repos/${repoId}/agents?agentId=${agentId}`, {
          method: "DELETE",
        });
      } else {
        await fetch(`/api/repos/${repoId}/agents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, enabled: true }),
        });
      }
    } catch (err) {
      // Rollback on error
      console.error('Toggle failed:', err);
      setError('Failed to update agent binding');
      // Revert the optimistic update
      const reposData = await fetch("/api/repos").then(r => r.json());
      setRepos(reposData);
    } finally {
      // Remove updating state
      setUpdatingBindings(prev => {
        const next = new Set(prev);
        next.delete(bindingKey);
        return next;
      });
    }
  };

  // Filter repos based on search query
  const filteredRepos = repos.filter(repo => 
    repo.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Repositories</h1>
          <p className="mt-2 text-lg text-gray-600">Configure which agents review each repository</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2.5 rounded-lg border-2 border-blue-600 bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 hover:shadow focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{syncing ? "Syncing..." : "Sync Repos"}</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-base font-semibold text-red-900">{error}</p>
          </div>
        </div>
      )}

      {repos.length > 0 && (
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`block w-full rounded-xl border-2 border-gray-200 bg-white py-3.5 pl-12 text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 hover:border-gray-300 ${searchQuery ? 'pr-12' : 'pr-4'}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {repos.length === 0 ? (
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-16 text-center shadow-lg">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
            <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3 className="mt-6 text-2xl font-bold text-gray-900">No repositories found</h3>
          <p className="mt-3 text-base text-gray-600 max-w-md mx-auto">
            Install the CodeSage GitHub App on your repositories to get started with automated code reviews
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/settings/installations"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-gray-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-gray-800 transition-all duration-200 hover:shadow-xl"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span>Manage GitHub App</span>
            </a>
            <button
              onClick={handleSync}
              className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 shadow-lg border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              <span>Or Refresh if Already Installed</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200">
              <thead className="bg-gradient-to-br from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Repository
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Reviews
                  </th>
                  {agents.map(agent => (
                    <th key={agent.id} className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div className="flex flex-col items-center gap-1">
                        <span>{agent.name}</span>
                        {!agent.enabled && (
                          <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            Disabled
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredRepos.length === 0 ? (
                  <tr>
                    <td colSpan={2 + agents.length} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-base font-medium text-gray-500">
                          No repositories match &quot;{searchQuery}&quot;
                        </p>
                        <button
                          onClick={() => setSearchQuery("")}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          Clear search
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRepos.map((repo, idx) => {
                    const boundAgentIds = new Set(repo.agentBindings.map(b => b.agentId));
                    
                    return (
                      <tr key={repo.id} className={`transition-colors hover:bg-blue-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-900">{repo.fullName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                            {repo._count.reviews}
                          </span>
                        </td>
                        {agents.map(agent => {
                          const isBound = boundAgentIds.has(agent.id);
                          const bindingKey = `${repo.id}-${agent.id}`;
                          const isUpdating = updatingBindings.has(bindingKey);
                          
                          return (
                            <td key={agent.id} className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex justify-center relative">
                                {isUpdating && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                  </div>
                                )}
                                <input
                                  type="checkbox"
                                  checked={isBound}
                                  onChange={() => toggleBinding(repo.id, agent.id, isBound)}
                                  disabled={!agent.enabled || isUpdating}
                                  className="h-5 w-5 rounded-md border-2 border-gray-300 text-blue-600 transition-all duration-200 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

