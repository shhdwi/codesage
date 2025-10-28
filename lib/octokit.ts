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

export async function installationOctokit(installationId: number): Promise<Octokit> {
  const app = appClient();
  const octokit = await app.getInstallationOctokit(installationId);
  return octokit as unknown as Octokit;
}

