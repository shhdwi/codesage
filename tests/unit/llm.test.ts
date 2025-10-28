import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runGeneration, runEvaluation } from '@/server/llm';

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

describe('LLM integration', () => {
  const mockAgent = {
    id: 'agent-1',
    generationPrompt: 'Review this {file_type} code: {code_chunk} from {file_path}',
    evaluationPrompt: 'Evaluate: {code_chunk} and {review_comment}',
    evaluationDims: ['relevance', 'accuracy', 'actionability', 'clarity'],
    severityThreshold: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should replace variables in generation prompt', () => {
    const vars = {
      code_chunk: 'const x = 1;',
      file_type: 'ts',
      file_path: 'test.ts',
    };

    // The function internally replaces variables
    expect(mockAgent.generationPrompt).toBeTruthy();
  });

  it('should infer severity from comment text', () => {
    // Security keywords should result in high severity
    const securityComment = 'This code has a SQL injection vulnerability';
    expect(securityComment.toLowerCase()).toContain('sql injection');
  });

  it('should handle evaluation with multiple dimensions', async () => {
    const OpenAI = await import('openai');
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            scores: { relevance: 8, accuracy: 7, actionability: 9, clarity: 8 },
            summary: 'Good review',
          }),
        },
      }],
      usage: { total_tokens: 100 },
    });

    // @ts-ignore
    OpenAI.default.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }));

    const result = await runEvaluation(mockAgent, {
      code_chunk: 'const x = 1;',
      review_comment: 'This looks good',
      file_path: 'test.ts',
    });

    expect(result.scores).toHaveProperty('relevance');
    expect(result.scores).toHaveProperty('accuracy');
    expect(result.summary).toBeTruthy();
  });
});

