import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/get-session";
import { getCostTrends, getAgentCostStats, getCostByRepository } from "@/server/cost-tracker";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    
    const days = parseInt(searchParams.get('days') || '30');
    const agentId = searchParams.get('agentId') || undefined;
    const type = searchParams.get('type') || 'trends';

    if (type === 'trends') {
      const trends = await getCostTrends(agentId, days);
      return NextResponse.json({ trends });
    } else if (type === 'agent' && agentId) {
      const stats = await getAgentCostStats(agentId, days);
      return NextResponse.json({ stats });
    } else if (type === 'repos') {
      const repos = await getCostByRepository(days);
      return NextResponse.json({ repos });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Cost error:", error);
    return NextResponse.json({ error: "Failed to fetch cost data" }, { status: 500 });
  }
}

