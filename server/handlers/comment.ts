import { installationOctokit } from "@/lib/octokit";
import { prisma } from "@/lib/prisma";
import { runConversationalReply } from "@/server/llm";
import { trackTokenUsage } from "@/server/cost-tracker";

export async function handleCommentCreated(event: any) {
  const installationId = event.installation.id;
  const commentId = BigInt(event.comment.id);
  const commentBody = event.comment.body;
  const commentUser = event.comment.user.login;
  
  // Determine owner and repo based on event type
  const owner = event.repository.owner.login;
  const repo = event.repository.name;
  const repoFullName = `${owner}/${repo}`;

  // Check if this is a reply to a bot comment
  // GitHub includes in_reply_to_id for review comments
  const inReplyToId = event.comment.in_reply_to_id;
  
  if (!inReplyToId) {
    // Not a reply, ignore
    return;
  }

  console.log(`Processing reply from ${commentUser} to comment ${inReplyToId}`);

  try {
    const octokit = await installationOctokit(installationId);

    // Find the original review by GitHub comment ID
    const originalReview = await prisma.review.findFirst({
      where: {
        githubCommentId: BigInt(inReplyToId),
      },
      include: {
        agent: true,
        repo: true,
      },
    });

    if (!originalReview) {
      console.log("Original review not found - not a reply to our bot");
      return;
    }

    console.log(`Found original review by agent "${originalReview.agent.name}"`);

    // Generate conversational reply
    const context = {
      originalCode: originalReview.codeChunk,
      originalComment: originalReview.comment,
      userReply: commentBody,
    };

    const result = await runConversationalReply(originalReview.agent, context);

    if (!result.reply.trim()) {
      console.log("No reply generated");
      return;
    }

    // Post reply to GitHub
    let githubReplyId: bigint | null = null;
    
    try {
      // For pull request review comments
      if (event.comment.pull_request_review_id) {
        const reply = await octokit.pulls.createReplyForReviewComment({
          owner,
          repo,
          pull_number: originalReview.prNumber,
          comment_id: Number(inReplyToId),
          body: `**${originalReview.agent.name}** (follow-up)\n\n${result.reply}`,
        });
        githubReplyId = BigInt(reply.data.id);
      } else {
        // For regular issue comments
        const reply = await octokit.issues.createComment({
          owner,
          repo,
          issue_number: originalReview.prNumber,
          body: `**${originalReview.agent.name}** (follow-up)\n\n${result.reply}`,
        });
        githubReplyId = BigInt(reply.data.id);
      }
      
      console.log(`Posted reply: ${githubReplyId}`);
    } catch (error: any) {
      console.error("Failed to post reply:", error.message);
    }

    // Save the reply as a review (thread reply)
    await prisma.review.create({
      data: {
        repoId: originalReview.repoId,
        agentId: originalReview.agentId,
        prNumber: originalReview.prNumber,
        commitSha: originalReview.commitSha,
        filePath: originalReview.filePath,
        lineNumber: originalReview.lineNumber,
        codeChunk: originalReview.codeChunk,
        comment: result.reply,
        severity: 0, // Thread replies don't have severity
        postedAt: new Date(),
        githubCommentId: githubReplyId,
        isThreadReply: true,
        parentReviewId: originalReview.id,
      },
    });

    // Track token usage
    await trackTokenUsage(
      originalReview.agentId,
      originalReview.repoId,
      result.tokensUsed,
      0 // No evaluation for thread replies
    );

    console.log("Thread reply completed");
  } catch (error) {
    console.error("Error handling comment:", error);
  }
}

