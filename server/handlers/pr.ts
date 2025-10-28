import { installationOctokit } from "@/lib/octokit";
import { prisma } from "@/lib/prisma";
import { parseUnifiedDiff, selectChangedLines } from "@/server/diff";
import { runGeneration, runEvaluation } from "@/server/llm";
import { trackTokenUsage } from "@/server/cost-tracker";

export async function handlePullRequestOpenedOrSync(event: any) {
  const installationId = event.installation.id;
  const owner = event.repository.owner.login;
  const repo = event.repository.name;
  const repoFullName = `${owner}/${repo}`;
  const prNumber = event.pull_request.number;
  const commitSha = event.pull_request.head.sha;

  console.log(`Processing PR #${prNumber} in ${repoFullName}`);

  try {
    const octokit = await installationOctokit(installationId);

    // 1. Upsert installation and repository
    const installation = await prisma.installation.upsert({
      where: { githubId: BigInt(installationId) },
      update: {},
      create: {
        githubId: BigInt(installationId),
        owner: event.repository.owner.login,
        ownerType: event.repository.owner.type,
      },
    });

    const repository = await prisma.repository.upsert({
      where: { fullName: repoFullName },
      update: {},
      create: {
        fullName: repoFullName,
        installationId: installation.id,
        defaultBranch: event.repository.default_branch,
      },
    });

    // 2. Get files changed in PR
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    console.log(`Found ${files.length} changed files`);

    // 3. Load enabled agents bound to this repo
    const bindings = await prisma.agentRepositoryBinding.findMany({
      where: {
        repoId: repository.id,
        enabled: true,
        agent: {
          enabled: true
        }
      },
      include: {
        agent: true,
      },
    });

    const agents = bindings.map(b => b.agent).filter(Boolean);
    console.log(`Found ${agents.length} enabled agents for this repo`);

    if (agents.length === 0) {
      console.log("No agents configured for this repository");
      return;
    }

    // 4. Process each file with each agent
    for (const file of files) {
      const filePath = file.filename;
      const patch = file.patch || "";
      
      if (!patch) continue;

      const fileExtension = filePath.split('.').pop() || "";

      for (const agent of agents) {
        // Check file type filter
        if (agent.fileTypeFilters.length > 0) {
          const matches = agent.fileTypeFilters.some(filter => 
            filePath.endsWith(filter) || `.${fileExtension}` === filter
          );
          if (!matches) {
            console.log(`Skipping ${filePath} - doesn't match agent filters`);
            continue;
          }
        }

        console.log(`Agent "${agent.name}" reviewing ${filePath}`);

        // Parse diff and get changed lines
        const hunks = parseUnifiedDiff(patch);
        const changedLines = selectChangedLines(hunks);

        console.log(`Found ${changedLines.length} changed lines to review`);

        for (const line of changedLines) {
          // Prepare prompt variables
          const vars = {
            code_chunk: line.context,
            file_path: filePath,
            file_type: fileExtension,
          };

          // Generate review comment
          const generation = await runGeneration(agent, vars);

          // Skip if no comment or below severity threshold
          if (!generation.comment.trim() || generation.severity < agent.severityThreshold) {
            console.log(`Skipping line ${line.newLineNumber} - severity ${generation.severity} below threshold ${agent.severityThreshold}`);
            continue;
          }

          console.log(`Posting comment on line ${line.newLineNumber}`);

          // Post review comment to GitHub
          let githubCommentId: bigint | null = null;
          try {
            const comment = await octokit.pulls.createReviewComment({
              owner,
              repo,
              pull_number: prNumber,
              body: `**${agent.name}** (Severity: ${generation.severity}/5)\n\n${generation.comment}`,
              commit_id: commitSha,
              path: filePath,
              line: line.newLineNumber,
              side: "RIGHT",
            });
            githubCommentId = BigInt(comment.data.id);
          } catch (error: any) {
            console.error(`Failed to post comment:`, error.message);
            // Continue even if comment fails to post
          }

          // Save review to database
          const review = await prisma.review.create({
            data: {
              repoId: repository.id,
              agentId: agent.id,
              prNumber,
              commitSha,
              filePath,
              lineNumber: line.newLineNumber,
              codeChunk: line.context,
              comment: generation.comment,
              severity: generation.severity,
              postedAt: new Date(),
              githubCommentId,
              rawLLM: generation.raw as any,
            },
          });

          // Run evaluation
          const evaluation = await runEvaluation(agent, {
            code_chunk: line.context,
            review_comment: generation.comment,
            file_path: filePath,
          });

          await prisma.evaluation.create({
            data: {
              reviewId: review.id,
              scores: evaluation.scores as any,
              summary: evaluation.summary,
            },
          });

          // Track costs
          await trackTokenUsage(
            agent.id,
            repository.id,
            generation.tokensUsed,
            evaluation.tokensUsed
          );

          console.log(`Review completed for line ${line.newLineNumber}`);
        }
      }
    }

    console.log(`Finished processing PR #${prNumber}`);
  } catch (error) {
    console.error("Error processing PR:", error);
    throw error;
  }
}

