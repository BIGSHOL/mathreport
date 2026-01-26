/**
 * Supabase client configuration for authentication.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase is optional - if not configured, auth features will be disabled
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase 환경변수가 설정되지 않았습니다. 인증 기능이 비활성화됩니다. VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 확인하세요.'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,  // OAuth 콜백 처리
      },
    })
  : null;

export default supabase;
