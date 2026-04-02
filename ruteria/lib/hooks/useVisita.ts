import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { compressImageFile } from '@/lib/offline/compression'
import {
  applyVisitDraftToVisita,
  buildConteoDraftItems,
  buildOfflineVisitDraft,
  getVisitDraft,
  putVisitDraft,
} from '@/lib/offline/drafts'
import { isProbablyOfflineError } from '@/lib/offline/network'
import { deletePendingPhoto, putPendingPhoto } from '@/lib/offline/photos'
import {
  buildQueueItemId,
  deleteQueueItem,
  enqueueCloseVisit,
  buildSaveCountRows,
  enqueueMarkNoRealizada,
  enqueueSaveCount,
  enqueueVisitPhotoUpload,
  enqueueVisitStart,
} from '@/lib/offline/queue'
import { getVisitSnapshot, saveVisitSnapshot } from '@/lib/offline/snapshots'
import { buildScopedPhotoPath } from '@/lib/storage/paths'

const STORAGE_BUCKET = 'fotos-visita'

export type ItemConteo = {
  productoId: string
  nombre: string
  precioUnitario: number
  productoActivo: boolean         // false = producto inactivo; no debe aparecer en reposición
  invAnterior: number
  invActual: number | null        // null = no ingresado aún
  unidadesVendidas: number        // calculado live: max(invAnterior - invActual, 0)
  subtotal: number                // live: unidadesVendidas * precioUnitario
  cantidadObjetivo: number
  stockColaboradora: number
}

export type FotoVisita = {
  id: string
  url: string
  tipo: string | null
  fecha_subida: string
}

export type VisitaDetalle = {
  id: string
  estado: 'planificada' | 'en_ejecucion' | 'completada' | 'no_realizada'
  fecha_hora_inicio: string | null
  colaboradoraId: string
  pdvId: string
  vitrinaId: string
  monto_calculado: number
  pdvNombre: string
  vitrinaCodigo: string
  items: ItemConteo[]
  fotos: FotoVisita[]
}

type VisitaQueryResult = {
  visita: VisitaDetalle
  source: 'remote' | 'snapshot'
  lastSyncedAt: string | null
}

// Supabase PostgREST returns joined rows as object or array — handle both
type MaybeArray<T> = T | T[] | null

function firstOrNull<T>(val: MaybeArray<T>): T | null {
  if (val === null || val === undefined) return null
  return Array.isArray(val) ? (val[0] ?? null) : val
}

function calcItem(
  productoId: string,
  nombre: string,
  precio: number,
  invAnterior: number,
  invActual: number | null
): Omit<ItemConteo, 'cantidadObjetivo' | 'stockColaboradora' | 'productoActivo'> {
  const vendidas = invActual !== null ? Math.max(invAnterior - invActual, 0) : 0
  return {
    productoId,
    nombre,
    precioUnitario: precio,
    invAnterior,
    invActual,
    unidadesVendidas: vendidas,
    subtotal: vendidas * precio,
  }
}

