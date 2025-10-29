import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function measureLatency(url: string, name: string) {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    const elapsed = Date.now() - start;
    return {
      name,
      url,
      status: response.status,
      latency: `${elapsed}ms`,
      success: true,
    };
  } catch (error: any) {
    const elapsed = Date.now() - start;
    return {
      name,
      url,
      latency: `${elapsed}ms`,
      error: error.message,
      success: false,
    };
  }
}

export async function GET(req: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    vercelRegion: process.env.VERCEL_REGION || 'unknown',
    tests: [] as any[],
  };

  // Test 1: GitHub API
  diagnostics.tests.push(
    await measureLatency('https://api.github.com', 'GitHub API')
  );

  // Test 2: Supabase (if configured)
  if (process.env.SUPABASE_URL) {
    diagnostics.tests.push(
      await measureLatency(
        `${process.env.SUPABASE_URL}/rest/v1/`,
        'Supabase REST API'
      )
    );
  }

  // Test 3: Supabase Pooler (if configured)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const match = dbUrl.match(/\/\/([\w-]+\.supabase\.co)/);
    if (match) {
      const hostname = match[1];
      diagnostics.tests.push(
        await measureLatency(`https://${hostname}`, 'Supabase Pooler')
      );
    }
  }

  // Test 4: Generic internet connectivity
  diagnostics.tests.push(
    await measureLatency('https://www.cloudflare.com', 'Cloudflare')
  );

  return Response.json(diagnostics, {
    headers: { 'Content-Type': 'application/json' },
  });
}

