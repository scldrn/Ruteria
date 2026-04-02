import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { compressImageFile } from '@/lib/offline/compression'
import {
  listPendingIncidenciasByVisit,
  putPendingIncidencia,
} from '@/lib/offline/incidencias'
import { isProbablyOfflineError } from '@/lib/offline/network'
import { putPendingPhoto } from '@/lib/offline/photos'
import { enqueueCreateIncidencia } from '@/lib/offline/queue'
import { buildScopedPhotoPath } from '@/lib/storage/paths'
import type { Database } from '@/lib/supabase/database.types'
import type {
  ActualizarIncidenciaInput,
  CrearIncidenciaInput,
} from '@/lib/validations/incidencias'
import { getBusinessDayUtcRange } from '@/lib/dates'

const STORAGE_BUCKET = 'fotos-visita'

type MaybeArray<T> = T | T[] | null

function firstOrNull<T>(value: MaybeArray<T>): T | null {
  if (value === null || value === undefined) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export type FiltrosIncidencias = {
  estados?: string[]
  tipo?: string
  pdvId?: string
  visitaId?: string
  fechaDesde?: string
  fechaHasta?: string
}

export type FotoIncidencia = Database['public']['Tables']['fotos_incidencia']['Row'] & {
  signedUrl: string | null
}

export type IncidenciaItem = {
  id: string
  visita_id: string | null
  pdv_id: string
  vitrina_id: string | null
  tipo: string
  descripcion: string
  estado: string
  responsable_id: string | null
  responsable_nombre: string | null
  resolucion: string | null
  fecha_apertura: string
  fecha_cierre: string | null
  created_at: string
  created_by: string | null
  creador_nombre: string | null
  pdv_nombre: string
  vitrina_codigo: string | null
  fotos: FotoIncidencia[]
  dias_abierta: number
  syncStatus?: 'pending' | 'error'
}

const QUERY_KEY = ['incidencias'] as const

function calcularDiasAbierta(fechaApertura: string, fechaCierre: string | null): number {
  const inicio = new Date(fechaApertura).getTime()
  const fin = fechaCierre ? new Date(fechaCierre).getTime() : Date.now()
  return Math.max(0, Math.floor((fin - inicio) / (1000 * 60 * 60 * 24)))
}

export function useIncidencias(filtros: FiltrosIncidencias = {}) {
  const supabase = createClient()

  return useQuery({
    queryKey: [...QUERY_KEY, filtros],
    queryFn: async (): Promise<IncidenciaItem[]> => {
      const pendingLocal =
        typeof window !== 'undefined' && filtros.visitaId
          ? await listPendingIncidenciasByVisit(filtros.visitaId)
          : []

      let query = supabase
        .from('incidencias')
        .select(`
          *,
          puntos_de_venta(nombre_comercial),
          vitrinas(codigo),
          responsable:usuarios!incidencias_responsable_id_fkey(nombre),
          creador:usuarios!incidencias_created_by_fkey(nombre),
          fotos_incidencia(*)
        `)
        .order('fecha_apertura', { ascending: false })
        .limit(200)

      if (filtros.estados?.length) {
        query = query.in('estado', filtros.estados)
      }

      if (filtros.tipo) {
        query = query.eq('tipo', filtros.tipo)
      }

      if (filtros.pdvId) {
        query = query.eq('pdv_id', filtros.pdvId)
      }

      if (filtros.visitaId) {
        query = query.eq('visita_id', filtros.visitaId)
      }

      if (filtros.fechaDesde) {
        const { start } = getBusinessDayUtcRange(filtros.fechaDesde)
        query = query.gte('fecha_apertura', start)
      }

      if (filtros.fechaHasta) {
        const { end } = getBusinessDayUtcRange(filtros.fechaHasta)
        query = query.lt('fecha_apertura', end)
      }

      const { data, error } = await query
      if (error) {
        const wrappedError = new Error(error.message)

        if (isProbablyOfflineError(wrappedError) && filtros.visitaId) {
          return pendingLocal.map((item) => ({
            id: item.id,
            visita_id: item.visitId,
            pdv_id: item.pdvId,
            vitrina_id: item.vitrinaId,
            tipo: item.tipo,
            descripcion: item.descripcion,
            estado: 'abierta',
            responsable_id: null,
            responsable_nombre: null,
            resolucion: null,
            fecha_apertura: item.createdAt,
            fecha_cierre: null,
            created_at: item.createdAt,
            created_by: item.createdBy,
            creador_nombre: null,
            pdv_nombre: 'Pendiente de sincronizar',
            vitrina_codigo: null,
            fotos: [],
            dias_abierta: calcularDiasAbierta(item.createdAt, null),
            syncStatus: item.syncStatus,
          }))
        }

        throw wrappedError
      }

      type RawIncidencia = typeof data extends (infer T)[] | null ? T : never

      const allFotos = (data ?? []).flatMap((item) =>
        Array.isArray(item.fotos_incidencia)
          ? item.fotos_incidencia
          : item.fotos_incidencia
          ? [item.fotos_incidencia]
          : []
      )

      const uniquePaths = Array.from(new Set(allFotos.map((foto) => foto.url).filter(Boolean)))
      const signedUrlMap = new Map<string, string | null>()

      if (uniquePaths.length > 0) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrls(uniquePaths, 60 * 60)

        if (signedError) throw new Error(signedError.message)

        uniquePaths.forEach((path, index) => {
          signedUrlMap.set(path, signedData?.[index]?.signedUrl ?? null)
        })
      }

      const remoteItems = (data ?? []).map((item: RawIncidencia) => {
        const pdv = firstOrNull(item.puntos_de_venta as MaybeArray<{ nombre_comercial: string }>)
        const vitrina = firstOrNull(item.vitrinas as MaybeArray<{ codigo: string }>)
        const responsable = firstOrNull(item.responsable as MaybeArray<{ nombre: string }>)
        const creador = firstOrNull(item.creador as MaybeArray<{ nombre: string }>)
        const fotos = Array.isArray(item.fotos_incidencia)
          ? item.fotos_incidencia
          : item.fotos_incidencia
          ? [item.fotos_incidencia]
          : []

        return {
          id: item.id,
          visita_id: item.visita_id,
          pdv_id: item.pdv_id,
          vitrina_id: item.vitrina_id,
          tipo: item.tipo,
          descripcion: item.descripcion ?? '',
          estado: item.estado,
          responsable_id: item.responsable_id,
          responsable_nombre: responsable?.nombre ?? null,
          resolucion: item.resolucion ?? null,
          fecha_apertura: item.fecha_apertura,
          fecha_cierre: item.fecha_cierre ?? null,
          created_at: item.created_at,
          created_by: item.created_by ?? null,
          creador_nombre: creador?.nombre ?? null,
          pdv_nombre: pdv?.nombre_comercial ?? '—',
          vitrina_codigo: vitrina?.codigo ?? null,
          fotos: fotos.map((foto) => ({
            ...foto,
            signedUrl: signedUrlMap.get(foto.url) ?? null,
          })) as FotoIncidencia[],
          dias_abierta: calcularDiasAbierta(item.fecha_apertura, item.fecha_cierre ?? null),
        }
      })

      const pendingItems = pendingLocal.map((item) => ({
        id: item.id,
        visita_id: item.visitId,
        pdv_id: item.pdvId,
        vitrina_id: item.vitrinaId,
        tipo: item.tipo,
        descripcion: item.descripcion,
        estado: 'abierta',
        responsable_id: null,
        responsable_nombre: null,
        resolucion: null,
        fecha_apertura: item.createdAt,
        fecha_cierre: null,
        created_at: item.createdAt,
        created_by: item.createdBy,
        creador_nombre: null,
        pdv_nombre: 'Pendiente de sincronizar',
        vitrina_codigo: null,
        fotos: [],
        dias_abierta: calcularDiasAbierta(item.createdAt, null),
        syncStatus: item.syncStatus,
      }))

      // Deduplicar: si un item pendiente ya fue sincronizado al servidor (mismo UUID),
      // el remoto tiene precedencia para evitar conteo doble durante el proceso de sync.
      const remoteIds = new Set(remoteItems.map((i) => i.id))
      const pendingNoSincronizados = pendingItems.filter((i) => !remoteIds.has(i.id))

      return [...pendingNoSincronizados, ...remoteItems]
    },
  })
}

