import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";

const AgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  generationPrompt: z.string().min(10),
  evaluationPrompt: z.string().min(10),
  evaluationDims: z.array(z.string()).default(["relevance", "accuracy", "actionability", "clarity"]),
  fileTypeFilters: z.array(z.string()).default([]),
  severityThreshold: z.number().int().min(1).max(5).default(1),
  enabled: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    
    const agents = await prisma.agent.findMany({
      where: { userId: session.user?.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { reviews: true, bindings: true },
        },
      },
    });

    return NextResponse.json(agents);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    
    if (!session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validated = AgentSchema.parse(body);

    const agent = await prisma.agent.create({
      data: {
        ...validated,
        userId: session.user.id,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}