export function useVisita(id: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  async function updateLocalVisitDraft(
    updater: (currentVisita: VisitaDetalle) => Promise<ReturnType<typeof buildOfflineVisitDraft>> | ReturnType<typeof buildOfflineVisitDraft>
  ) {
    const cached = queryClient.getQueryData<VisitaQueryResult>(['visita', id])
    const currentVisita = cached?.visita ?? (await getVisitSnapshot(id))?.visita ?? null

    if (!currentVisita) {
      throw new Error('La visita no esta disponible localmente')
    }

    const draft = await updater(currentVisita)
    await putVisitDraft(draft)

    const visitWithDraft = applyVisitDraftToVisita(currentVisita, draft)
    await saveVisitSnapshot(id, visitWithDraft)

    queryClient.setQueryData<VisitaQueryResult>(['visita', id], {
      visita: visitWithDraft,
      source: 'snapshot',
      lastSyncedAt: new Date().toISOString(),
    })

    queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })

    return { currentVisita, draft, visitWithDraft }
  }

  const query = useQuery({
    queryKey: ['visita', id],
    enabled: !!id,
    queryFn: async (): Promise<VisitaQueryResult> => {
      try {
        // Query 1: datos de la visita
        const { data: visita, error: vErr } = await supabase
          .from('visitas')
          .select(`
            id,
            estado,
            fecha_hora_inicio,
            monto_calculado,
            pdv_id,
            vitrina_id,
            colaboradora_id,
            puntos_de_venta(nombre_comercial),
            vitrinas(codigo),
            fotos_visita(id, url, tipo, fecha_subida)
          `)
          .eq('id', id)
          .single()
        if (vErr || !visita) throw new Error(vErr?.message ?? 'Visita no encontrada')

        const vitrinaId = visita.vitrina_id
        const colaboradoraId = visita.colaboradora_id

        // Queries 2-5 en paralelo
        const [surtidoRes, inventarioRes, detalleRes, inventarioColaboradoraRes] = await Promise.all([
          supabase
            .from('surtido_estandar')
            .select('producto_id, cantidad_objetivo, productos(id, nombre, precio_venta_comercio, estado)')
            .eq('vitrina_id', vitrinaId),
          supabase
            .from('inventario_vitrina')
            .select('producto_id, cantidad_actual')
            .eq('vitrina_id', vitrinaId),
          supabase
            .from('detalle_visita')
            .select('producto_id, inv_anterior, inv_actual')
            .eq('visita_id', id),
          supabase
            .from('inventario_colaboradora')
            .select('producto_id, cantidad_actual')
            .eq('colaboradora_id', colaboradoraId),
        ])

        if (surtidoRes.error) throw new Error(surtidoRes.error.message)
        if (inventarioColaboradoraRes.error) throw new Error(inventarioColaboradoraRes.error.message)

        const inventarioMap = new Map(
          (inventarioRes.data ?? []).map((iv) => [iv.producto_id, iv.cantidad_actual])
        )
        const detalleMap = new Map(
          (detalleRes.data ?? []).map((d) => [d.producto_id, d])
        )
        const inventarioColaboradoraMap = new Map(
          (inventarioColaboradoraRes.data ?? []).map((item) => [item.producto_id, item.cantidad_actual])
        )

        type ProdRaw = { id: string; nombre: string; precio_venta_comercio: number; estado: string }

        const items: ItemConteo[] = (surtidoRes.data ?? []).map((se) => {
          const prod = firstOrNull(
            se.productos as MaybeArray<ProdRaw>
          )
          if (!prod) return null

          const detalle = detalleMap.get(prod.id)
          const invAnterior = detalle?.inv_anterior ?? inventarioMap.get(prod.id) ?? 0
          const invActual = detalle ? detalle.inv_actual : null

          return {
            ...calcItem(prod.id, prod.nombre, prod.precio_venta_comercio, invAnterior, invActual),
            productoActivo: prod.estado === 'activo',
            cantidadObjetivo: se.cantidad_objetivo ?? 0,
            stockColaboradora: inventarioColaboradoraMap.get(prod.id) ?? 0,
          }
        }).filter((item): item is ItemConteo => item !== null)

        const pdvRaw = visita.puntos_de_venta as MaybeArray<{ nombre_comercial: string }>
        const vitrRaw = visita.vitrinas as MaybeArray<{ codigo: string }>
        const fotosRaw = visita.fotos_visita as MaybeArray<FotoVisita> | FotoVisita[] | null

        const mappedVisita: VisitaDetalle = {
          id: visita.id,
          estado: visita.estado as VisitaDetalle['estado'],
          fecha_hora_inicio: visita.fecha_hora_inicio ?? null,
          colaboradoraId,
          pdvId: visita.pdv_id,
          vitrinaId,
          monto_calculado: (visita.monto_calculado as number) ?? 0,
          pdvNombre: firstOrNull(pdvRaw)?.nombre_comercial ?? '',
          vitrinaCodigo: firstOrNull(vitrRaw)?.codigo ?? '',
          items,
          fotos: Array.isArray(fotosRaw)
            ? fotosRaw
            : fotosRaw
            ? [fotosRaw]
            : [],
        }

        const draft = await getVisitDraft(id)
        const visitWithDraft = applyVisitDraftToVisita(mappedVisita, draft)

        await saveVisitSnapshot(id, visitWithDraft)

        return {
          visita: visitWithDraft,
          source: 'remote',
          lastSyncedAt: new Date().toISOString(),
        }
      } catch (error) {
        if (!isProbablyOfflineError(error)) {
          throw error
        }

        const snapshot = await getVisitSnapshot(id)
        if (!snapshot) {
          throw error
        }

        const draft = await getVisitDraft(id)

        return {
          visita: applyVisitDraftToVisita(snapshot.visita, draft),
          source: 'snapshot',
          lastSyncedAt: snapshot.savedAt,
        }
      }
    },
  })

  const iniciarVisita = useMutation({
    mutationFn: async () => {
      const fechaHoraInicio = new Date().toISOString()

      try {
        const { error } = await supabase
          .from('visitas')
          .update({ estado: 'en_ejecucion', fecha_hora_inicio: fechaHoraInicio })
          .eq('id', id)
        if (error) throw new Error(error.message)
      } catch (error) {
        if (!isProbablyOfflineError(error)) throw error

        await updateLocalVisitDraft((currentVisita) =>
          buildOfflineVisitDraft(currentVisita, {
            estado: 'en_ejecucion',
            fechaHoraInicio,
          })
        )
        await enqueueVisitStart(id, fechaHoraInicio)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
      queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })
    },
  })

  const guardarConteo = useMutation({
    mutationFn: async (items: ItemConteo[]) => {
      const rows = buildSaveCountRows(id, items)

      try {
        const { error } = await supabase
          .from('detalle_visita')
          .upsert(rows, {
            onConflict: 'visita_id,producto_id',
            ignoreDuplicates: false,
          })
        if (error) throw new Error(error.message)
      } catch (error) {
        if (!isProbablyOfflineError(error)) throw error

        await updateLocalVisitDraft((currentVisita) =>
          buildOfflineVisitDraft(currentVisita, {
            estado: currentVisita.estado === 'planificada' ? 'en_ejecucion' : currentVisita.estado,
            items: buildConteoDraftItems(items),
            fechaHoraInicio: currentVisita.fecha_hora_inicio ?? new Date().toISOString(),
          })
        )
        await enqueueSaveCount(id, rows)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
      queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })
    },
  })

  const marcarNoRealizada = useMutation({
    mutationFn: async (motivo: string) => {
      if (!motivo.trim()) throw new Error('El motivo es requerido')

      try {
        const { error } = await supabase
          .from('visitas')
          .update({
            estado: 'no_realizada',
            motivo_no_realizada: motivo.trim(),
          })
          .eq('id', id)
        if (error) throw new Error(error.message)
      } catch (error) {
        if (!isProbablyOfflineError(error)) throw error

        await updateLocalVisitDraft((currentVisita) =>
          buildOfflineVisitDraft(currentVisita, {
            estado: 'no_realizada',
            motivoNoRealizada: motivo.trim(),
          })
        )
        await enqueueMarkNoRealizada(id, motivo.trim())
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
      queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })
    },
  })

  const subirFoto = useMutation({
    mutationFn: async (file: File): Promise<FotoVisita> => {
      const compressedFile = await compressImageFile(file)
      const localPhotoId = crypto.randomUUID()
      const { data: { user } } = await supabase.auth.getUser()
      const path = buildScopedPhotoPath({
        entityType: 'visitas',
        ownerId: user!.id,
        entityId: id,
        photoId: localPhotoId,
        filename: compressedFile.name,
      })

      try {
        const { data: uploaded, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, compressedFile, {
            upsert: false,
            contentType: compressedFile.type || 'image/jpeg',
          })

        if (uploadError || !uploaded) {
          throw new Error(uploadError?.message ?? 'No se pudo subir la foto')
        }

        const { data: foto, error } = await supabase
          .from('fotos_visita')
          .insert({
            id: localPhotoId,
            visita_id: id,
            url: uploaded.path,
            tipo: 'despues',
          })
          .select('id, url, tipo, fecha_subida')
          .single()

        if (error || !foto) {
          throw new Error(error?.message ?? 'No se pudo registrar la foto')
        }

        return foto as FotoVisita
      } catch (error) {
        if (!isProbablyOfflineError(error)) throw error

        await putPendingPhoto({
          id: localPhotoId,
          visitId: id,
          entityType: 'visita',
          entityId: id,
          storagePath: path,
          tipo: 'despues',
          blob: compressedFile,
          mimeType: compressedFile.type || 'image/jpeg',
          createdAt: new Date().toISOString(),
          syncStatus: 'pending',
          lastError: null,
        })
        await enqueueVisitPhotoUpload(id, {
          local_photo_id: localPhotoId,
          storage_path: path,
          tipo: 'despues',
        })

        return {
          id: localPhotoId,
          url: `offline://visita/${localPhotoId}`,
          tipo: 'despues',
          fecha_subida: new Date().toISOString(),
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
    },
  })

  const eliminarFoto = useMutation({
    mutationFn: async ({ fotoId, path }: { fotoId: string; path: string }) => {
      if (path.startsWith('offline://')) {
        await deletePendingPhoto(fotoId)
        await deleteQueueItem(buildQueueItemId('visit:upload-photo', id, fotoId))
        return
      }

      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([path])

      if (storageError) {
        throw new Error(storageError.message)
      }

      const { error } = await supabase
        .from('fotos_visita')
        .delete()
        .eq('id', fotoId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
    },
  })

  const cerrarVisita = useMutation({
    mutationFn: async (payload: {
      cobro: { monto: number; forma_pago_id: string; notas?: string }
      reposiciones: Array<{ producto_id: string; unidades_repuestas: number }>
    }) => {
      const clientSyncId = crypto.randomUUID()

      try {
        const { error } = await supabase.rpc('cerrar_visita_offline', {
          p_visita_id: id,
          p_cobro: payload.cobro,
          p_reposiciones: payload.reposiciones,
          p_client_sync_id: clientSyncId,
        })

        if (error) throw new Error(error.message)
      } catch (error) {
        if (!isProbablyOfflineError(error)) throw error

        await updateLocalVisitDraft((currentVisita) =>
          buildOfflineVisitDraft(currentVisita, {
            estado: 'completada',
            fechaHoraFin: new Date().toISOString(),
          })
        )
        await enqueueCloseVisit(id, {
          cobro: payload.cobro,
          reposiciones: payload.reposiciones,
          client_sync_id: clientSyncId,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
      queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })
      queryClient.invalidateQueries({ queryKey: ['visitas'] })
      queryClient.invalidateQueries({ queryKey: ['inventario_colaboradora'] })
      queryClient.invalidateQueries({ queryKey: ['inventario_central'] })
    },
  })

  return {
    ...query,
    data: query.data?.visita,
    isOfflineFallback: query.data?.source === 'snapshot',
    lastSyncedAt: query.data?.lastSyncedAt ?? null,
    iniciarVisita,
    guardarConteo,
    marcarNoRealizada,
    subirFoto,
    eliminarFoto,
    cerrarVisita,
  }
}
