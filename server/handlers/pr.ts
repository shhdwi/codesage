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
    console.log(`Creating GitHub API client for installation ${installationId}...`);
    const octokit = await installationOctokit(installationId);
    
    if (!octokit) {
      console.error(`❌ Failed to create GitHub API client`);
      console.error(`   Installation ID: ${installationId}`);
      console.error(`   Check GITHUB_APP_PRIVATE_KEY or GITHUB_APP_PRIVATE_KEY_B64 is set`);
      return;
    }
    
    console.log(`✅ GitHub API client created successfully`);

    // 1. Find or create installation and repository
    console.log(`🔍 Step 1: About to upsert installation (githubId: ${installationId})`);
    console.log(`🔍 Installation owner: ${event.installation?.account?.login || owner}`);
    console.log(`🔍 Installation ownerType: ${event.installation?.account?.type || 'User'}`);
    
    let installation;
    try {
      const startTime = Date.now();
      console.log(`🔍 Step 1a: Calling prisma.installation.upsert...`);
      
      installation = await Promise.race([
        prisma.installation.upsert({
          where: { githubId: installationId },
          create: {
            githubId: installationId,
            owner: event.installation?.account?.login || owner,
            ownerType: event.installation?.account?.type || 'User',
          },
          update: {},
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Installation upsert timeout after 10s')), 10000)
        )
      ]);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Step 1b: Installation upserted successfully in ${elapsed}ms`);
    } catch (error: any) {
      console.error(`❌ Step 1c: Installation upsert failed:`, error.message);
      throw error;
    }

    console.log(`🔍 Step 2: About to upsert repository (fullName: ${repoFullName})`);
    
    let repository;
    try {
      const startTime = Date.now();
      console.log(`🔍 Step 2a: Calling prisma.repository.upsert...`);
      
      repository = await Promise.race([
        prisma.repository.upsert({
          where: { fullName: repoFullName },
          create: {
            fullName: repoFullName,
            installationId: installation.id,
          },
          update: {},
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Repository upsert timeout after 10s')), 10000)
        )
      ]);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Step 2b: Repository upserted successfully in ${elapsed}ms`);
    } catch (error: any) {
      console.error(`❌ Step 2c: Repository upsert failed:`, error.message);
      throw error;
    }

    // Get all agents bound to this repository
    console.log(`🔍 Step 3: About to fetch agent bindings for repo ${repository.id}`);
    
    let bindings;
    try {
      const startTime = Date.now();
      console.log(`🔍 Step 3a: Calling prisma.agentRepositoryBinding.findMany...`);
      
      bindings = await Promise.race([
        prisma.agentRepositoryBinding.findMany({
          where: { repoId: repository.id },
          include: { agent: true },
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Agent bindings query timeout after 10s')), 10000)
        )
      ]) as any[];
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Step 3b: Fetched ${bindings.length} agent bindings in ${elapsed}ms`);
    } catch (error: any) {
      console.error(`❌ Step 3c: Agent bindings query failed:`, error.message);
      throw error;
    }

    const agents = bindings
      .filter((b) => b.agent.enabled)
      .map((b) => b.agent);

    if (agents.length === 0) {
      console.log("No agents configured for this repository");
      return;
    }

    console.log(`Found ${agents.length} active agents for ${repoFullName}`);

    // 2. Get files changed in PR
    console.log(`🔍 Step 4: Fetching changed files from PR #${prNumber}...`);
    
    let files;
    try {
      const startTime = Date.now();
      console.log(`🔍 Step 4a: Calling octokit.pulls.listFiles...`);
      
      const response = await Promise.race([
        octokit.pulls.listFiles({
          owner,
          repo,
          pull_number: prNumber,
          per_page: 100,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('GitHub listFiles timeout after 15s')), 15000)
        )
      ]) as any;
      
      files = response.data;
      const elapsed = Date.now() - startTime;
      console.log(`✅ Step 4b: Fetched ${files.length} changed files in ${elapsed}ms`);
    } catch (error: any) {
      console.error(`❌ Step 4c: Failed to fetch changed files:`, error.message);
      throw error;
    }

    console.log(`Found ${files.length} changed files`);

    // 3. Process each file with each agent
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

