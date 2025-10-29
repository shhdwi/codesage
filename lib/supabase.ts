import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('⚠️ SUPABASE_URL or SUPABASE_KEY not configured');
      return null;
    }
    
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    console.log('✅ Supabase client initialized');
  }
  
  return supabaseClient;
}

// Helper: Find repository by full name
export async function findRepositoryByName(fullName: string) {
  console.log(`🔍 Supabase: Querying Repository table for fullName="${fullName}"`);
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase client not available');
    return null;
  }
  
  console.log(`🔍 Supabase: Executing query...`);
  const startTime = Date.now();
  
  try {
    // Add 5-second timeout to prevent indefinite hang
    const queryPromise = supabase
      .from('Repository')
      .select('id, fullName')
      .eq('fullName', fullName)
      .single();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase query timeout after 5s')), 5000)
    );
    
    const result = await Promise.race([queryPromise, timeoutPromise]) as any;
    const { data, error } = result;
    
    const elapsed = Date.now() - startTime;
    console.log(`🔍 Supabase: Query completed in ${elapsed}ms`);
    
    if (error) {
      console.error(`❌ Supabase query error (${error.code}):`, error.message);
      console.error(`   Error details:`, JSON.stringify(error, null, 2));
      return null;
    }
    
    if (!data) {
      console.log(`⚠️ Supabase: No repository found with fullName="${fullName}"`);
      return null;
    }
    
    console.log(`✅ Supabase: Found repository:`, data);
    return data as { id: string; fullName: string };
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Supabase query failed after ${elapsed}ms:`, error.message);
    console.error(`   This likely means network connectivity issue from Vercel → Supabase`);
    return null;
  }
}

// Helper: Find agent bindings for a repo
export async function findAgentBindingsForRepo(repoId: string) {
  console.log(`🔍 Supabase: Querying AgentRepositoryBinding for repoId="${repoId}"`);
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase client not available');
    return [];
  }
  
  console.log(`🔍 Supabase: Executing agent bindings query...`);
  const startTime = Date.now();
  
  const { data, error } = await supabase
    .from('AgentRepositoryBinding')
    .select(`
      agentId,
      enabled,
      agent:Agent!inner (
        id,
        name,
        enabled,
        generationPrompt,
        evaluationPrompt,
        evaluationDims,
        severityThreshold,
        fileTypeFilters
      )
    `)
    .eq('repoId', repoId)
    .eq('enabled', true)
    .eq('agent.enabled', true);
  
  const elapsed = Date.now() - startTime;
  console.log(`🔍 Supabase: Agent query completed in ${elapsed}ms`);
  
  if (error) {
    console.error(`❌ Supabase agent query error (${error.code}):`, error.message);
    console.error(`   Error details:`, JSON.stringify(error, null, 2));
    return [];
  }
  
  console.log(`✅ Supabase: Found ${data?.length || 0} agent bindings`);
  return data || [];
}

