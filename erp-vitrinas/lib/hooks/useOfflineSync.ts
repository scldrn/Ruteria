'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { isIndexedDbAvailable, subscribeToOfflineData } from '@/lib/offline/db'
import {
  getOfflineSyncActivitySnapshot,
  subscribeToOfflineSyncActivity,
} from '@/lib/offline/network'
import { listQueueItems } from '@/lib/offline/queue'

type OfflineSyncStatus = 'online' | 'offline'

function subscribeToOnlineStatus(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  window.addEventListener('online', onStoreChange)
  window.addEventListener('offline', onStoreChange)

  return () => {
    window.removeEventListener('online', onStoreChange)
    window.removeEventListener('offline', onStoreChange)
  }
}

function getOnlineSnapshot(): boolean | null {
  if (typeof window === 'undefined') return null
  return window.navigator.onLine
}

function getOfflineCapableSnapshot(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in window.navigator && isIndexedDbAvailable()
}

export function useOfflineSync() {
  const isOnline = useSyncExternalStore(subscribeToOnlineStatus, getOnlineSnapshot, () => null)
  const isOfflineCapable = useSyncExternalStore(
    () => () => undefined,
    getOfflineCapableSnapshot,
    () => false
  )
  const syncActivity = useSyncExternalStore(
    subscribeToOfflineSyncActivity,
    getOfflineSyncActivitySnapshot,
    getOfflineSyncActivitySnapshot
  )
  const [pendingCount, setPendingCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function refreshQueueStatus() {
      const items = await listQueueItems()
      if (cancelled) return

      setPendingCount(items.length)
      setErrorCount(items.filter((item) => item.lastError).length)
    }

    void refreshQueueStatus()

    const unsubscribe = subscribeToOfflineData(() => {
      void refreshQueueStatus()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return {
    isOnline,
    isOffline: isOnline === false,
    isOfflineCapable,
    isSyncing: syncActivity.isSyncing,
    pendingCount,
    errorCount,
    status: ((isOnline ?? false) ? 'online' : 'offline') as OfflineSyncStatus,
  }
}
