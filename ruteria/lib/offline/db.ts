'use client'

const DB_NAME = 'ruteria-offline'
const DB_VERSION = 4
const OFFLINE_DATA_CHANGED_EVENT = 'offline-data-changed'

export const OFFLINE_STORES = {
  routeSnapshots: 'route_snapshots',
  visitSnapshots: 'visit_snapshots',
  visitDrafts: 'visit_drafts',
  syncQueue: 'sync_queue',
  pendingPhotos: 'pending_photos',
  pendingIncidencias: 'pending_incidencias',
  appMeta: 'app_meta',
} as const

type StoreName = (typeof OFFLINE_STORES)[keyof typeof OFFLINE_STORES]

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

export function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

export function notifyOfflineDataChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OFFLINE_DATA_CHANGED_EVENT))
}

export function subscribeToOfflineData(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  window.addEventListener(OFFLINE_DATA_CHANGED_EVENT, onStoreChange)
  return () => {
    window.removeEventListener(OFFLINE_DATA_CHANGED_EVENT, onStoreChange)
  }
}

export async function openOfflineDb(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    throw new Error('IndexedDB no esta disponible en este navegador')
  }

  return await new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(OFFLINE_STORES.routeSnapshots)) {
        db.createObjectStore(OFFLINE_STORES.routeSnapshots, { keyPath: 'dateKey' })
      }

      if (!db.objectStoreNames.contains(OFFLINE_STORES.visitSnapshots)) {
        db.createObjectStore(OFFLINE_STORES.visitSnapshots, { keyPath: 'visitId' })
      }

      if (!db.objectStoreNames.contains(OFFLINE_STORES.visitDrafts)) {
        db.createObjectStore(OFFLINE_STORES.visitDrafts, { keyPath: 'visitId' })
      }

      if (!db.objectStoreNames.contains(OFFLINE_STORES.syncQueue)) {
        db.createObjectStore(OFFLINE_STORES.syncQueue, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(OFFLINE_STORES.pendingPhotos)) {
        db.createObjectStore(OFFLINE_STORES.pendingPhotos, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(OFFLINE_STORES.pendingIncidencias)) {
        db.createObjectStore(OFFLINE_STORES.pendingIncidencias, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(OFFLINE_STORES.appMeta)) {
        db.createObjectStore(OFFLINE_STORES.appMeta, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB'))
  })
}

export async function ensureOfflineSessionOwner(userId: string | null): Promise<void> {
  const db = await openOfflineDb()
  try {
    const readTx = db.transaction(OFFLINE_STORES.appMeta, 'readonly')
    const existing = await requestToPromise(readTx.objectStore(OFFLINE_STORES.appMeta).get('owner_uid'))
    const currentOwner: string | null = (existing as { key: string; value: string | null } | undefined)?.value ?? null
    if (currentOwner === userId) return

    const userStores = [
      OFFLINE_STORES.routeSnapshots,
      OFFLINE_STORES.visitSnapshots,
      OFFLINE_STORES.visitDrafts,
      OFFLINE_STORES.syncQueue,
      OFFLINE_STORES.pendingPhotos,
      OFFLINE_STORES.pendingIncidencias,
    ] as const
    const writeTx = db.transaction([...userStores, OFFLINE_STORES.appMeta], 'readwrite')
    for (const name of userStores) {
      writeTx.objectStore(name).clear()
    }
    writeTx.objectStore(OFFLINE_STORES.appMeta).put({ key: 'owner_uid', value: userId })
    await new Promise<void>((resolve, reject) => {
      writeTx.oncomplete = () => resolve()
      writeTx.onerror = () => reject(writeTx.error)
    })
  } finally {
    db.close()
  }
}

export async function runStoreRequest<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openOfflineDb()

  try {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const result = await requestToPromise(runner(store))
    if (mode === 'readwrite') {
      notifyOfflineDataChanged()
    }
    return result
  } finally {
    db.close()
  }
}
