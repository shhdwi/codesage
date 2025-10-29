import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get installations
    const installations = await prisma.installation.findMany({
      include: {
        repositories: {
          include: {
            agentBindings: {
              where: {
                enabled: true,
                agent: {
                  enabled: true,
                  userId: session.user.id,
                }
              },
              include: {
                agent: {
                  select: {
                    id: true,
                    name: true,
                    enabled: true,
                  }
                }
              }
            },
            reviews: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    // Get user's agents
    const agents = await prisma.agent.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { reviews: true }
        }
      }
    });

    // Get recent webhook events (if any reviews exist)
    const recentReviews = await prisma.review.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: {
          select: { name: true }
        },
        repo: {
          select: { fullName: true }
        }
      }
    });

    return NextResponse.json({
      status: "operational",
      timestamp: new Date().toISOString(),
      setup: {
        hasGithubAppId: !!process.env.GITHUB_APP_ID,
        hasGithubPrivateKey: !!process.env.GITHUB_APP_PRIVATE_KEY,
        hasWebhookSecret: !!process.env.GITHUB_WEBHOOK_SECRET,
        hasDatabase: !!process.env.DATABASE_URL,
      },
      installations: installations.map(inst => ({
        id: inst.id,
        githubId: inst.githubId.toString(),
        owner: inst.owner,
        repositoryCount: inst.repositories.length,
        repositories: inst.repositories.map(repo => ({
          fullName: repo.fullName,
          enabledAgents: repo.agentBindings.length,
          reviewCount: repo.reviews.length,
          agents: repo.agentBindings.map(b => b.agent.name),
        }))
      })),
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        enabled: agent.enabled,
        reviewCount: agent._count.reviews,
      })),
      recentActivity: recentReviews.map(review => ({
        id: review.id,
        agent: review.agent.name,
        repo: review.repo.fullName,
        prNumber: review.prNumber,
        filePath: review.filePath,
        severity: review.severity,
        createdAt: review.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Debug status error:", error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

