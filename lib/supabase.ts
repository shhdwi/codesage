import { createClient } from '@supabase/supabase-js'

// Extract URL and key from DATABASE_URL
// Format: postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
function getSupabaseConfig() {
  const dbUrl = process.env.DATABASE_URL || '';
  
  // Extract project ref from URL
  const match = dbUrl.match(/postgres\.([^:]+):/);
  const projectRef = match ? match[1] : '';
  
  // Extract region
  const regionMatch = dbUrl.match(/aws-\d+-([^.]+)\./);
  const region = regionMatch ? regionMatch[1] : 'ap-southeast-1';
  
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  
  // For service role, we'll use an env var
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
  
  return { supabaseUrl, supabaseKey };
}

let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!supabaseClient) {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    
    if (!supabaseKey) {
      console.error('⚠️ No Supabase key found. Using Prisma fallback.');
      return null;
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    console.log('✅ Supabase client initialized');
  }
  
  return supabaseClient;
}

