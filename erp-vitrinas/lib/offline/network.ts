'use client'

type OfflineSyncActivity = {
  isSyncing: boolean
  lastStartedAt: string | null
  lastFinishedAt: string | null
}

const OFFLINE_SYNC_ACTIVITY_EVENT = 'offline-sync-activity'

let currentSyncActivity: OfflineSyncActivity = {
  isSyncing: false,
  lastStartedAt: null,
  lastFinishedAt: null,
}

export function isProbablyOfflineError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()

  return (
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('load failed') ||
    message.includes('typeerror: fetch')
  )
}

export function subscribeToOfflineSyncActivity(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  window.addEventListener(OFFLINE_SYNC_ACTIVITY_EVENT, onStoreChange)
  return () => {
    window.removeEventListener(OFFLINE_SYNC_ACTIVITY_EVENT, onStoreChange)
  }
}

export function getOfflineSyncActivitySnapshot(): OfflineSyncActivity {
  return currentSyncActivity
}

export function setOfflineSyncActivity(next: Partial<OfflineSyncActivity>) {
  currentSyncActivity = {
    ...currentSyncActivity,
    ...next,
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_ACTIVITY_EVENT))
  }
}
