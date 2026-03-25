'use client'

import { OFFLINE_STORES, runStoreRequest } from '@/lib/offline/db'
import type { ItemConteo } from '@/lib/hooks/useVisita'

export type OfflineQueueItem =
  | {
      id: string
      type: 'visit:start'
      visitId: string
      payload: { fecha_hora_inicio: string }
      attemptCount: number
      lastError: string | null
      createdAt: string
      updatedAt: string
    }
  | {
      id: string
      type: 'visit:save-count'
      visitId: string
      payload: {
        rows: Array<{
          visita_id: string
          producto_id: string
          inv_anterior: number
          inv_actual: number
          precio_unitario: number
          unidades_repuestas: number
        }>
      }
      attemptCount: number
      lastError: string | null
      createdAt: string
      updatedAt: string
    }
  | {
      id: string
      type: 'visit:mark-no-realizada'
      visitId: string
      payload: { motivo_no_realizada: string }
      attemptCount: number
      lastError: string | null
      createdAt: string
      updatedAt: string
    }
  | {
      id: string
      type: 'visit:close'
      visitId: string
      payload: {
        cobro: {
          monto: number
          forma_pago_id: string
          notas?: string
        }
        reposiciones: Array<{
          producto_id: string
          unidades_repuestas: number
        }>
        client_sync_id: string
      }
      attemptCount: number
      lastError: string | null
      createdAt: string
      updatedAt: string
    }
  | {
      id: string
      type: 'visit:upload-photo'
      visitId: string
      payload: {
        local_photo_id: string
        storage_path: string
        tipo: string | null
      }
      attemptCount: number
      lastError: string | null
      createdAt: string
      updatedAt: string
    }
  | {
      id: string
      type: 'visit:create-incidencia'
      visitId: string
      payload: {
        incidencia_id: string
        pdv_id: string
        vitrina_id: string | null
        tipo: string
        descripcion: string
        photo_ids: string[]
      }
      attemptCount: number
      lastError: string | null
      createdAt: string
      updatedAt: string
    }
  | {
      id: string
      type: 'visit:create-garantia'
      visitId: string
      payload: {
        garantia_id: string
        pdv_id: string
        vitrina_id: string
        producto_id: string
        cantidad: number
        motivo: string
        fecha_venta_aprox: string | null
      }
      attemptCount: number
      lastError: string | null
      createdAt: string
      updatedAt: string
    }

export function buildQueueItemId(
  type: OfflineQueueItem['type'],
  visitId: string,
  uniqueKey: string = visitId
): string {
  return `${type}:${visitId}:${uniqueKey}`
}

function baseQueueMeta<TType extends OfflineQueueItem['type']>(
  type: TType,
  visitId: string,
  uniqueKey: string = visitId
) {
  const now = new Date().toISOString()
  return {
    id: buildQueueItemId(type, visitId, uniqueKey),
    type,
    visitId,
    attemptCount: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function buildSaveCountRows(visitId: string, items: ItemConteo[]) {
  return items.map((item) => ({
    visita_id: visitId,
    producto_id: item.productoId,
    inv_anterior: item.invAnterior,
    inv_actual: item.invActual ?? 0,
    precio_unitario: item.precioUnitario,
    unidades_repuestas: 0,
  }))
}

export async function listQueueItems(): Promise<OfflineQueueItem[]> {
  const result = await runStoreRequest(OFFLINE_STORES.syncQueue, 'readonly', (store) => store.getAll())
  return ((result as OfflineQueueItem[] | undefined) ?? []).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  )
}

export async function putQueueItem(item: OfflineQueueItem): Promise<void> {
  await runStoreRequest(OFFLINE_STORES.syncQueue, 'readwrite', (store) => store.put(item))
}

export async function enqueueVisitStart(visitId: string, fechaHoraInicio: string): Promise<void> {
  const base = baseQueueMeta('visit:start', visitId)

  await putQueueItem({
    ...base,
    payload: { fecha_hora_inicio: fechaHoraInicio },
  })
}

export async function enqueueSaveCount(
  visitId: string,
  rows: Array<{
    visita_id: string
    producto_id: string
    inv_anterior: number
    inv_actual: number
    precio_unitario: number
    unidades_repuestas: number
  }>
): Promise<void> {
  const base = baseQueueMeta('visit:save-count', visitId)

  await putQueueItem({
    ...base,
    payload: { rows },
  })
}

export async function enqueueMarkNoRealizada(visitId: string, motivo: string): Promise<void> {
  const base = baseQueueMeta('visit:mark-no-realizada', visitId)

  await putQueueItem({
    ...base,
    payload: { motivo_no_realizada: motivo },
  })
}

export async function enqueueCloseVisit(
  visitId: string,
  payload: {
    cobro: {
      monto: number
      forma_pago_id: string
      notas?: string
    }
    reposiciones: Array<{
      producto_id: string
      unidades_repuestas: number
    }>
    client_sync_id: string
  }
): Promise<void> {
  const base = baseQueueMeta('visit:close', visitId)

  await putQueueItem({
    ...base,
    payload,
  })
}

export async function enqueueVisitPhotoUpload(
  visitId: string,
  payload: {
    local_photo_id: string
    storage_path: string
    tipo: string | null
  }
): Promise<void> {
  const base = baseQueueMeta('visit:upload-photo', visitId, payload.local_photo_id)

  await putQueueItem({
    ...base,
    payload,
  })
}

export async function enqueueCreateIncidencia(
  visitId: string,
  payload: {
    incidencia_id: string
    pdv_id: string
    vitrina_id: string | null
    tipo: string
    descripcion: string
    photo_ids: string[]
  }
): Promise<void> {
  const base = baseQueueMeta('visit:create-incidencia', visitId, payload.incidencia_id)

  await putQueueItem({
    ...base,
    payload,
  })
}

export async function enqueueCreateGarantia(
  visitId: string,
  payload: {
    garantia_id: string
    pdv_id: string
    vitrina_id: string
    producto_id: string
    cantidad: number
    motivo: string
    fecha_venta_aprox: string | null
  }
): Promise<void> {
  const base = baseQueueMeta('visit:create-garantia', visitId, payload.garantia_id)

  await putQueueItem({
    ...base,
    payload,
  })
}

export async function deleteQueueItem(id: string): Promise<void> {
  await runStoreRequest(OFFLINE_STORES.syncQueue, 'readwrite', (store) => store.delete(id))
}

export async function markQueueItemError(id: string, errorMessage: string): Promise<void> {
  const item = await runStoreRequest(OFFLINE_STORES.syncQueue, 'readonly', (store) => store.get(id))
  const queueItem = (item as OfflineQueueItem | undefined) ?? null
  if (!queueItem) return

  await putQueueItem({
    ...queueItem,
    attemptCount: queueItem.attemptCount + 1,
    lastError: errorMessage,
    updatedAt: new Date().toISOString(),
  })
}

export async function hasPendingQueueItemsForVisit(visitId: string): Promise<boolean> {
  const items = await listQueueItems()
  return items.some((item) => item.visitId === visitId)
}
