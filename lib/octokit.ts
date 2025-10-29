import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

export function appClient() {
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY_B64
    ? Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY_B64, "base64").toString("utf8")
    : process.env.GITHUB_APP_PRIVATE_KEY || "";

  return new App({
    appId: process.env.GITHUB_APP_ID!,
    privateKey,
    webhooks: {
      secret: process.env.GITHUB_WEBHOOK_SECRET!,
    },
  });
}

export async function installationOctokit(installationId: number): Promise<Octokit | null> {
  try {
    console.log(`🔑 Loading GitHub App credentials...`);
    const app = appClient();
    console.log(`🔑 Authenticating installation ${installationId}...`);
    const octokit = await app.getInstallationOctokit(installationId);
    console.log(`🔑 Installation authenticated successfully`);
    return octokit as unknown as Octokit;
  } catch (error: any) {
    console.error(`❌ Failed to create installation Octokit:`, error.message);
    console.error(`   Installation ID: ${installationId}`);
    console.error(`   Error stack:`, error.stack?.substring(0, 300));
    return null;
  }
}

