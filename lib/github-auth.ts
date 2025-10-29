import { createAppAuth } from "@octokit/auth-app";

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get installation access token with caching to avoid repeated auth calls
 */
export async function getInstallationToken(installationId: number): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    console.log(`✅ Using cached installation token`);
    return cachedToken.token;
  }

  console.log(`🔑 Generating new installation token...`);

  let privateKey = "";
  
  if (process.env.GITHUB_APP_PRIVATE_KEY_B64) {
    privateKey = Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY_B64, "base64").toString("utf8");
  } else if (process.env.GITHUB_APP_PRIVATE_KEY) {
    privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  } else {
    throw new Error('GitHub App private key not configured');
  }

  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID!,
    privateKey,
    installationId,
  });

  // Add timeout to prevent hanging
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => {
      console.log(`⏰ Token generation timeout after 10s`);
      reject(new Error('Token generation timeout'));
    }, 10000)
  );

  const authPromise = auth({ type: 'installation' });

  const result = await Promise.race([authPromise, timeoutPromise]) as any;

  // Cache token (GitHub tokens last 1 hour)
  cachedToken = {
    token: result.token,
    expiresAt: Date.now() + 55 * 60 * 1000, // 55 minutes
  };

  console.log(`✅ Generated new installation token (expires in 55min)`);

  return result.token;
}

