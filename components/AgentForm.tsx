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
    <form onSubmit={handleSubmit((data) => onSubmit(processFormData(data)))} className="space-y-8">
      {/* Basic Info Section */}
      <div className="space-y-6">
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
          <p className="mt-1 text-sm text-gray-500">Configure your agent's identity and purpose</p>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
              Agent Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              className="text-base"
              placeholder="e.g., Security Expert, Performance Reviewer"
            />
            {errors.name && (
              <p className="mt-2 text-sm font-medium text-red-600 flex items-center gap-1">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              id="description"
              {...register("description")}
              rows={3}
              className="text-base"
              placeholder="Describe what this agent focuses on (optional)"
            />
            <p className="mt-2 text-xs text-gray-500">Help your team understand this agent's purpose</p>
          </div>
        </div>
      </div>

      {/* Prompts Section */}
      <div className="space-y-6">
        <div className="border-l-4 border-purple-500 pl-4">
          <h3 className="text-lg font-bold text-gray-900">AI Prompts</h3>
          <p className="mt-1 text-sm text-gray-500">Define how your agent reviews and evaluates code</p>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="generationPrompt" className="block text-sm font-semibold text-gray-900 mb-2">
              Generation Prompt <span className="text-red-500">*</span>
            </label>
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                {"{code_chunk}"}
              </span>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                {"{file_type}"}
              </span>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                {"{file_path}"}
              </span>
            </div>
            <textarea
              id="generationPrompt"
              {...register("generationPrompt")}
              rows={10}
              className="font-mono text-sm leading-relaxed"
              placeholder="You are a code reviewer..."
            />
            {errors.generationPrompt && (
              <p className="mt-2 text-sm font-medium text-red-600">{errors.generationPrompt.message}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">This prompt guides how the agent reviews code</p>
          </div>

          <div>
            <label htmlFor="evaluationPrompt" className="block text-sm font-semibold text-gray-900 mb-2">
              Evaluation Prompt <span className="text-red-500">*</span>
            </label>
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200">
                {"{code_chunk}"}
              </span>
              <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200">
                {"{review_comment}"}
              </span>
              <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200">
                {"{file_path}"}
              </span>
            </div>
            <textarea
              id="evaluationPrompt"
              {...register("evaluationPrompt")}
              rows={8}
              className="font-mono text-sm leading-relaxed"
              placeholder="Evaluate the review quality..."
            />
            {errors.evaluationPrompt && (
              <p className="mt-2 text-sm font-medium text-red-600">{errors.evaluationPrompt.message}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">This prompt evaluates the quality of generated reviews</p>
          </div>

          <div>
            <label htmlFor="evaluationDims" className="block text-sm font-semibold text-gray-900 mb-2">
              Evaluation Dimensions
            </label>
            <input
              id="evaluationDims"
              type="text"
              {...register("evaluationDims")}
              className="text-base font-medium"
              placeholder="relevance, accuracy, actionability, clarity"
            />
            <p className="mt-2 text-xs text-gray-500">Comma-separated quality metrics to track</p>
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="space-y-6">
        <div className="border-l-4 border-green-500 pl-4">
          <h3 className="text-lg font-bold text-gray-900">Configuration</h3>
          <p className="mt-1 text-sm text-gray-500">Fine-tune your agent's behavior</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="fileTypeFilters" className="block text-sm font-semibold text-gray-900 mb-2">
              File Type Filters
            </label>
            <input
              id="fileTypeFilters"
              type="text"
              {...register("fileTypeFilters")}
              className="text-base font-mono"
              placeholder=".ts, .tsx, .js"
            />
            <p className="mt-2 text-xs text-gray-500">Leave empty to review all file types</p>
          </div>

          <div>
            <label htmlFor="severityThreshold" className="block text-sm font-semibold text-gray-900 mb-2">
              Severity Threshold
            </label>
            <div className="relative">
              <input
                id="severityThreshold"
                type="number"
                {...register("severityThreshold", { valueAsNumber: true })}
                min={1}
                max={5}
                className="text-base font-bold text-center"
              />
              <div className="mt-2 flex justify-between text-xs text-gray-500 px-1">
                <span>Minor</span>
                <span>Critical</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Only post comments at or above this severity (1-5)</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 p-4 rounded-lg bg-gray-50 border-2 border-gray-200">
          <input
            id="enabled"
            type="checkbox"
            {...register("enabled")}
            className="h-5 w-5"
          />
          <label htmlFor="enabled" className="text-sm font-semibold text-gray-900 cursor-pointer">
            Enable this agent for code reviews
          </label>
        </div>
      </div>

      {/* Test Section */}
      <div className="space-y-4 border-t-2 border-gray-200 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Test Your Configuration</h3>
            <p className="mt-1 text-sm text-gray-500">Validate prompts with sample code</p>
          </div>
          <Button
            type="button"
            onClick={handleTest}
            disabled={testing}
            variant="secondary"
            className="px-6 py-2.5"
          >
            {testing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Testing...
              </span>
            ) : (
              "Run Test"
            )}
          </Button>
        </div>

        {testResult && (
          <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 animate-slide-in">
            {testResult.error ? (
              <div className="flex items-center gap-3 text-red-600">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="font-medium">{testResult.error}</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Generated Review</span>
                  </div>
                  <div className="rounded-lg bg-white border-2 border-gray-200 p-4">
                    <p className="text-sm leading-relaxed text-gray-900">{testResult.comment}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">Severity:</span>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">
                      {testResult.severity}/5
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="h-5 w-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Evaluation Scores</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(testResult.evaluation.scores).map(([dim, score]) => (
                      <div key={dim} className="rounded-lg bg-white border-2 border-gray-200 p-3 text-center">
                        <div className="text-2xl font-bold text-gray-900">{score as number}</div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mt-1">{dim}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4 border-t-2 border-gray-200 pt-8">
        <Button 
          type="button" 
          variant="secondary" 
          onClick={() => window.history.back()}
          className="px-6 py-2.5"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={saving}
          className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            "Save Agent"
          )}
        </Button>
      </div>
    </form>
  );
}

