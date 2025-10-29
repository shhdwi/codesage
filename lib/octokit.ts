import { Octokit } from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { App } from "@octokit/app";

const MyOctokit = Octokit.plugin(restEndpointMethods);

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

export async function installationOctokit(installationId: number) {
  try {
    console.log(`🔑 Loading GitHub App credentials...`);
    
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY_B64
      ? Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY_B64, "base64").toString("utf8")
      : process.env.GITHUB_APP_PRIVATE_KEY || "";

    if (!privateKey) {
      throw new Error('GitHub App private key not configured');
    }

    console.log(`🔑 Private key length: ${privateKey.length} chars`);
    console.log(`🔑 Private key starts with: ${privateKey.substring(0, 50)}...`);
    console.log(`🔑 Private key ends with: ...${privateKey.substring(privateKey.length - 50)}`);
    console.log(`🔑 Contains newlines: ${privateKey.includes('\n')}`);
    console.log(`🔑 App ID: ${process.env.GITHUB_APP_ID}`);

    console.log(`🔑 Authenticating installation ${installationId}...`);
    
    const octokit = new MyOctokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.GITHUB_APP_ID!,
        privateKey,
        installationId,
      },
    });
    
    console.log(`🔑 Installation authenticated successfully`);
    return octokit;
  } catch (error: any) {
    console.error(`❌ Failed to create installation Octokit:`, error.message);
    console.error(`   Installation ID: ${installationId}`);
    console.error(`   Error stack:`, error.stack?.substring(0, 300));
    return null;
  }
}

