import { NextRequest, NextResponse } from "next/server";
import { appClient } from "@/lib/octokit";
import { handlePullRequestOpenedOrSync } from "@/server/handlers/pr";
import { handleCommentCreated } from "@/server/handlers/comment";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel function timeout

async function handleInstallation(payload: any) {
  const installationId = payload.installation.id;
  const owner = payload.installation.account.login;
  const ownerType = payload.installation.account.type;

  console.log(`Processing installation ${installationId} for ${owner}`);

  // Create or update installation
  const installation = await prisma.installation.upsert({
    where: { githubId: BigInt(installationId) },
    update: { owner, ownerType },
    create: {
      githubId: BigInt(installationId),
      owner,
      ownerType,
    },
  });

  // Add repositories from the installation
  if (payload.repositories) {
    for (const repo of payload.repositories) {
      const fullName = repo.full_name;
      await prisma.repository.upsert({
        where: { fullName },
        update: {},
        create: {
          fullName,
          installationId: installation.id,
        },
      });
      console.log(`Added repository: ${fullName}`);
    }
  }
}

async function handleInstallationRepositories(payload: any) {
  const installationId = payload.installation.id;
  const action = payload.action;

  console.log(`Processing installation_repositories ${action} for installation ${installationId}`);

  const installation = await prisma.installation.findUnique({
    where: { githubId: BigInt(installationId) },
  });

  if (!installation) {
    console.error(`Installation ${installationId} not found`);
    return;
  }

  if (action === "added" && payload.repositories_added) {
    // Add new repositories
    for (const repo of payload.repositories_added) {
      const fullName = repo.full_name;
      await prisma.repository.upsert({
        where: { fullName },
        update: {},
        create: {
          fullName,
          installationId: installation.id,
        },
      });
      console.log(`Added repository: ${fullName}`);
    }
  } else if (action === "removed" && payload.repositories_removed) {
    // Remove repositories
    for (const repo of payload.repositories_removed) {
      await prisma.repository.deleteMany({
        where: {
          fullName: repo.full_name,
          installationId: installation.id,
        },
      });
      console.log(`Removed repository: ${repo.full_name}`);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-hub-signature-256") || "";
    const event = req.headers.get("x-github-event") || "";
    const delivery = req.headers.get("x-github-delivery") || "";

    console.log(`Received webhook: ${event} (${delivery})`);

    // Verify webhook signature
    const app = appClient();
    
    try {
      await app.webhooks.verifyAndReceive({
        id: delivery,
        name: event as any,
        signature,
        payload: body,
      });
    } catch (error: any) {
      console.error("Webhook verification failed:", error.message);
      return new NextResponse("Invalid signature", { status: 401 });
    }

    // Parse payload
    const payload = JSON.parse(body);

    // Handle different event types
    if (event === "installation" && ["created", "added"].includes(payload.action)) {
      await handleInstallation(payload);
    } else if (event === "installation_repositories") {
      await handleInstallationRepositories(payload);
    } else if (event === "pull_request") {
      const action = payload.action;
      if (["opened", "synchronize", "reopened"].includes(action)) {
        // Process PR in background (consider using a queue for production)
        handlePullRequestOpenedOrSync(payload).catch(error => {
          console.error("Error processing PR:", error);
        });
      }
    } else if (event === "pull_request_review_comment" || event === "issue_comment") {
      const action = payload.action;
      if (action === "created") {
        // Handle conversational threads
        handleCommentCreated(payload).catch(error => {
          console.error("Error processing comment:", error);
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

