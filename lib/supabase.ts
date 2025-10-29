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
  const supabase = getSupabase();
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('Repository')
    .select('id, fullName')
    .eq('fullName', fullName)
    .single();
  
  if (error) {
    console.error('❌ Supabase query error:', error.message);
    return null;
  }
  
  return data;
}

// Helper: Find agent bindings for a repo
export async function findAgentBindingsForRepo(repoId: string) {
  const supabase = getSupabase();
  if (!supabase) return [];
  
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
  
  if (error) {
    console.error('❌ Supabase query error:', error.message);
    return [];
  }
  
  return data || [];
}

