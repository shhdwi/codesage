import { requireAuth } from "@/lib/get-session";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import Image from "next/image";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-10">
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <Image
                  src="/logo.svg"
                  alt="CodeSage Logo"
                  width={32}
                  height={32}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-900 bg-clip-text text-transparent">
                  CodeSage
                </h1>
              </Link>
              <div className="flex space-x-8">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Overview
                </Link>
                <Link
                  href="/dashboard/agents"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Agents
                </Link>
                <Link
                  href="/dashboard/repos"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Repositories
                </Link>
                <Link
                  href="/dashboard/reviews"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Reviews
                </Link>
                <Link
                  href="/dashboard/analytics"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Analytics
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{session.user?.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

