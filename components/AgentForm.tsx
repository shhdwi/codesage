"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

const AgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  generationPrompt: z.string().min(10, "Prompt must be at least 10 characters"),
  evaluationPrompt: z.string().min(10, "Prompt must be at least 10 characters"),
  evaluationDims: z.string(), // Comma-separated
  fileTypeFilters: z.string(), // Comma-separated
  severityThreshold: z.number().int().min(1).max(5),
  enabled: z.boolean(),
});

type AgentFormData = z.infer<typeof AgentSchema>;

interface AgentFormProps {
  onSubmit: (data: any) => void;
  initialData?: any;
  saving: boolean;
}

const DEFAULT_GENERATION_PROMPT = `You are a meticulous {file_type} code reviewer. Analyze the following code from {file_path}:

{code_chunk}

Identify potential issues including:
- Bugs and logic errors
- Security vulnerabilities
- Performance problems
- Code quality and maintainability issues

Provide a concise, actionable review comment with:
1. The specific issue
2. Why it matters
3. How to fix it

If no significant issues, skip or provide a brief positive note.`;

const DEFAULT_EVALUATION_PROMPT = `Evaluate the following code review for quality.

Original Code:
{code_chunk}

Review Comment:
{review_comment}

Rate the review on a scale of 1-10 for each dimension and provide a brief summary.`;

export function AgentForm({ onSubmit, initialData, saving }: AgentFormProps) {
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AgentFormData>({
    resolver: zodResolver(AgentSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      generationPrompt: initialData?.generationPrompt || DEFAULT_GENERATION_PROMPT,
      evaluationPrompt: initialData?.evaluationPrompt || DEFAULT_EVALUATION_PROMPT,
      evaluationDims: initialData?.evaluationDims?.join(", ") || "relevance, accuracy, actionability, clarity",
      fileTypeFilters: initialData?.fileTypeFilters?.join(", ") || "",
      severityThreshold: initialData?.severityThreshold || 1,
      enabled: initialData?.enabled ?? true,
    },
  });

  const processFormData = (data: AgentFormData) => {
    return {
      ...data,
      evaluationDims: data.evaluationDims.split(",").map(s => s.trim()).filter(Boolean),
      fileTypeFilters: data.fileTypeFilters.split(",").map(s => s.trim()).filter(Boolean),
    };
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    const formData = watch();
    const processedData = processFormData(formData);

    try {
      const response = await fetch(`/api/agents/${initialData?.id || 'test'}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeChunk: `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }
  return total;
}`,
          filePath: "test.js",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(result);
      } else {
        setTestResult({ error: "Failed to test prompt" });
      }
    } catch (error) {
      setTestResult({ error: "Failed to test prompt" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(processFormData(data)))} className="space-y-6">
      {/* Basic Info */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Agent Name *
        </label>
        <input
          type="text"
          {...register("name")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="e.g., Security Expert, Performance Reviewer"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          {...register("description")}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="Optional description of what this agent focuses on"
        />
      </div>

      {/* Generation Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Generation Prompt *
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Available variables: {"{code_chunk}"}, {"{file_type}"}, {"{file_path}"}
        </p>
        <textarea
          {...register("generationPrompt")}
          rows={8}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
        {errors.generationPrompt && (
          <p className="mt-1 text-sm text-red-600">{errors.generationPrompt.message}</p>
        )}
      </div>

      {/* Evaluation Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Evaluation Prompt *
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Available variables: {"{code_chunk}"}, {"{review_comment}"}, {"{file_path}"}
        </p>
        <textarea
          {...register("evaluationPrompt")}
          rows={6}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
        {errors.evaluationPrompt && (
          <p className="mt-1 text-sm text-red-600">{errors.evaluationPrompt.message}</p>
        )}
      </div>

      {/* Evaluation Dimensions */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Evaluation Dimensions
        </label>
        <input
          type="text"
          {...register("evaluationDims")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="e.g., relevance, accuracy, actionability, clarity"
        />
        <p className="mt-1 text-xs text-gray-500">Comma-separated list</p>
      </div>

      {/* Filters & Settings */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            File Type Filters
          </label>
          <input
            type="text"
            {...register("fileTypeFilters")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            placeholder="e.g., .ts, .tsx, .js"
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave empty for all files, or comma-separated extensions
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Severity Threshold (1-5)
          </label>
          <input
            type="number"
            {...register("severityThreshold", { valueAsNumber: true })}
            min={1}
            max={5}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Only post comments with severity at or above this level
          </p>
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          {...register("enabled")}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label className="ml-2 block text-sm text-gray-900">
          Enable this agent
        </label>
      </div>

      {/* Test Prompt */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Test Prompt</h3>
          <Button
            type="button"
            onClick={handleTest}
            disabled={testing}
            variant="secondary"
          >
            {testing ? "Testing..." : "Test with Sample Code"}
          </Button>
        </div>

        {testResult && (
          <div className="rounded-md bg-gray-50 p-4">
            {testResult.error ? (
              <p className="text-sm text-red-600">{testResult.error}</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">Generated Comment:</p>
                  <p className="mt-1 text-sm text-gray-900">{testResult.comment}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Severity: {testResult.severity}/5</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Evaluation Scores:</p>
                  <div className="mt-1 flex gap-3">
                    {Object.entries(testResult.evaluation.scores).map(([dim, score]) => (
                      <span key={dim} className="text-xs">
                        {dim}: <strong>{score as number}/10</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4 border-t pt-6">
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Agent"}
        </Button>
      </div>
    </form>
  );
}

