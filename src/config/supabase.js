/**
 * Supabase Client Configuration
 *
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project credentials.
 * For now, the app runs in demo mode with mock data when these are empty.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = ''; // e.g. 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = ''; // e.g. 'eyJhbGciOiJIUzI1...'

// Export a flag so screens can conditionally use mock data
export const IS_DEMO_MODE = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export const supabase = IS_DEMO_MODE
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
