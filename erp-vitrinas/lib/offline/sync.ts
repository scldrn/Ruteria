'use client'

import type { QueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { deleteVisitDraft, markVisitDraftError } from '@/lib/offline/drafts'
import {
  deletePendingIncidencia,
  getPendingIncidencia,
  markPendingIncidenciaError,
} from '@/lib/offline/incidencias'
import {
  deletePendingPhoto,
  getPendingPhoto,
  listPendingPhotosByEntity,
  markPendingPhotoError,
} from '@/lib/offline/photos'
import {
  deleteQueueItem,
  hasPendingQueueItemsForVisit,
  listQueueItems,
  markQueueItemError,
} from '@/lib/offline/queue'

const STORAGE_BUCKET = 'fotos-visita'

function isStorageAlreadyUploadedError(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('already exists') || normalized.includes('duplicate')
}

export async function processOfflineSyncQueue(
  supabase: SupabaseClient<Database>,
  queryClient: QueryClient
): Promise<void> {
  const items = await listQueueItems()

  for (const item of items) {
    try {
      if (item.type === 'visit:start') {
        const { error } = await supabase
          .from('visitas')
          .update({
            estado: 'en_ejecucion',
            fecha_hora_inicio: item.payload.fecha_hora_inicio,
          })
          .eq('id', item.visitId)

        if (error) throw new Error(error.message)
      }

      if (item.type === 'visit:save-count') {
        const { error } = await supabase
          .from('detalle_visita')
          .upsert(item.payload.rows, {
            onConflict: 'visita_id,producto_id',
            ignoreDuplicates: false,
          })

        if (error) throw new Error(error.message)
      }

      if (item.type === 'visit:mark-no-realizada') {
        const { error } = await supabase
          .from('visitas')
          .update({
            estado: 'no_realizada',
            motivo_no_realizada: item.payload.motivo_no_realizada,
          })
          .eq('id', item.visitId)

        if (error) throw new Error(error.message)
      }

      if (item.type === 'visit:close') {
        const { error } = await supabase.rpc('cerrar_visita_offline', {
          p_visita_id: item.visitId,
          p_cobro: item.payload.cobro,
          p_reposiciones: item.payload.reposiciones,
          p_client_sync_id: item.payload.client_sync_id,
        })

        if (error) throw new Error(error.message)
      }

      if (item.type === 'visit:upload-photo') {
        const photo = await getPendingPhoto(item.payload.local_photo_id)
        if (!photo) {
          await deleteQueueItem(item.id)
          continue
        }

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(photo.storagePath, photo.blob, {
            upsert: false,
            contentType: photo.mimeType || 'image/jpeg',
          })

        if (uploadError && !isStorageAlreadyUploadedError(uploadError.message)) {
          throw new Error(uploadError.message)
        }

        const existingFoto = await supabase
          .from('fotos_visita')
          .select('id')
          .eq('id', photo.id)
          .maybeSingle()

        if (existingFoto.error) throw new Error(existingFoto.error.message)

        if (!existingFoto.data) {
          const { error: fotoError } = await supabase
            .from('fotos_visita')
            .insert({
              id: photo.id,
              visita_id: item.visitId,
              url: photo.storagePath,
              tipo: photo.tipo,
            })

          if (fotoError) throw new Error(fotoError.message)
        }

        await deletePendingPhoto(photo.id)
      }

      if (item.type === 'visit:create-incidencia') {
        const incidencia = await getPendingIncidencia(item.payload.incidencia_id)
        if (!incidencia) {
          await deleteQueueItem(item.id)
          continue
        }

        const existingIncidencia = await supabase
          .from('incidencias')
          .select('id')
          .eq('id', incidencia.id)
          .maybeSingle()

        if (existingIncidencia.error) throw new Error(existingIncidencia.error.message)

        if (!existingIncidencia.data) {
          const {
            data: { user },
          } = await supabase.auth.getUser()

          const { error: incidenciaError } = await supabase
            .from('incidencias')
            .insert({
              id: incidencia.id,
              pdv_id: incidencia.pdvId,
              visita_id: incidencia.visitId,
              vitrina_id: incidencia.vitrinaId,
              tipo: incidencia.tipo,
              descripcion: incidencia.descripcion,
              estado: 'abierta',
              created_by: user?.id ?? incidencia.createdBy ?? null,
            })

          if (incidenciaError) throw new Error(incidenciaError.message)
        }

        const photos = await listPendingPhotosByEntity('incidencia', incidencia.id)

        for (const photo of photos) {
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(photo.storagePath, photo.blob, {
              upsert: false,
              contentType: photo.mimeType || 'image/jpeg',
            })

          if (uploadError && !isStorageAlreadyUploadedError(uploadError.message)) {
            throw new Error(uploadError.message)
          }

          const existingFoto = await supabase
            .from('fotos_incidencia')
            .select('id')
            .eq('id', photo.id)
            .maybeSingle()

          if (existingFoto.error) throw new Error(existingFoto.error.message)

          if (!existingFoto.data) {
            const {
              data: { user },
            } = await supabase.auth.getUser()

            const { error: fotoError } = await supabase
              .from('fotos_incidencia')
              .insert({
                id: photo.id,
                incidencia_id: incidencia.id,
                url: photo.storagePath,
                created_by: user?.id ?? incidencia.createdBy ?? null,
              })

            if (fotoError) throw new Error(fotoError.message)
          }

          await deletePendingPhoto(photo.id)
        }

        await deletePendingIncidencia(incidencia.id)
      }

      await deleteQueueItem(item.id)

      const stillPending = await hasPendingQueueItemsForVisit(item.visitId)
      if (!stillPending) {
        await deleteVisitDraft(item.visitId)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo sincronizar'
      await markQueueItemError(item.id, message)
      await markVisitDraftError(item.visitId, message)

       if (item.type === 'visit:upload-photo') {
        await markPendingPhotoError(item.payload.local_photo_id, message)
      }

      if (item.type === 'visit:create-incidencia') {
        await markPendingIncidenciaError(item.payload.incidencia_id, message)
        const photos = await listPendingPhotosByEntity('incidencia', item.payload.incidencia_id)
        for (const photo of photos) {
          await markPendingPhotoError(photo.id, message)
        }
      }
    }
  }

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] }),
    queryClient.invalidateQueries({ queryKey: ['visita'] }),
    queryClient.invalidateQueries({ queryKey: ['visitas'] }),
    queryClient.invalidateQueries({ queryKey: ['incidencias'] }),
    queryClient.invalidateQueries({ queryKey: ['inventario_colaboradora'] }),
    queryClient.invalidateQueries({ queryKey: ['inventario_central'] }),
  ])
}
