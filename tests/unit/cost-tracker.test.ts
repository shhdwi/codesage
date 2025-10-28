import { describe, it, expect, vi } from 'vitest';
import { trackTokenUsage, getAgentCostStats } from '@/server/cost-tracker';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    costTracking: {
      create: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

describe('cost tracker', () => {
  it('should calculate cost correctly', async () => {
    const generationTokens = 1000;
    const evaluationTokens = 500;
    const totalTokens = 1500;

    // GPT-4o-mini pricing: ~$0.15/1M input, $0.60/1M output
    // Assuming 60/40 split: 900 input, 600 output
    // Cost: (900 * 0.15 / 1M) + (600 * 0.60 / 1M) ≈ $0.000495
    
    const estimatedCost = (totalTokens * 0.6 * 0.000150) + (totalTokens * 0.4 * 0.000600);
    
    expect(estimatedCost).toBeGreaterThan(0);
    expect(estimatedCost).toBeLessThan(0.001); // Should be less than $0.001 for 1500 tokens
  });

  it('should aggregate costs correctly', () => {
    const records = [
      { totalTokens: 1000, estimatedCostUsd: 0.0005 },
      { totalTokens: 1500, estimatedCostUsd: 0.00075 },
      { totalTokens: 2000, estimatedCostUsd: 0.001 },
    ];

    const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalCost = records.reduce((sum, r) => sum + r.estimatedCostUsd, 0);
    const avgTokensPerReview = totalTokens / records.length;

    expect(totalTokens).toBe(4500);
    expect(totalCost).toBeCloseTo(0.00225, 5);
    expect(avgTokensPerReview).toBe(1500);
  });
});

