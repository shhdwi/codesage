import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/get-session";
import { appClient } from "@/lib/octokit";

async function syncRepositoriesFromGitHub() {
  const app = appClient();
  
  try {
    // Get all installations for this app
    const installations = await app.octokit.request("GET /app/installations");
    
    for (const inst of installations.data) {
      const installationId = inst.id;
      const owner = inst.account?.login || "";
      const ownerType = inst.account?.type || "User";
      
      // Upsert installation
      const installation = await prisma.installation.upsert({
        where: { githubId: BigInt(installationId) },
        update: { owner, ownerType },
        create: {
          githubId: BigInt(installationId),
          owner,
          ownerType,
        },
      });

      // Get repositories for this installation
      const octokit = await app.getInstallationOctokit(installationId);
      const { data: reposResponse } = await octokit.request(
        "GET /installation/repositories"
      );

      // Sync repositories
      for (const repo of reposResponse.repositories) {
        await prisma.repository.upsert({
          where: { fullName: repo.full_name },
          update: {
            defaultBranch: repo.default_branch,
          },
          create: {
            fullName: repo.full_name,
            installationId: installation.id,
            defaultBranch: repo.default_branch,
          },
        });
      }

      // Remove repositories that are no longer accessible
      const currentRepoNames = reposResponse.repositories.map(r => r.full_name);
      await prisma.repository.deleteMany({
        where: {
          installationId: installation.id,
          fullName: {
            notIn: currentRepoNames,
          },
        },
      });
    }
  } catch (error: any) {
    console.error("Error syncing repositories from GitHub:", error.message);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    if (!session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if we should sync from GitHub (on first load or explicit refresh)
    const shouldSync = req.nextUrl.searchParams.get("sync") === "true";
    
    if (shouldSync) {
      await syncRepositoriesFromGitHub();
    }

    // Get all repositories from database with optimized query
    const repos = await prisma.repository.findMany({
      orderBy: { fullName: 'asc' },
      include: {
        agentBindings: {
          where: {
            agent: {
              userId: session.user.id
            }
          },
          select: {
            agentId: true,
            enabled: true,
            agent: {
              select: {
                id: true,
                name: true,
              }
            }
          },
        },
        _count: {
          select: { reviews: true },
        },
      },
      take: 100, // Limit results
    });

    // If no repos and we haven't synced yet, try syncing
    if (repos.length === 0 && !shouldSync) {
      try {
        await syncRepositoriesFromGitHub();
        // Re-fetch after sync
        const syncedRepos = await prisma.repository.findMany({
          orderBy: { fullName: 'asc' },
          include: {
            agentBindings: {
              where: {
                agent: {
                  userId: session.user.id
                }
              },
              select: {
                agentId: true,
                enabled: true,
                agent: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              },
            },
            _count: {
              select: { reviews: true },
            },
          },
          take: 100,
        });
        return NextResponse.json(syncedRepos);
      } catch (error) {
        console.error("Auto-sync failed:", error);
        // Return empty array if sync fails
        return NextResponse.json([]);
      }
    }

    return NextResponse.json(repos);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching repositories:", error);
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
  }
}

