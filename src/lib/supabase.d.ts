import { SupabaseClient } from '@supabase/supabase-js';

declare const supabase: SupabaseClient;
declare const getAudioUrl: (path: string) => string;

export { supabase, getAudioUrl };
