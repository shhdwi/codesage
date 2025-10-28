import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";
import Link from "next/link";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Review Agents</h1>
          <p className="mt-2 text-gray-600">Manage your code review agents</p>
        </div>
        <Link
          href="/dashboard/agents/new"
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <h3 className="text-lg font-medium text-gray-900">No agents yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating your first review agent.
          </p>
          <Link
            href="/dashboard/agents/new"
            className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Agent
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/dashboard/agents/${agent.id}/edit`}
              className="group relative rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                    {agent.name}
                  </h3>
                  {agent.description && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                      {agent.description}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    agent.enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {agent.enabled ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                <div>
                  <span className="font-medium">{agent._count.reviews}</span> reviews
                </div>
                <div>
                  <span className="font-medium">{agent._count.bindings}</span> repos
                </div>
                <div>
                  Severity: <span className="font-medium">{agent.severityThreshold}</span>
                </div>
              </div>

              {agent.fileTypeFilters.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {agent.fileTypeFilters.slice(0, 3).map((filter) => (
                    <span
                      key={filter}
                      className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
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
      )}
    </div>
  );
}

