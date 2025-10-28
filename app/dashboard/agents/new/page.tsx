"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentForm } from "@/components/AgentForm";

export default function NewAgentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create agent");
      }

      router.push("/dashboard/agents");
      router.refresh();
    } catch (err) {
      setError("Failed to create agent. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-slide-in">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Create New Agent</h1>
        <p className="mt-3 text-lg text-gray-600">
          Configure an AI-powered code review agent with custom prompts and rules
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border-2 border-red-200 p-5">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-base font-semibold text-red-900">{error}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border-2 border-gray-200 bg-white shadow-lg">
        <div className="p-8">
          <AgentForm onSubmit={handleSubmit} saving={saving} />
        </div>
      </div>
    </div>
  );
}

