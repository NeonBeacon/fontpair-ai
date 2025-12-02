import { supabase } from './supabaseClient';

export { supabase };

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
      // In production, redirect to the app URL. In dev, stay on localhost.
      emailRedirectTo: import.meta.env.PROD 
        ? 'https://app.fontpairai.com/' 
        : window.location.origin,
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