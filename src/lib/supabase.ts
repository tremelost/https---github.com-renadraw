import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback logic if user didn't set VITE_SUPABASE_URL properly
if (!supabaseUrl && supabaseAnonKey) {
  try {
    // Extract project ref from the JWT payload of anon key
    let payloadBase64 = supabaseAnonKey.split('.')[1];
    payloadBase64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    while (payloadBase64.length % 4) {
      payloadBase64 += '=';
    }
    const payload = JSON.parse(atob(payloadBase64));
    if (payload.ref) {
      supabaseUrl = `https://${payload.ref}.supabase.co`;
    }
  } catch (e) {
    console.error('Failed to extract Supabase URL from Anon Key', e);
  }
}

console.log('DEBUG SUPABASE:', { supabaseUrl, hasAnonKey: !!supabaseAnonKey });

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase credentials. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

// We use 'as string' because we handle the error gracefully in the UI if it's missing
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
