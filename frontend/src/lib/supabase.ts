import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.toString();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.toString();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Deployment-safe: avoid hard crashes when env vars are missing.
// If Supabase isn't configured, we create a client with placeholder values.
// Auth/network calls will fail gracefully, but the UI can still render for demos.
const resolvedUrl = isSupabaseConfigured ? supabaseUrl! : 'https://example.supabase.co';
const resolvedAnonKey = isSupabaseConfigured ? supabaseAnonKey! : 'public-anon-key';

export const supabase = createClient(resolvedUrl, resolvedAnonKey);
