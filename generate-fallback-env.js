// Helper script to generate FALLBACK_AGENTS env var
// Run: node generate-fallback-env.js

const agents = [
  {
    id: "your-agent-id",
    name: "Code Quality Guardian",
    enabled: true,
    generationPrompt: "Review this code for quality issues, bugs, and improvements.",
    evaluationPrompt: "Rate the severity of each issue from 1-10.",
    evaluationDims: [],
    severityThreshold: 5,
    fileTypeFilters: [] // Empty = all files, or [".dart", ".js", ".ts"]
  }
];

console.log('\nAdd these to Vercel Environment Variables:\n');
console.log('FALLBACK_REPO_ID=cmhbjq4j50000upuv4rhcdm34');
console.log('\nFALLBACK_AGENTS=');
console.log(JSON.stringify(agents));
console.log('\n');
