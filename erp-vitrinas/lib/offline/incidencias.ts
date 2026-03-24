'use client'

import { OFFLINE_STORES, runStoreRequest } from '@/lib/offline/db'

export type PendingIncidenciaSyncStatus = 'pending' | 'error'

export type OfflinePendingIncidencia = {
  id: string
  visitId: string
  pdvId: string
  vitrinaId: string | null
  tipo: string
  descripcion: string
  createdBy: string | null
  createdAt: string
  syncStatus: PendingIncidenciaSyncStatus
  lastError: string | null
  photoIds: string[]
}

export async function getPendingIncidencia(id: string): Promise<OfflinePendingIncidencia | null> {
  const result = await runStoreRequest(OFFLINE_STORES.pendingIncidencias, 'readonly', (store) =>
    store.get(id)
  )
  return (result as OfflinePendingIncidencia | undefined) ?? null
}

export async function listPendingIncidencias(): Promise<OfflinePendingIncidencia[]> {
  const result = await runStoreRequest(OFFLINE_STORES.pendingIncidencias, 'readonly', (store) =>
    store.getAll()
  )
  return ((result as OfflinePendingIncidencia[] | undefined) ?? []).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )
}

export async function listPendingIncidenciasByVisit(visitId: string): Promise<OfflinePendingIncidencia[]> {
  const incidencias = await listPendingIncidencias()
  return incidencias.filter((item) => item.visitId === visitId)
}

export async function putPendingIncidencia(incidencia: OfflinePendingIncidencia): Promise<void> {
  await runStoreRequest(OFFLINE_STORES.pendingIncidencias, 'readwrite', (store) => store.put(incidencia))
}

export async function deletePendingIncidencia(id: string): Promise<void> {
  await runStoreRequest(OFFLINE_STORES.pendingIncidencias, 'readwrite', (store) => store.delete(id))
}

export async function markPendingIncidenciaError(id: string, errorMessage: string): Promise<void> {
  const incidencia = await getPendingIncidencia(id)
  if (!incidencia) return

  await putPendingIncidencia({
    ...incidencia,
    syncStatus: 'error',
    lastError: errorMessage,
  })
}
