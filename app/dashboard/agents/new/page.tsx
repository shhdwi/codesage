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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Agent</h1>
        <p className="mt-2 text-gray-600">
          Configure a new code review agent with custom prompts and rules.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <AgentForm onSubmit={handleSubmit} saving={saving} />
        </div>
      </div>
    </div>
  );
}

