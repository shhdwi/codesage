import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";

const BindAgentSchema = z.object({
  agentId: z.string(),
  enabled: z.boolean().default(true),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    if (!session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bindings = await prisma.agentRepositoryBinding.findMany({
      where: { 
        repoId: id,
        agent: {
          userId: session.user.id
        }
      },
      include: {
        agent: true,
      },
    });

    return NextResponse.json(bindings);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch bindings" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: repoId } = await params;
    const body = await req.json();

    const { agentId, enabled } = BindAgentSchema.parse(body);

    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: session.user?.id },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const binding = await prisma.agentRepositoryBinding.upsert({
      where: {
        agentId_repoId: { agentId, repoId },
      },
      update: { enabled },
      create: { agentId, repoId, enabled },
    });

    return NextResponse.json(binding, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to bind agent" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: repoId } = await params;
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: session.user?.id },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    await prisma.agentRepositoryBinding.delete({
      where: {
        agentId_repoId: { agentId, repoId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to unbind agent" }, { status: 500 });
  }
}

