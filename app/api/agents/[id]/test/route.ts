import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";
import { runGeneration, runEvaluation } from "@/server/llm";

const TestSchema = z.object({
  codeChunk: z.string(),
  filePath: z.string().default("test.ts"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const { codeChunk, filePath } = TestSchema.parse(body);

    // Check ownership
    const agent = await prisma.agent.findFirst({
      where: { id, userId: session.user?.id },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const fileExtension = filePath.split('.').pop() || "ts";

    // Generate review
    const generation = await runGeneration(agent, {
      code_chunk: codeChunk,
      file_path: filePath,
      file_type: fileExtension,
    });

    // Evaluate the generated review
    const evaluation = await runEvaluation(agent, {
      code_chunk: codeChunk,
      review_comment: generation.comment,
      file_path: filePath,
    });

    return NextResponse.json({
      comment: generation.comment,
      severity: generation.severity,
      evaluation: {
        scores: evaluation.scores,
        summary: evaluation.summary,
      },
      tokensUsed: {
        generation: generation.tokensUsed,
        evaluation: evaluation.tokensUsed,
        total: generation.tokensUsed + evaluation.tokensUsed,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Test error:", error);
    return NextResponse.json({ error: "Failed to test agent" }, { status: 500 });
  }
}

