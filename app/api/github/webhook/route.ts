import { NextRequest, NextResponse } from "next/server";
import { appClient } from "@/lib/octokit";
import { handlePullRequestOpenedOrSync } from "@/server/handlers/pr";
import { handleCommentCreated } from "@/server/handlers/comment";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel function timeout

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
    if (event === "pull_request") {
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

