import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    // Get all repositories from user's installations
    // In a real app, we'd fetch from GitHub API via installations
    // For now, just return repos that have been seen
    const repos = await prisma.repository.findMany({
      orderBy: { fullName: 'asc' },
      include: {
        agentBindings: {
          include: {
            agent: {
              where: { userId: session.user.id },
            },
          },
        },
        _count: {
          select: { reviews: true },
        },
      },
    });

    return NextResponse.json(repos);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
  }
}

