'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useOfflineSync } from '@/lib/hooks/useOfflineSync'
import { setOfflineSyncActivity } from '@/lib/offline/network'
import { processOfflineSyncQueue } from '@/lib/offline/sync'

export function OfflineSyncBootstrap() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { isOnline } = useOfflineSync()

  useEffect(() => {
    if (!isOnline) return

    void (async () => {
      setOfflineSyncActivity({
        isSyncing: true,
        lastStartedAt: new Date().toISOString(),
      })

      try {
        await processOfflineSyncQueue(supabase, queryClient)
      } finally {
        setOfflineSyncActivity({
          isSyncing: false,
          lastFinishedAt: new Date().toISOString(),
        })
      }
    })()
  }, [isOnline, queryClient, supabase])

  return null
}
