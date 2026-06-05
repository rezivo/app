/* BLOC CONEXIUNE SUPABASE - conține doar date publice */
const REZIVO_SUPABASE_URL = 'https://trjofnazwjhehssirghm.supabase.co';
const REZIVO_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9njtTqvxxsJ3JQsvmWmgHA_OS8bCDUQ';

/* BLOC CLIENT SUPABASE - fără localStorage */
window.rezivoSupabase = window.supabase.createClient(
  REZIVO_SUPABASE_URL,
  REZIVO_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.sessionStorage
    }
  }
);
