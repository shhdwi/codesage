"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AgentForm } from "@/components/AgentForm";

export default function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string>("");

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      fetchAgent(p.id);
    });
  }, []);

  const fetchAgent = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}`);
      if (!response.ok) throw new Error("Failed to fetch agent");
      const data = await response.json();
      setAgent(data);
    } catch (err) {
      setError("Failed to load agent");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update agent");

      router.push("/dashboard/agents");
      router.refresh();
    } catch (err) {
      setError("Failed to update agent");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this agent? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete agent");

      router.push("/dashboard/agents");
      router.refresh();
    } catch (err) {
      setError("Failed to delete agent");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-800">Agent not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Agent</h1>
          <p className="mt-2 text-gray-600">Update agent configuration and prompts</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-400"
        >
          {deleting ? "Deleting..." : "Delete Agent"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <AgentForm onSubmit={handleSubmit} initialData={agent} saving={saving} />
        </div>
      </div>
    </div>
  );
}

