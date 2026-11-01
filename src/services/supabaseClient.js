import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hdfgzqnhwljcnddbtllw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZmd6cW5od2xqY25kZGJ0bGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NTI0MzEsImV4cCI6MjEwOTEyODQzMX0.4yByj9GYjrta22alwTGpVe7gUgJD0lVP0usXvNpwlW4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
