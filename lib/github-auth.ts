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

  const appId = process.env.GITHUB_APP_ID!;

  // Generate JWT token manually
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // issued 60 seconds ago (to account for clock drift)
    exp: now + 600, // expires in 10 minutes (max allowed by GitHub)
    iss: appId,
  };

  console.log(`🔑 Creating JWT with payload:`, payload);

  // Base64URL encode
  const base64url = (str: string) =>
    Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payloadEncoded = base64url(JSON.stringify(payload));
  const signatureInput = `${header}.${payloadEncoded}`;

  // Sign with private key
  const crypto = require('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${signatureInput}.${signature}`;
  console.log(`✅ JWT token generated (length: ${jwt.length})`);

  // Exchange JWT for installation token using fetch
  console.log(`🔑 Exchanging JWT for installation token...`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`⏰ Token exchange timeout after 10s`);
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${jwt}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub token exchange failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Cache token (GitHub tokens last 1 hour)
    cachedToken = {
      token: data.token,
      expiresAt: Date.now() + 55 * 60 * 1000, // 55 minutes
    };

    console.log(`✅ Installation token generated (expires in 55min)`);

    return data.token;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`❌ Failed to generate installation token:`, error.message);
    throw error;
  }
}

