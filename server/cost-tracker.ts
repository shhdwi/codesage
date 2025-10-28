import { prisma } from "@/lib/prisma";

// OpenAI pricing (as of 2025) - update as needed
const PRICING = {
  "gpt-4o-mini": {
    input: 0.000150 / 1000,  // $0.150 per 1M tokens
    output: 0.000600 / 1000, // $0.600 per 1M tokens
  },
  "gpt-4o": {
    input: 0.00250 / 1000,  // $2.50 per 1M tokens
    output: 0.01000 / 1000, // $10.00 per 1M tokens
  },
};

/**
 * Track token usage and cost for an agent
 */
export async function trackTokenUsage(
  agentId: string,
  repoId: string | null,
  generationTokens: number,
  evaluationTokens: number,
  model: keyof typeof PRICING = "gpt-4o-mini"
) {
  const totalTokens = generationTokens + evaluationTokens;
  
  // Estimate cost (assuming 60% input, 40% output for rough calculation)
  const pricing = PRICING[model];
  const estimatedCostUsd = 
    (totalTokens * 0.6 * pricing.input) + 
    (totalTokens * 0.4 * pricing.output);

  await prisma.costTracking.create({
    data: {
      agentId,
      repoId,
      generationTokens,
      evaluationTokens,
      totalTokens,
      estimatedCostUsd,
    },
  });
}

/**
 * Get cost stats for an agent
 */
export async function getAgentCostStats(agentId: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const records = await prisma.costTracking.findMany({
    where: {
      agentId,
      createdAt: { gte: since },
    },
  });

  const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
  const totalCost = records.reduce((sum, r) => sum + r.estimatedCostUsd, 0);
  const avgTokensPerReview = records.length > 0 ? totalTokens / records.length : 0;

  return {
    totalTokens,
    totalCost,
    reviewCount: records.length,
    avgTokensPerReview,
    avgCostPerReview: records.length > 0 ? totalCost / records.length : 0,
  };
}

/**
 * Get cost breakdown by repository
 */
export async function getCostByRepository(days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const records = await prisma.costTracking.groupBy({
    by: ['repoId'],
    where: {
      createdAt: { gte: since },
      repoId: { not: null },
    },
    _sum: {
      totalTokens: true,
      estimatedCostUsd: true,
    },
    _count: true,
  });

  return records.map(r => ({
    repoId: r.repoId!,
    totalTokens: r._sum.totalTokens || 0,
    totalCost: r._sum.estimatedCostUsd || 0,
    reviewCount: r._count,
  }));
}

/**
 * Get cost trends over time
 */
export async function getCostTrends(agentId?: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const records = await prisma.costTracking.findMany({
    where: {
      ...(agentId && { agentId }),
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by day
  const dailyStats = new Map<string, { tokens: number; cost: number; count: number }>();
  
  for (const record of records) {
    const day = record.createdAt.toISOString().split('T')[0];
    const existing = dailyStats.get(day) || { tokens: 0, cost: 0, count: 0 };
    existing.tokens += record.totalTokens;
    existing.cost += record.estimatedCostUsd;
    existing.count += 1;
    dailyStats.set(day, existing);
  }

  return Array.from(dailyStats.entries()).map(([date, stats]) => ({
    date,
    ...stats,
  }));
}

