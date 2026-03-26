// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Missing Supabase credentials.\n' +
    'Copy .env.example → .env.local and fill in your values.\n' +
    'Get them at: Supabase Dashboard → Project Settings → API'
  )
}

export const supabase = createClient(url, key)
