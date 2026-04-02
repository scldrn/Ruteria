'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ensureOfflineSessionOwner } from '@/lib/offline/db'

const HAS_SUPABASE_ENV =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export function OfflineSessionGuard() {
  const supabase = useMemo(() => (HAS_SUPABASE_ENV ? createClient() : null), [])

  useEffect(() => {
    if (!supabase) return

    let cancelled = false

    async function syncOwner(userId: string | null) {
      try {
        await ensureOfflineSessionOwner(userId)
      } catch (error) {
        if (!cancelled) {
          console.error('No se pudo sincronizar el aislamiento offline por sesión', error)
        }
      }
    }

    void supabase.auth
      .getUser()
      .then(({ data }) => syncOwner(data.user?.id ?? null))
      .catch(() => syncOwner(null))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncOwner(session?.user?.id ?? null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  return null
}
