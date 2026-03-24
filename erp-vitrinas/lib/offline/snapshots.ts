'use client'

import type { VisitaDelDia } from '@/lib/hooks/useRutaDelDia'
import type { VisitaDetalle } from '@/lib/hooks/useVisita'
import { OFFLINE_STORES, runStoreRequest } from '@/lib/offline/db'

type RouteSnapshotRecord = {
  dateKey: string
  savedAt: string
  visitas: VisitaDelDia[]
}

type VisitSnapshotRecord = {
  visitId: string
  savedAt: string
  visita: VisitaDetalle
}

export async function saveRouteSnapshot(dateKey: string, visitas: VisitaDelDia[]): Promise<void> {
  await runStoreRequest(OFFLINE_STORES.routeSnapshots, 'readwrite', (store) =>
    store.put({
      dateKey,
      savedAt: new Date().toISOString(),
      visitas,
    } satisfies RouteSnapshotRecord)
  )
}

export async function getRouteSnapshot(dateKey: string): Promise<RouteSnapshotRecord | null> {
  const result = await runStoreRequest(OFFLINE_STORES.routeSnapshots, 'readonly', (store) =>
    store.get(dateKey)
  )

  return (result as RouteSnapshotRecord | undefined) ?? null
}

export async function saveVisitSnapshot(visitId: string, visita: VisitaDetalle): Promise<void> {
  await runStoreRequest(OFFLINE_STORES.visitSnapshots, 'readwrite', (store) =>
    store.put({
      visitId,
      savedAt: new Date().toISOString(),
      visita,
    } satisfies VisitSnapshotRecord)
  )
}

export async function getVisitSnapshot(visitId: string): Promise<VisitSnapshotRecord | null> {
  const result = await runStoreRequest(OFFLINE_STORES.visitSnapshots, 'readonly', (store) =>
    store.get(visitId)
  )

  return (result as VisitSnapshotRecord | undefined) ?? null
}
