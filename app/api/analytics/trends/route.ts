import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    
    const days = parseInt(searchParams.get('days') || '30');
    const agentId = searchParams.get('agentId');

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Build where clause
    const where: any = {
      agent: { userId: session.user.id },
      createdAt: { gte: since },
    };

    if (agentId) where.agentId = agentId;

    // Get reviews with evaluations
    const reviews = await prisma.review.findMany({
      where,
      include: {
        evaluations: true,
        agent: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by week
    const weeklyStats = new Map<string, { 
      scores: number[], 
      count: number,
      byAgent: Map<string, { scores: number[], count: number }>
    }>();

    for (const review of reviews) {
      const week = getWeekStart(review.createdAt);
      
      if (!weeklyStats.has(week)) {
        weeklyStats.set(week, { 
          scores: [], 
          count: 0,
          byAgent: new Map()
        });
      }

      const weekData = weeklyStats.get(week)!;
      
      for (const evaluation of review.evaluations) {
        const scores = evaluation.scores as any;
        const avgScore = calculateAvgScore(scores);
        weekData.scores.push(avgScore);
        weekData.count++;

        // Per-agent stats
        if (!weekData.byAgent.has(review.agentId)) {
          weekData.byAgent.set(review.agentId, { scores: [], count: 0 });
        }
        const agentData = weekData.byAgent.get(review.agentId)!;
        agentData.scores.push(avgScore);
        agentData.count++;
      }
    }

    // Format results
    const trends = Array.from(weeklyStats.entries()).map(([week, data]) => {
      const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length || 0;
      
      const byAgent = Array.from(data.byAgent.entries()).map(([agentId, agentData]) => {
        const agent = reviews.find(r => r.agentId === agentId)?.agent;
        return {
          agentId,
          agentName: agent?.name || 'Unknown',
          avgScore: agentData.scores.reduce((a, b) => a + b, 0) / agentData.scores.length,
          count: agentData.count,
        };
      });

      return {
        week,
        avgScore: Math.round(avgScore * 10) / 10,
        count: data.count,
        byAgent,
      };
    });

    return NextResponse.json({ trends });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Trends error:", error);
    return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 });
  }
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function calculateAvgScore(scores: Record<string, number>): number {
  const values = Object.values(scores);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

