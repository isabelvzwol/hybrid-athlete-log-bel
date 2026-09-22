import { createClient } from '@supabase/supabase-js';

var supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
var supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Supabase-configuratie ontbreekt. Zet VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in .env.local (zie .env.example).'
  );
}

export var supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
