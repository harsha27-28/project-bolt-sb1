import { createClient } from '@supabase/supabase-js';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

function isPlaceholderValue(value: string) {
  return !value || value.includes('xxxxxxxx') || value.includes('your-project-ref');
}

function getSupabaseConfigError() {
  if (!supabaseUrl || !supabaseKey) {
    return 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env.';
  }

  if (isPlaceholderValue(supabaseUrl) || isPlaceholderValue(supabaseKey)) {
    return 'Supabase is using placeholder values. Replace VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env.';
  }

  try {
    new URL(supabaseUrl);
  } catch {
    return 'VITE_SUPABASE_URL is invalid. Use your https://<project-ref>.supabase.co project URL.';
  }

  return null;
}

export const supabaseConfigError = getSupabaseConfigError();
export const supabase = supabaseConfigError ? null : createClient(supabaseUrl, supabaseKey);

export function requireSupabase() {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured.');
  }

  return supabase;
}
