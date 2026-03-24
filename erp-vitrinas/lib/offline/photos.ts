'use client'

import { OFFLINE_STORES, runStoreRequest } from '@/lib/offline/db'

export type PendingPhotoEntityType = 'visita' | 'incidencia'
export type PendingPhotoSyncStatus = 'pending' | 'error'

export type OfflinePendingPhoto = {
  id: string
  visitId: string
  entityType: PendingPhotoEntityType
  entityId: string
  storagePath: string
  tipo: string | null
  blob: Blob
  mimeType: string
  createdAt: string
  syncStatus: PendingPhotoSyncStatus
  lastError: string | null
}

export async function getPendingPhoto(photoId: string): Promise<OfflinePendingPhoto | null> {
  const result = await runStoreRequest(OFFLINE_STORES.pendingPhotos, 'readonly', (store) => store.get(photoId))
  return (result as OfflinePendingPhoto | undefined) ?? null
}

export async function listPendingPhotos(): Promise<OfflinePendingPhoto[]> {
  const result = await runStoreRequest(OFFLINE_STORES.pendingPhotos, 'readonly', (store) => store.getAll())
  return (result as OfflinePendingPhoto[] | undefined) ?? []
}

export async function listPendingPhotosByVisit(visitId: string): Promise<OfflinePendingPhoto[]> {
  const fotos = await listPendingPhotos()
  return fotos.filter((foto) => foto.visitId === visitId)
}

export async function listPendingPhotosByEntity(
  entityType: PendingPhotoEntityType,
  entityId: string
): Promise<OfflinePendingPhoto[]> {
  const fotos = await listPendingPhotos()
  return fotos.filter((foto) => foto.entityType === entityType && foto.entityId === entityId)
}

export async function putPendingPhoto(photo: OfflinePendingPhoto): Promise<void> {
  await runStoreRequest(OFFLINE_STORES.pendingPhotos, 'readwrite', (store) => store.put(photo))
}

export async function deletePendingPhoto(photoId: string): Promise<void> {
  await runStoreRequest(OFFLINE_STORES.pendingPhotos, 'readwrite', (store) => store.delete(photoId))
}

export async function deletePendingPhotos(photoIds: string[]): Promise<void> {
  for (const photoId of photoIds) {
    await deletePendingPhoto(photoId)
  }
}

export async function markPendingPhotoError(photoId: string, errorMessage: string): Promise<void> {
  const photo = await getPendingPhoto(photoId)
  if (!photo) return

  await putPendingPhoto({
    ...photo,
    syncStatus: 'error',
    lastError: errorMessage,
  })
}
