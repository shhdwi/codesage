import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await requireAuth();

  if (!session.user?.id) {
    throw new Error("Unauthorized");
  }

  const [agents, reviews, recentReviews] = await Promise.all([
    prisma.agent.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { reviews: true } },
      },
    }),
    prisma.review.aggregate({
      where: { agent: { userId: session.user.id } },
      _count: true,
    }),
    prisma.review.findMany({
      where: { agent: { userId: session.user.id } },
      take: 5,
      orderBy: { postedAt: 'desc' },
      include: {
        agent: { select: { name: true } },
        repo: { select: { fullName: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back! Here's what's happening.</p>
      </div>

      {/* GitHub App Configuration Banner */}
      <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
              <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Configure GitHub App</h3>
              <p className="text-sm text-gray-600">Install CodeSage on your repositories to enable automated code reviews</p>
            </div>
          </div>
          <a
            href="https://github.com/apps/codesagehq"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-gray-800 transition-all duration-200 hover:shadow-xl hover:scale-105"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <span>Configure on GitHub</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Agents</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {agents.length}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Reviews</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {reviews._count}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Active Agents</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {agents.filter(a => a.enabled).length}
          </dd>
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">Recent Reviews</h2>
          <div className="mt-4 space-y-4">
            {recentReviews.length === 0 ? (
              <p className="text-sm text-gray-500">No reviews yet. Configure an agent to get started!</p>
            ) : (
              recentReviews.map((review) => (
                <div key={review.id} className="border-l-4 border-blue-500 pl-4">
                  <p className="text-sm font-medium text-gray-900">
                    {review.agent.name} reviewed {review.repo.fullName}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    PR #{review.prNumber} • {review.filePath}:{review.lineNumber}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(review.postedAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
          {recentReviews.length > 0 && (
            <div className="mt-4">
              <Link
                href="/dashboard/reviews"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all reviews →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          <div className="mt-4 flex gap-4">
            <Link
              href="/dashboard/agents/new"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create New Agent
            </Link>
            <Link
              href="/dashboard/repos"
              className="inline-flex items-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
            >
              Configure Repositories
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

