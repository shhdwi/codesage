import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    
    const days = parseInt(searchParams.get('days') || '30');

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all reviews with evaluations for user's agents
    const reviews = await prisma.review.findMany({
      where: {
        agent: { userId: session.user.id },
        createdAt: { gte: since },
      },
      include: {
        evaluations: true,
        agent: { select: { id: true, name: true } },
        feedbacks: true,
      },
    });

    // Per-agent comparison
    const agentStats = new Map<string, {
      name: string,
      reviewCount: number,
      avgScore: number,
      dimensionScores: Record<string, number[]>,
      feedbackRatings: number[],
    }>();

    for (const review of reviews) {
      if (!agentStats.has(review.agentId)) {
        agentStats.set(review.agentId, {
          name: review.agent.name,
          reviewCount: 0,
          avgScore: 0,
          dimensionScores: {},
          feedbackRatings: [],
        });
      }

      const stats = agentStats.get(review.agentId)!;
      stats.reviewCount++;

      for (const evaluation of review.evaluations) {
        const scores = evaluation.scores as any;
        
        // Aggregate by dimension
        for (const [dim, score] of Object.entries(scores)) {
          if (!stats.dimensionScores[dim]) {
            stats.dimensionScores[dim] = [];
          }
          stats.dimensionScores[dim].push(score as number);
        }
      }

      // Add feedback ratings
      for (const feedback of review.feedbacks) {
        stats.feedbackRatings.push(feedback.rating);
      }
    }

    // Calculate averages
    const comparison = Array.from(agentStats.entries()).map(([agentId, stats]) => {
      const dimensionAvgs: Record<string, number> = {};
      let totalScore = 0;
      let dimCount = 0;

      for (const [dim, scores] of Object.entries(stats.dimensionScores)) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        dimensionAvgs[dim] = Math.round(avg * 10) / 10;
        totalScore += avg;
        dimCount++;
      }

      const avgFeedback = stats.feedbackRatings.length > 0
        ? stats.feedbackRatings.reduce((a, b) => a + b, 0) / stats.feedbackRatings.length
        : null;

      return {
        agentId,
        agentName: stats.name,
        reviewCount: stats.reviewCount,
        avgScore: dimCount > 0 ? Math.round((totalScore / dimCount) * 10) / 10 : 0,
        dimensionAvgs,
        avgFeedback: avgFeedback ? Math.round(avgFeedback * 10) / 10 : null,
        feedbackCount: stats.feedbackRatings.length,
      };
    });

    // Sort by avgScore descending
    comparison.sort((a, b) => b.avgScore - a.avgScore);

    return NextResponse.json({ comparison });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Comparison error:", error);
    return NextResponse.json({ error: "Failed to fetch comparison" }, { status: 500 });
  }
}

