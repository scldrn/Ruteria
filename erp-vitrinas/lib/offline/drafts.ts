'use client'

import { OFFLINE_STORES, runStoreRequest } from '@/lib/offline/db'
import type { ItemConteo, VisitaDetalle } from '@/lib/hooks/useVisita'
import type { VisitaDelDia } from '@/lib/hooks/useRutaDelDia'

export type OfflineDraftSyncStatus = 'pending' | 'error'

export type OfflineConteoItemDraft = {
  productoId: string
  invActual: number | null
}

export type OfflineVisitDraft = {
  visitId: string
  estado: VisitaDetalle['estado']
  fechaHoraInicio: string | null
  fechaHoraFin: string | null
  motivoNoRealizada: string | null
  items: OfflineConteoItemDraft[] | null
  syncStatus: OfflineDraftSyncStatus
  updatedAt: string
  lastError: string | null
}

function toDraftItems(items: ItemConteo[]): OfflineConteoItemDraft[] {
  return items.map((item) => ({
    productoId: item.productoId,
    invActual: item.invActual,
  }))
}

function recalcItem(item: ItemConteo, invActual: number | null): ItemConteo {
  const unidadesVendidas = invActual !== null ? Math.max(item.invAnterior - invActual, 0) : 0

  return {
    ...item,
    invActual,
    unidadesVendidas,
    subtotal: unidadesVendidas * item.precioUnitario,
  }
}

export function buildOfflineVisitDraft(
  visita: VisitaDetalle,
  updates: Partial<
    Pick<OfflineVisitDraft, 'estado' | 'fechaHoraInicio' | 'fechaHoraFin' | 'motivoNoRealizada' | 'items'>
  >,
  syncStatus: OfflineDraftSyncStatus = 'pending',
  lastError: string | null = null
): OfflineVisitDraft {
  return {
    visitId: visita.id,
    estado: updates.estado ?? visita.estado,
    fechaHoraInicio: updates.fechaHoraInicio ?? visita.fecha_hora_inicio,
    fechaHoraFin: updates.fechaHoraFin ?? null,
    motivoNoRealizada: updates.motivoNoRealizada ?? null,
    items: updates.items ?? null,
    syncStatus,
    updatedAt: new Date().toISOString(),
    lastError,
  }
}

export function applyVisitDraftToVisita(visita: VisitaDetalle, draft: OfflineVisitDraft | null): VisitaDetalle {
  if (!draft || draft.visitId !== visita.id) return visita

  const itemsMap = new Map((draft.items ?? []).map((item) => [item.productoId, item.invActual]))

  return {
    ...visita,
    estado: draft.estado,
    fecha_hora_inicio: draft.fechaHoraInicio,
    items:
      draft.items === null
        ? visita.items
        : visita.items.map((item) => recalcItem(item, itemsMap.get(item.productoId) ?? null)),
  }
}

export function applyVisitDraftToRoute(
  visita: VisitaDelDia,
  draft: OfflineVisitDraft | null
): VisitaDelDia {
  if (!draft || draft.visitId !== visita.id) return visita

  return {
    ...visita,
    estado: draft.estado,
    fecha_hora_inicio: draft.fechaHoraInicio,
    fecha_hora_fin: draft.fechaHoraFin,
    motivo_no_realizada: draft.motivoNoRealizada,
    syncStatus: draft.syncStatus,
  }
}

export async function getVisitDraft(visitId: string): Promise<OfflineVisitDraft | null> {
  const result = await runStoreRequest(OFFLINE_STORES.visitDrafts, 'readonly', (store) => store.get(visitId))
  return (result as OfflineVisitDraft | undefined) ?? null
}

export async function listVisitDrafts(): Promise<OfflineVisitDraft[]> {
  const result = await runStoreRequest(OFFLINE_STORES.visitDrafts, 'readonly', (store) => store.getAll())
  return (result as OfflineVisitDraft[] | undefined) ?? []
}

export async function putVisitDraft(draft: OfflineVisitDraft): Promise<void> {
  await runStoreRequest(OFFLINE_STORES.visitDrafts, 'readwrite', (store) => store.put(draft))
}

export async function deleteVisitDraft(visitId: string): Promise<void> {
  await runStoreRequest(OFFLINE_STORES.visitDrafts, 'readwrite', (store) => store.delete(visitId))
}

export async function markVisitDraftError(visitId: string, errorMessage: string): Promise<void> {
  const draft = await getVisitDraft(visitId)
  if (!draft) return

  await putVisitDraft({
    ...draft,
    syncStatus: 'error',
    lastError: errorMessage,
    updatedAt: new Date().toISOString(),
  })
}

export function buildConteoDraftItems(items: ItemConteo[]): OfflineConteoItemDraft[] {
  return toDraftItems(items)
}
