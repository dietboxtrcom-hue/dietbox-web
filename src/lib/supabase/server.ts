// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { connection } from 'next/server'

export async function createClient() {
  // Next.js 16+ dinamik oturum / Date.now() prerender uyarısını kökten çözer
  await connection()
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component içinden çağrıldığında görmezden gel
          }
        },
      },
    }
  )
}

export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const activeKey =
    serviceKey &&
    serviceKey.startsWith('ey') &&
    !serviceKey.includes('buraya_')
      ? serviceKey
      : anonKey

  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    activeKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}