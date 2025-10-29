import { installationOctokit } from "@/lib/octokit";
import { prisma } from "@/lib/prisma";
import { findRepositoryByName, findAgentBindingsForRepo } from "@/lib/supabase";
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
    console.log(`Creating GitHub API client for installation ${installationId}...`);
    const octokit = await installationOctokit(installationId);
    console.log(`✅ GitHub API client created successfully`);

    // 1. Query repository using Supabase JS (HTTP - fast and reliable)
    console.log(`Finding repository in database via Supabase...`);
    const startTime = Date.now();
    
    const repositoryResult = await findRepositoryByName(repoFullName);
    
    if (!repositoryResult) {
      console.error(`❌ Repository ${repoFullName} not found in database`);
      console.log(`💡 Please add the repository via the dashboard first`);
      return;
    }
    
    const repository: { id: string; fullName: string } = repositoryResult;
    console.log(`✅ Repository found (${repository.id}) in ${Date.now() - startTime}ms`);

    // 2. Get files changed in PR
    console.log(`Fetching changed files from PR #${prNumber}...`);
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    console.log(`Found ${files.length} changed files`);

    // 3. Load enabled agents via Supabase (HTTP - fast)
    console.log(`Looking for agent bindings for repo ID: ${repository.id}`);
    
    const bindings = await findAgentBindingsForRepo(repository.id);
    const agents = bindings.map((b: any) => b.agent).filter(Boolean);
    
    console.log(`Found ${agents.length} enabled agents for this repo`);
    
    if (agents.length > 0) {
      console.log('Agent details:', agents.map((a: any) => ({
        id: a.id,
        name: a.name,
        enabled: a.enabled,
        severityThreshold: a.severityThreshold,
        fileTypeFilters: a.fileTypeFilters,
      })));
    }

    if (agents.length === 0) {
      console.log("❌ No agents configured for this repository");
      console.log("💡 Go to /dashboard/repos and check the checkbox for your agent!");
      return;
    }

    // 4. Process each file with each agent
    for (const file of files) {
      const filePath = file.filename;
      const patch = file.patch || "";
      
      console.log(`Processing file: ${filePath} (has patch: ${!!patch})`);
      
      if (!patch) {
        console.log(`⏭️ Skipping ${filePath} - no patch/diff available`);
        continue;
      }

      const fileExtension = filePath.split('.').pop() || "";

      for (const agent of agents) {
        // Check file type filter
        if (agent.fileTypeFilters.length > 0) {
          const matches = agent.fileTypeFilters.some((filter: string) => 
            filePath.endsWith(filter) || `.${fileExtension}` === filter
          );
          if (!matches) {
            console.log(`⏭️ Skipping ${filePath} for agent "${agent.name}" - doesn't match filters: ${agent.fileTypeFilters.join(', ')}`);
            continue;
          }
        }

        console.log(`✅ Agent "${agent.name}" reviewing ${filePath}`);

        // Parse diff and get changed lines
        const hunks = parseUnifiedDiff(patch);
        const changedLines = selectChangedLines(hunks);

        console.log(`Found ${changedLines.length} changed lines to review in ${filePath}`);

        for (const line of changedLines) {
          // Prepare prompt variables
          const vars = {
            code_chunk: line.context,
            file_path: filePath,
            file_type: fileExtension,
          };

          // Generate review comment
          console.log(`🤖 Running AI generation for line ${line.newLineNumber}...`);
          const generation = await runGeneration(agent, vars);

          console.log(`AI response - Severity: ${generation.severity}, Comment length: ${generation.comment.length}, Threshold: ${agent.severityThreshold}`);

          // Skip if no comment or below severity threshold
          if (!generation.comment.trim() || generation.severity < agent.severityThreshold) {
            console.log(`⏭️ Skipping line ${line.newLineNumber} - severity ${generation.severity} below threshold ${agent.severityThreshold} or empty comment`);
            continue;
          }

          console.log(`📝 Posting comment on line ${line.newLineNumber}`);

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
            console.log(`✅ Comment posted successfully! GitHub comment ID: ${githubCommentId}`);
          } catch (error: any) {
            console.error(`❌ Failed to post comment:`, error.message);
            console.error(`Error details:`, {
              status: error.status,
              message: error.message,
              file: filePath,
              line: line.newLineNumber,
              commit: commitSha,
            });
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
  } catch (error: any) {
    console.error("❌ Error processing PR:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    });
    throw error;
  }
}

