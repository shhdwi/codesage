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

