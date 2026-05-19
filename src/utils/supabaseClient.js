import { createClient } from '@supabase/supabase-js'

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase credentials missing! Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in a .env.local file."
  )
}

// Automatically sanitize URL to strip trailing slash or /rest/v1/ suffix if copy-pasted incorrectly
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project-id.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)
