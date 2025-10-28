import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";

const FeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const { rating } = FeedbackSchema.parse(body);

    // Verify review exists and belongs to user's agent
    const review = await prisma.review.findFirst({
      where: {
        id,
        agent: { userId: session.user?.id },
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        reviewId: id,
        rating,
      },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const feedbacks = await prisma.feedback.findMany({
      where: {
        reviewId: id,
        review: {
          agent: { userId: session.user?.id },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(feedbacks);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