export function useCrearIncidencia() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      values,
      pdvId,
      visitaId,
      vitrinaId,
      fotos = [],
    }: {
      values: CrearIncidenciaInput
      pdvId: string
      visitaId?: string | null
      vitrinaId?: string | null
      fotos?: File[]
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const compressedPhotos = await Promise.all(fotos.map((file) => compressImageFile(file)))

      try {
        const incidenciaId = crypto.randomUUID()
        const { data: incidencia, error } = await supabase
          .from('incidencias')
          .insert({
            id: incidenciaId,
            tipo: values.tipo,
            descripcion: values.descripcion,
            estado: 'abierta',
            pdv_id: pdvId,
            visita_id: visitaId ?? null,
            vitrina_id: vitrinaId ?? null,
            created_by: user?.id ?? null,
          })
          .select('id')
          .single()

        if (error || !incidencia) {
          throw new Error(error?.message ?? 'No se pudo crear la incidencia')
        }

        let fotosSubidas = 0
        let fotosFallidas = 0
        const fotosRows: Database['public']['Tables']['fotos_incidencia']['Insert'][] = []

        for (const file of compressedPhotos) {
          const photoId = crypto.randomUUID()
          const storagePath = buildScopedPhotoPath({
            entityType: 'incidencias',
            ownerId: user?.id ?? 'unknown',
            entityId: incidencia.id,
            photoId,
            filename: file.name,
          })

          const { data: uploaded, error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file, {
              upsert: false,
              contentType: file.type || 'image/jpeg',
            })

          if (uploadError || !uploaded) {
            fotosFallidas += 1
            continue
          }

          fotosSubidas += 1
          fotosRows.push({
            id: photoId,
            incidencia_id: incidencia.id,
            url: uploaded.path,
            created_by: user?.id ?? null,
          })
        }

        if (fotosRows.length > 0) {
          const { error: fotosError } = await supabase
            .from('fotos_incidencia')
            .insert(fotosRows)

          if (fotosError) {
            throw new Error(fotosError.message)
          }
        }

        return {
          incidenciaId: incidencia.id,
          fotosSubidas,
          fotosFallidas,
          pendingOffline: false,
        }
      } catch (error) {
        if (!isProbablyOfflineError(error)) {
          throw error
        }

        const localIncidenciaId = crypto.randomUUID()
        const photoIds: string[] = []

        for (const file of compressedPhotos) {
          const photoId = crypto.randomUUID()
          const storagePath = buildScopedPhotoPath({
            entityType: 'incidencias',
            ownerId: user?.id ?? 'unknown',
            entityId: localIncidenciaId,
            photoId,
            filename: file.name,
          })

          photoIds.push(photoId)
          await putPendingPhoto({
            id: photoId,
            visitId: visitaId ?? '',
            entityType: 'incidencia',
            entityId: localIncidenciaId,
            storagePath,
            tipo: null,
            blob: file,
            mimeType: file.type || 'image/jpeg',
            createdAt: new Date().toISOString(),
            syncStatus: 'pending',
            lastError: null,
          })
        }

        await putPendingIncidencia({
          id: localIncidenciaId,
          visitId: visitaId ?? '',
          pdvId,
          vitrinaId: vitrinaId ?? null,
          tipo: values.tipo,
          descripcion: values.descripcion,
          createdBy: user?.id ?? null,
          createdAt: new Date().toISOString(),
          syncStatus: 'pending',
          lastError: null,
          photoIds,
        })

        if (visitaId) {
          await enqueueCreateIncidencia(visitaId, {
            incidencia_id: localIncidenciaId,
            pdv_id: pdvId,
            vitrina_id: vitrinaId ?? null,
            tipo: values.tipo,
            descripcion: values.descripcion,
            photo_ids: photoIds,
          })
        }

        return {
          incidenciaId: localIncidenciaId,
          fotosSubidas: 0,
          fotosFallidas: 0,
          pendingOffline: true,
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useActualizarIncidencia() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string
      values: ActualizarIncidenciaInput
    }) => {
      const payload: Database['public']['Tables']['incidencias']['Update'] = {
        estado: values.estado,
        responsable_id: values.responsable_id ?? null,
        resolucion: values.resolucion ?? null,
      }

      const { error } = await supabase
        .from('incidencias')
        .update(payload)
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
