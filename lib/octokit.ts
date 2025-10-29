import { App } from "@octokit/app";

export function appClient() {
  let privateKey = "";
  
  if (process.env.GITHUB_APP_PRIVATE_KEY_B64) {
    console.log('🔑 Using GITHUB_APP_PRIVATE_KEY_B64 (base64 encoded)');
    try {
      privateKey = Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY_B64, "base64").toString("utf8");
      console.log(`🔑 Decoded private key length: ${privateKey.length} chars`);
      console.log(`🔑 Private key starts with: ${privateKey.substring(0, 30)}...`);
    } catch (error: any) {
      console.error('❌ Failed to decode GITHUB_APP_PRIVATE_KEY_B64:', error.message);
    }
  } else if (process.env.GITHUB_APP_PRIVATE_KEY) {
    console.log('🔑 Using GITHUB_APP_PRIVATE_KEY (plain text)');
    privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
    console.log(`🔑 Private key length: ${privateKey.length} chars`);
  } else {
    console.error('❌ No GitHub App private key configured!');
  }

  if (!privateKey) {
    throw new Error('GitHub App private key not configured or invalid');
  }

  return new App({
    appId: process.env.GITHUB_APP_ID!,
    privateKey,
    webhooks: {
      secret: process.env.GITHUB_WEBHOOK_SECRET!,
    },
  });
}

export async function installationOctokit(installationId: number): Promise<any> {
  try {
    console.log(`🔑 Loading GitHub App credentials...`);
    const app = appClient();
    console.log(`🔑 Authenticating installation ${installationId}...`);
    const octokit = await app.getInstallationOctokit(installationId);
    console.log(`🔑 Installation authenticated successfully`);
    // Return the octokit directly - it has the correct type
    return octokit;
  } catch (error: any) {
    console.error(`❌ Failed to create installation Octokit:`, error.message);
    console.error(`   Installation ID: ${installationId}`);
    console.error(`   Error stack:`, error.stack?.substring(0, 300));
    return null;
  }
}

