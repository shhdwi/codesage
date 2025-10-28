"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">CodeSage</h2>
          <p className="mt-2 text-sm text-gray-600">
            AI-Powered GitHub PR Review Bot
          </p>
        </div>

        <div className="mt-8">
          <Button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="w-full"
          >
            Sign in with GitHub
          </Button>
        </div>
      </div>
    </div>
  );
}

