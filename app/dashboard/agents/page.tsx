import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";
import Link from "next/link";

// Preset agent names for identification
const PRESET_AGENT_NAMES = [
  "General Code Reviewer",
  "Security Auditor",
  "Performance Optimizer",
];

export default async function AgentsPage() {
  const session = await requireAuth();

  if (!session.user?.id) {
    throw new Error("Unauthorized");
  }

  const agents = await prisma.agent.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { reviews: true, bindings: true },
      },
    },
  });

  // Separate preset and custom agents
  const presetAgents = agents.filter(agent => 
    PRESET_AGENT_NAMES.includes(agent.name)
  );
  const customAgents = agents.filter(agent => 
    !PRESET_AGENT_NAMES.includes(agent.name)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Review Agents</h1>
          <p className="mt-2 text-gray-600">Manage your code review agents</p>
        </div>
        <Link
          href="/dashboard/agents/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-0"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">No agents yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating your first review agent.
          </p>
          <Link
            href="/dashboard/agents/new"
            className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Agent
          </Link>
        </div>
      ) : (
        <>
          {/* Preset Agents Section */}
          {presetAgents.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  <h2 className="text-lg font-semibold text-gray-900">Preset Agents</h2>
                </div>
                <span className="text-sm text-gray-500">Pre-configured agents ready to use</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {presetAgents.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/dashboard/agents/${agent.id}/edit`}
                    className="group relative rounded-lg border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 hover:border-blue-200 hover:shadow-md transition-all"
                  >
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        Preset
                      </span>
                    </div>
                    <div className="pr-20">
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600">
                        {agent.name}
                      </h3>
                      {agent.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {agent.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                      <div>
                        <span className="font-medium text-gray-900">{agent._count.reviews}</span> reviews
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{agent._count.bindings}</span> repos
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            agent.enabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {agent.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Custom Agents Section */}
          {customAgents.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-gray-900">Custom Agents</h2>
                </div>
                <span className="text-sm text-gray-500">Your personalized agents</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {customAgents.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/dashboard/agents/${agent.id}/edit`}
                    className="group relative rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600">
                          {agent.name}
                        </h3>
                        {agent.description && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {agent.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          agent.enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {agent.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                      <div>
                        <span className="font-medium text-gray-900">{agent._count.reviews}</span> reviews
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{agent._count.bindings}</span> repos
                      </div>
                      <div>
                        Severity: <span className="font-medium text-gray-900">{agent.severityThreshold}</span>
                      </div>
                    </div>

                    {agent.fileTypeFilters.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {agent.fileTypeFilters.slice(0, 3).map((filter) => (
                          <span
                            key={filter}
                            className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                          >
                            {filter}
                          </span>
                        ))}
                        {agent.fileTypeFilters.length > 3 && (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            +{agent.fileTypeFilters.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

