/**
 * Supabase REST API client for serverless environments
 * Uses direct HTTP calls - no connection pooling issues
 */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ SUPABASE_URL or SUPABASE_ANON_KEY not configured');
}

interface RestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: any;
  select?: string;
  eq?: Record<string, any>;
  single?: boolean;
}

async function supabaseREST(table: string, options: RestOptions) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  
  const headers: Record<string, string> = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.single ? 'return=representation' : 'return=minimal',
  };

  // Build query string
  const params = new URLSearchParams();
  if (options.select) {
    params.append('select', options.select);
  }
  if (options.eq) {
    for (const [key, value] of Object.entries(options.eq)) {
      params.append(key, `eq.${value}`);
    }
  }
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const fetchOptions: RequestInit = {
    method: options.method,
    headers,
    // Critical for serverless: don't keep connections alive
    cache: 'no-store',
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  console.log(`🌐 HTTP ${options.method} ${url}`);
  
  try {
    // Add timeout to prevent indefinite hangs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase REST error: ${response.status} - ${error}`);
    }

    if (options.method === 'GET') {
      const data = await response.json();
      return options.single ? (data[0] || null) : data;
    }
    
    return null;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ Supabase REST call timed out after 5 seconds');
      throw new Error('Database request timeout - check your DATABASE_URL connection string');
    }
    console.error('❌ Supabase REST call failed:', error.message);
    throw error;
  }
}

export async function findRepository(fullName: string) {
  return supabaseREST('Repository', {
    method: 'GET',
    select: 'id,fullName',
    eq: { fullName },
    single: true,
  });
}

export async function findInstallation(githubId: number) {
  return supabaseREST('Installation', {
    method: 'GET',
    select: 'id',
    eq: { githubId },
    single: true,
  });
}

export async function createInstallation(data: {
  githubId: number;
  owner: string;
  ownerType: string;
}) {
  return supabaseREST('Installation', {
    method: 'POST',
    body: data,
    single: true,
  });
}

export async function createRepository(data: {
  fullName: string;
  installationId: string;
  defaultBranch?: string;
}) {
  return supabaseREST('Repository', {
    method: 'POST',
    body: data,
    single: true,
  });
}

export async function findAgentBindings(repoId: string) {
  // Supabase PostgREST syntax for foreign key embedding
  const url = `${SUPABASE_URL}/rest/v1/AgentRepositoryBinding?repoId=eq.${repoId}&enabled=eq.true&select=agentId,enabled,agent:agentId(id,name,enabled,generationPrompt,evaluationPrompt,evaluationDims,severityThreshold,fileTypeFilters)`;
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  console.log(`🌐 HTTP GET ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase REST error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    // Filter for enabled agents
    return data.filter((b: any) => b.agent && b.agent.enabled);
  } catch (error: any) {
    console.error('❌ Supabase REST call failed:', error.message);
    throw error;
  }
}

