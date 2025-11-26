import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const signUpFree = async (email: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password: crypto.randomUUID(), // Random password - they'll use magic link
  });
  
  if (error) throw error;
  return data;
};

export const signInWithMagicLink = async (email: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    }
  });
  
  if (error) throw error;
  return data;
};

export const getSession = async () => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const signOut = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

export const onAuthStateChange = (callback: (session: any) => void) => {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session);
  });
};