import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

// Helper function to get public URL for audio files
export const getAudioUrl = (path: string) => {
  const { data } = supabase
    .storage
    .from('metronome-sounds')
    .getPublicUrl(path);
  return data.publicUrl;
};
