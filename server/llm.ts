import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface Agent {
  id: string;
  generationPrompt: string;
  evaluationPrompt: string;
  evaluationDims: string[];
  severityThreshold: number;
}

interface GenerationResult {
  comment: string;
  severity: number;
  raw: any;
  tokensUsed: number;
}

interface EvaluationResult {
  scores: Record<string, number>;
  summary: string;
  tokensUsed: number;
}

/**
 * Replace prompt variables with actual values
 */
function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Infer severity from comment text
 * 5 = critical (security vulnerabilities)
 * 4 = high (major bugs, data loss)
 * 3 = medium (performance, best practices)
 * 2 = low (code quality, style)
 * 1 = info (suggestions)
 */
function inferSeverity(text: string): number {
  const lower = text.toLowerCase();
  
  // Critical: Security vulnerabilities
  if (
    lower.includes('security') ||
    lower.includes('vulnerability') ||
    lower.includes('sql injection') ||
    lower.includes('xss') ||
    lower.includes('csrf') ||
    lower.includes('rce') ||
    lower.includes('authentication bypass')
  ) {
    return 5;
  }
  
  // High: Major bugs
  if (
    lower.includes('crash') ||
    lower.includes('data loss') ||
    lower.includes('null pointer') ||
    lower.includes('undefined behavior') ||
    lower.includes('race condition')
  ) {
    return 4;
  }
  
  // Medium: Performance and best practices
  if (
    lower.includes('performance') ||
    lower.includes('memory leak') ||
    lower.includes('n+1') ||
    lower.includes('inefficient') ||
    lower.includes('should use')
  ) {
    return 3;
  }
  
  // Low: Code quality
  if (
    lower.includes('readability') ||
    lower.includes('maintainability') ||
    lower.includes('complexity') ||
    lower.includes('refactor')
  ) {
    return 2;
  }
  
  // Default: Info/suggestion
  return 1;
}

/**
 * Generate code review comment using LLM
 */
export async function runGeneration(
  agent: Agent,
  vars: Record<string, string>
): Promise<GenerationResult> {
  const prompt = replaceVariables(agent.generationPrompt, vars);

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: "Provide a concise, actionable review comment. Include: (1) the issue, (2) why it matters, (3) how to fix it. If no issues, provide an appreciative micro-suggestion or skip.",
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const comment = response.choices[0]?.message?.content?.trim() || "";
    const severity = inferSeverity(comment);
    const tokensUsed = response.usage?.total_tokens || 0;

    return {
      comment,
      severity,
      raw: response,
      tokensUsed,
    };
  } catch (error) {
    console.error("LLM generation error:", error);
    return {
      comment: "",
      severity: 0,
      raw: { error: String(error) },
      tokensUsed: 0,
    };
  }
}

/**
 * Evaluate the quality of a review comment
 */
export async function runEvaluation(
  agent: Agent,
  vars: Record<string, string>
): Promise<EvaluationResult> {
  const prompt = replaceVariables(agent.evaluationPrompt, vars);

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `Rate the review on these dimensions (1-10): ${agent.evaluationDims.join(', ')}. Return JSON: {"scores": {"dimension": score}, "summary": "brief explanation"}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const tokensUsed = response.usage?.total_tokens || 0;

    // Initialize default scores
    const scores: Record<string, number> = {};
    for (const dim of agent.evaluationDims) {
      scores[dim] = parsed.scores?.[dim] || 5;
    }

    return {
      scores,
      summary: parsed.summary || "",
      tokensUsed,
    };
  } catch (error) {
    console.error("LLM evaluation error:", error);
    
    // Return default scores on error
    const scores: Record<string, number> = {};
    for (const dim of agent.evaluationDims) {
      scores[dim] = 5;
    }
    
    return {
      scores,
      summary: "Evaluation failed",
      tokensUsed: 0,
    };
  }
}

/**
 * Generate conversational reply for thread
 */
export async function runConversationalReply(
  agent: Agent,
  context: { originalCode: string; originalComment: string; userReply: string }
): Promise<{ reply: string; tokensUsed: number }> {
  const prompt = replaceVariables(agent.generationPrompt, {
    code_chunk: context.originalCode,
    file_type: "context",
    file_path: "thread",
  });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: prompt + "\n\nYou are continuing a conversation about code review. Be helpful and answer questions about your previous suggestions.",
        },
        {
          role: "assistant",
          content: context.originalComment,
        },
        {
          role: "user",
          content: context.userReply,
        },
      ],
      temperature: 0.5,
      max_tokens: 400,
    });

    const reply = response.choices[0]?.message?.content?.trim() || "";
    const tokensUsed = response.usage?.total_tokens || 0;

    return { reply, tokensUsed };
  } catch (error) {
    console.error("Conversational reply error:", error);
    return {
      reply: "I apologize, but I'm having trouble generating a response right now.",
      tokensUsed: 0,
    };
  }
}

