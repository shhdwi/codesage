"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import Image from "next/image";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-2xl border border-gray-100">
        {/* Logo and Header */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-3 animate-slide-in">
            <Image
              src="/logo.png"
              alt="CodeSage Logo"
              width={48}
              height={48}
              className="drop-shadow-md"
            />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-900 bg-clip-text text-transparent">
              CodeSage
            </h1>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-700">
              AI-Powered Code Review
            </p>
            <p className="text-sm text-gray-500">
              Elevate your pull requests with intelligent feedback
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <svg className="h-5 w-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Instant PR reviews on every commit</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <svg className="h-5 w-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Custom AI agents for your workflow</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <svg className="h-5 w-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Analytics and insights on code quality</span>
          </div>
        </div>

        {/* Sign In Button */}
        <div className="pt-4">
          <button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-gray-900 px-6 py-4 text-base font-semibold text-white shadow-lg hover:bg-gray-800 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <span>Continue with GitHub</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 pt-4">
          By signing in, you agree to integrate CodeSage with your GitHub repositories
        </p>
      </div>
    </div>
  );
}

