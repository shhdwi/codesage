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
    
    if (!octokit) {
      console.error(`❌ Failed to create GitHub API client`);
      console.error(`   Installation ID: ${installationId}`);
      console.error(`   Check GITHUB_APP_PRIVATE_KEY or GITHUB_APP_PRIVATE_KEY_B64 is set`);
      return;
    }
    
    console.log(`✅ GitHub API client created successfully`);
    
    // Debug: Check octokit structure
    console.log(`🔍 Octokit type: ${typeof octokit}`);
    console.log(`🔍 Octokit keys: ${Object.keys(octokit || {}).join(', ')}`);
    console.log(`🔍 Has pulls: ${!!octokit?.pulls}`);
    console.log(`🔍 Has request: ${!!octokit?.request}`);

    // 1. TEMPORARY WORKAROUND: Skip database query entirely
    // Database queries (both Prisma and Supabase) hang indefinitely from Vercel
    // Use environment variable to hardcode repo/agent info until we migrate Supabase to US East
    console.log(`⚠️ Using hardcoded repository fallback to bypass database hang`);
    
    const repository: { id: string; fullName: string } = {
      id: process.env.FALLBACK_REPO_ID || 'cmhbjq4j50000upuv4rhcdm34',
      fullName: repoFullName,
    };
    
    console.log(`✅ Repository: ${repository.fullName} (id: ${repository.id})`);
    
    // Load agents from environment variable as JSON
    // Format: [{"id":"...","name":"...","enabled":true,"generationPrompt":"...","evaluationPrompt":"...","evaluationDims":[],"severityThreshold":5,"fileTypeFilters":[]}]
    const agentsJson = process.env.FALLBACK_AGENTS || '[]';
    let agents: any[] = [];
    try {
      agents = JSON.parse(agentsJson);
      console.log(`✅ Loaded ${agents.length} agents from FALLBACK_AGENTS`);
    } catch (error: any) {
      console.error(`❌ Failed to parse FALLBACK_AGENTS:`, error.message);
    }
    
    if (agents.length === 0) {
      console.log("❌ No agents configured (FALLBACK_AGENTS is empty)");
      console.log("💡 Set FALLBACK_AGENTS env var with your agent config JSON");
      return;
    }

    // 2. Get files changed in PR
    console.log(`Fetching changed files from PR #${prNumber}...`);
    
    let files: any[] = [];
    try {
      // Use native fetch() with AbortController for reliable timeout
      console.log(`🔍 Using fetch() to bypass Octokit hang issue`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Aborting request after 10s`);
        controller.abort();
      }, 10000);
      
      // Get installation token for authentication
      console.log(`🔑 Getting installation token...`);
      const { token } = await octokit.auth({ type: 'installation' }) as any;
      console.log(`✅ Got installation token`);
      
      const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`;
      console.log(`🌐 Fetching: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
      
      files = await response.json();
      console.log(`✅ Successfully fetched ${files.length} changed files`);
    } catch (error: any) {
      console.error(`❌ Failed to fetch changed files:`, error.message);
      console.error(`   Error name:`, error.name);
      
      if (error.name === 'AbortError') {
        console.error(`   ⚠️ Request was aborted due to timeout`);
        console.error(`   ⚠️ This suggests network connectivity issues or GitHub API being slow`);
      }
      
      throw error;
    }
    
    if (files.length === 0) {
      console.log(`⚠️ No files changed in this PR`);
      return;
    }

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
            console.log(`📝 Posting comment using fetch()...`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              console.log(`⏰ Aborting comment post after 10s`);
              controller.abort();
            }, 10000);
            
            // Get installation token for authentication
            const { token } = await octokit.auth({ type: 'installation' }) as any;
            
            const commentUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/comments`;
            const commentBody = {
              body: `**${agent.name}** (Severity: ${generation.severity}/5)\n\n${generation.comment}`,
              commit_id: commitSha,
              path: filePath,
              line: line.newLineNumber,
              side: "RIGHT",
            };
            
            const response = await fetch(commentUrl, {
              method: 'POST',
              headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${token}`,
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(commentBody),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`GitHub API error: ${response.status} ${errorText}`);
            }
            
            const commentData = await response.json();
            githubCommentId = BigInt(commentData.id);
            console.log(`✅ Comment posted successfully! GitHub comment ID: ${githubCommentId}`);
          } catch (error: any) {
            console.error(`❌ Failed to post comment:`, error.message);
            console.error(`Error details:`, {
              name: error.name,
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

