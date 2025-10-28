import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            CodeSage
          </h1>
          <p className="mt-6 text-xl text-gray-600">
            AI-Powered GitHub PR Review Bot
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
            Automate code reviews with intelligent, customizable AI agents that provide
            line-by-line feedback on your pull requests.
          </p>
          <div className="mt-10 flex items-center justify-center gap-6">
            <Link
              href="/auth/signin"
              className="rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Get Started
            </Link>
            <Link
              href="#features"
              className="text-base font-medium text-gray-700 hover:text-gray-900"
            >
              Learn more →
            </Link>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="mt-24">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold text-gray-900">Multi-Agent System</h3>
              <p className="mt-2 text-gray-600">
                Create specialized agents for security, performance, code quality, and more.
                Each with custom prompts and rules.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="text-3xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-gray-900">Conversational</h3>
              <p className="mt-2 text-gray-600">
                Reply to bot comments and get contextual responses. The bot remembers the
                original code and review.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h3>
              <p className="mt-2 text-gray-600">
                Track review quality, agent performance, and costs. Compare LLM evaluations
                with user feedback.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-gray-900">Line-Specific Reviews</h3>
              <p className="mt-2 text-gray-600">
                Comments appear directly on the changed lines in your PRs, just like human
                reviewers.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="text-3xl mb-4">⚙️</div>
              <h3 className="text-lg font-semibold text-gray-900">Customizable</h3>
              <p className="mt-2 text-gray-600">
                Configure file type filters, severity thresholds, and custom prompts for
                each agent.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="text-3xl mb-4">💰</div>
              <h3 className="text-lg font-semibold text-gray-900">Cost Tracking</h3>
              <p className="mt-2 text-gray-600">
                Monitor token usage and estimated costs per agent and repository. Stay
                within budget.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Ready to get started?</h2>
          <p className="mt-4 text-lg text-gray-600">
            Sign in with GitHub and configure your first review agent in minutes.
          </p>
          <Link
            href="/auth/signin"
            className="mt-8 inline-block rounded-md bg-blue-600 px-8 py-3 text-base font-medium text-white hover:bg-blue-700"
          >
            Sign in with GitHub
          </Link>
        </div>
      </div>
    </div>
  );
}
