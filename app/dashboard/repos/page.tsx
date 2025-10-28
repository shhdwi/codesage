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

  useEffect(() => {
    Promise.all([
      fetch("/api/repos").then(r => r.json()),
      fetch("/api/agents").then(r => r.json()),
    ]).then(([reposData, agentsData]) => {
      setRepos(reposData);
      setAgents(agentsData);
      setLoading(false);
    });
  }, []);

  const toggleBinding = async (repoId: string, agentId: string, currentlyBound: boolean) => {
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

    // Refresh
    const reposData = await fetch("/api/repos").then(r => r.json());
    setRepos(reposData);
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Repositories</h1>
        <p className="mt-2 text-gray-600">Assign agents to repositories</p>
      </div>

      {repos.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <p className="text-gray-500">
            No repositories found. Install the GitHub App on your repositories to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Repository
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Reviews
                </th>
                {agents.map(agent => (
                  <th key={agent.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    {agent.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {repos.map(repo => {
                const boundAgentIds = new Set(repo.agentBindings.map(b => b.agentId));
                
                return (
                  <tr key={repo.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {repo.fullName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {repo._count.reviews}
                    </td>
                    {agents.map(agent => {
                      const isBound = boundAgentIds.has(agent.id);
                      return (
                        <td key={agent.id} className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={isBound}
                            onChange={() => toggleBinding(repo.id, agent.id, isBound)}
                            disabled={!agent.enabled}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

