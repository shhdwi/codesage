import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recent reviews to see webhook activity
    const reviews = await prisma.review.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: {
          select: { name: true, userId: true }
        },
        repository: {
          select: { fullName: true }
        }
      },
      where: {
        agent: {
          userId: session.user.id
        }
      }
    });

    return NextResponse.json({
      totalReviews: reviews.length,
      reviews: reviews.map(r => ({
        id: r.id,
        agent: r.agent.name,
        repo: r.repository.fullName,
        pr: `#${r.prNumber}`,
        file: r.filePath,
        line: r.lineNumber,
        severity: r.severity,
        posted: r.postedAt,
        created: r.createdAt,
        comment: r.comment.substring(0, 100) + '...',
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

