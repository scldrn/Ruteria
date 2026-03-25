import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { processOfflineSyncQueue } from '@/lib/offline/sync'
import type { OfflineQueueItem } from '@/lib/offline/queue'

const draftsMock = vi.hoisted(() => ({
  deleteVisitDraft: vi.fn(),
  markVisitDraftError: vi.fn(),
}))

const queueMock = vi.hoisted(() => ({
  deleteQueueItem: vi.fn(),
  hasPendingQueueItemsForVisit: vi.fn(),
  listQueueItems: vi.fn(),
  markQueueItemError: vi.fn(),
}))

vi.mock('@/lib/offline/drafts', () => draftsMock)
vi.mock('@/lib/offline/queue', () => queueMock)

function createSupabaseStub(handlers?: {
  updateVisita?: (values: Record<string, unknown>, visitId: string) => Promise<{ error: { message: string } | null }>
  upsertDetalle?: (
    rows: Array<Record<string, unknown>>
  ) => Promise<{ error: { message: string } | null }>
  rpcCerrarVisita?: (
    args: Record<string, unknown>
  ) => Promise<{ error: { message: string } | null }>
  rpcRegistrarGarantia?: (
    args: Record<string, unknown>
  ) => Promise<{ error: { message: string } | null }>
}) {
  return {
    from(table: string) {
      if (table === 'visitas') {
        return {
          update(values: Record<string, unknown>) {
            return {
              async eq(_column: string, visitId: string) {
                return (await handlers?.updateVisita?.(values, visitId)) ?? { error: null }
              },
            }
          },
        }
      }

      if (table === 'detalle_visita') {
        return {
          async upsert(rows: Array<Record<string, unknown>>) {
            return (await handlers?.upsertDetalle?.(rows)) ?? { error: null }
          },
        }
      }

      throw new Error(`Tabla no soportada en test: ${table}`)
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      if (fn === 'cerrar_visita_offline') {
        return (await handlers?.rpcCerrarVisita?.(args)) ?? { error: null }
      }

      if (fn === 'registrar_garantia') {
        return (await handlers?.rpcRegistrarGarantia?.(args)) ?? { error: null }
      }

      if (fn !== 'cerrar_visita_offline' && fn !== 'registrar_garantia') {
        throw new Error(`RPC no soportado en test: ${fn}`)
      }

      return { error: null }
    },
  } as unknown as SupabaseClient<Database>
}

function buildQueueItem(type: OfflineQueueItem['type']): OfflineQueueItem {
  const base = {
    id: `${type}:visita-1`,
    visitId: 'visita-1',
    attemptCount: 0,
    lastError: null,
    createdAt: '2026-03-23T10:00:00.000Z',
    updatedAt: '2026-03-23T10:00:00.000Z',
  }

  if (type === 'visit:start') {
    return {
      ...base,
      type,
      payload: { fecha_hora_inicio: '2026-03-23T10:00:00.000Z' },
    }
  }

  if (type === 'visit:save-count') {
    return {
      ...base,
      type,
      payload: {
        rows: [
          {
            visita_id: 'visita-1',
            producto_id: 'prod-1',
            inv_anterior: 10,
            inv_actual: 7,
            precio_unitario: 15000,
            unidades_repuestas: 0,
          },
        ],
      },
    }
  }

  if (type === 'visit:close') {
    return {
      ...base,
      type,
      payload: {
        cobro: {
          monto: 30000,
          forma_pago_id: 'forma-1',
        },
        reposiciones: [{ producto_id: 'prod-1', unidades_repuestas: 2 }],
        client_sync_id: 'sync-1',
      },
    }
  }

  if (type === 'visit:mark-no-realizada') {
    return {
      ...base,
      type,
      payload: { motivo_no_realizada: 'Local cerrado' },
    }
  }

  if (type === 'visit:upload-photo') {
    return {
      ...base,
      type,
      payload: {
        local_photo_id: 'photo-1',
        storage_path: 'visitas/visita-1/photo-1.jpg',
        tipo: 'despues',
      },
    }
  }

  if (type === 'visit:create-incidencia') {
    return {
      ...base,
      type,
      payload: {
        incidencia_id: 'inc-1',
        pdv_id: 'pdv-1',
        vitrina_id: 'vitrina-1',
        tipo: 'robo',
        descripcion: 'Incidencia pendiente',
        photo_ids: ['photo-1'],
      },
    }
  }

  return {
    ...base,
    type,
    payload: {
      garantia_id: 'gar-1',
      pdv_id: 'pdv-1',
      vitrina_id: 'vitrina-1',
      producto_id: 'prod-1',
      cantidad: 1,
      motivo: 'Defecto de fabrica',
      fecha_venta_aprox: null,
    },
  }
}

describe('processOfflineSyncQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sincroniza items exitosos y limpia draft cuando ya no quedan pendientes', async () => {
    const queueItem = buildQueueItem('visit:save-count')
    queueMock.listQueueItems.mockResolvedValue([queueItem])
    queueMock.hasPendingQueueItemsForVisit.mockResolvedValue(false)

    const queryClient = new QueryClient()
    const invalidateQueries = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined as never)

    await processOfflineSyncQueue(createSupabaseStub(), queryClient)

    expect(queueMock.deleteQueueItem).toHaveBeenCalledWith(queueItem.id)
    expect(queueMock.markQueueItemError).not.toHaveBeenCalled()
    expect(draftsMock.deleteVisitDraft).toHaveBeenCalledWith(queueItem.visitId)
    expect(draftsMock.markVisitDraftError).not.toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalledTimes(7)
  })

  it('marca error en cola y draft cuando la sincronizacion falla', async () => {
    const queueItem = buildQueueItem('visit:mark-no-realizada')
    queueMock.listQueueItems.mockResolvedValue([queueItem])

    const queryClient = new QueryClient()
    vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined as never)

    const supabase = createSupabaseStub({
      updateVisita: async () => ({ error: { message: 'RLS denegado' } }),
    })

    await processOfflineSyncQueue(supabase, queryClient)

    expect(queueMock.deleteQueueItem).not.toHaveBeenCalled()
    expect(draftsMock.deleteVisitDraft).not.toHaveBeenCalled()
    expect(queueMock.markQueueItemError).toHaveBeenCalledWith(queueItem.id, 'RLS denegado')
    expect(draftsMock.markVisitDraftError).toHaveBeenCalledWith(queueItem.visitId, 'RLS denegado')
  })

  it('sincroniza el cierre offline usando el RPC idempotente', async () => {
    const queueItem = buildQueueItem('visit:close') as Extract<OfflineQueueItem, { type: 'visit:close' }>
    queueMock.listQueueItems.mockResolvedValue([queueItem])
    queueMock.hasPendingQueueItemsForVisit.mockResolvedValue(false)

    const rpcCerrarVisita = vi.fn().mockResolvedValue({ error: null })
    const queryClient = new QueryClient()
    vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined as never)

    await processOfflineSyncQueue(createSupabaseStub({ rpcCerrarVisita }), queryClient)

    expect(rpcCerrarVisita).toHaveBeenCalledWith({
      p_visita_id: queueItem.visitId,
      p_cobro: queueItem.payload.cobro,
      p_reposiciones: queueItem.payload.reposiciones,
      p_client_sync_id: queueItem.payload.client_sync_id,
    })
    expect(queueMock.deleteQueueItem).toHaveBeenCalledWith(queueItem.id)
    expect(draftsMock.deleteVisitDraft).toHaveBeenCalledWith(queueItem.visitId)
  })
})
