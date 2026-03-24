import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getBusinessDate, getBusinessDayUtcRange } from '@/lib/dates'
import { applyVisitDraftToRoute, listVisitDrafts } from '@/lib/offline/drafts'
import { isProbablyOfflineError } from '@/lib/offline/network'
import { getRouteSnapshot, saveRouteSnapshot } from '@/lib/offline/snapshots'

export type VisitaDelDia = {
  id: string
  estado: 'planificada' | 'en_ejecucion' | 'completada' | 'no_realizada'
  fecha_hora_inicio: string | null
  fecha_hora_fin: string | null
  monto_calculado: number
  motivo_no_realizada: string | null
  pdv: { nombre_comercial: string; direccion: string | null }
  ruta: { nombre: string }
  orden_visita: number
  syncStatus?: 'pending' | 'error'
}

type RutaDelDiaResult = {
  visitas: VisitaDelDia[]
  source: 'remote' | 'snapshot'
  lastSyncedAt: string | null
}

const SELECT = `
  id,
  estado,
  fecha_hora_inicio,
  fecha_hora_fin,
  monto_calculado,
  motivo_no_realizada,
  pdv_id,
  puntos_de_venta(nombre_comercial, direccion),
  rutas!inner(nombre, rutas_pdv(orden_visita, pdv_id))
` as const

type RutasPdvEntry = { orden_visita: number; pdv_id: string }
type RutasEntry = { nombre: string; rutas_pdv: RutasPdvEntry[] | null }

type RawVisita = {
  id: string
  estado: string
  fecha_hora_inicio: string | null
  fecha_hora_fin: string | null
  monto_calculado: number
  motivo_no_realizada: string | null
  pdv_id: string
  puntos_de_venta: { nombre_comercial: string; direccion: string | null } | { nombre_comercial: string; direccion: string | null }[] | null
  rutas: RutasEntry | RutasEntry[] | null
}

// PostgREST may return a single object or an array for joined relations
function firstOrNull<T>(value: T | T[] | null): T | null {
  if (value === null || value === undefined) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapRow(v: RawVisita): VisitaDelDia {
  const pdvRaw = v.puntos_de_venta
  const pdv: VisitaDelDia['pdv'] = Array.isArray(pdvRaw)
    ? (pdvRaw[0] ?? { nombre_comercial: '', direccion: null })
    : (pdvRaw ?? { nombre_comercial: '', direccion: null })

  const rutasData = firstOrNull<RutasEntry>(v.rutas as RutasEntry | RutasEntry[] | null)
  const ordenVisita = rutasData?.rutas_pdv?.find((rp) => rp.pdv_id === v.pdv_id)?.orden_visita ?? 0

  return {
    id: v.id,
    estado: v.estado as VisitaDelDia['estado'],
    fecha_hora_inicio: v.fecha_hora_inicio ?? null,
    fecha_hora_fin: v.fecha_hora_fin ?? null,
    monto_calculado: v.monto_calculado ?? 0,
    motivo_no_realizada: v.motivo_no_realizada ?? null,
    pdv,
    ruta: { nombre: rutasData?.nombre ?? '' },
    orden_visita: ordenVisita,
  }
}

export function useRutaDelDia() {
  const supabase = createClient()
  const todayKey = getBusinessDate()

  const query = useQuery({
    queryKey: ['ruta-del-dia'],
    queryFn: async (): Promise<RutaDelDiaResult> => {
      try {
        const { start, end } = getBusinessDayUtcRange()

        const [planificadas, activas, noRealizadas] = await Promise.all([
          supabase
            .from('visitas')
            .select(SELECT)
            .eq('estado', 'planificada')
            .gte('created_at', start)
            .lt('created_at', end),
          supabase
            .from('visitas')
            .select(SELECT)
            .in('estado', ['en_ejecucion', 'completada'])
            .not('fecha_hora_inicio', 'is', null)
            .gte('fecha_hora_inicio', start)
            .lt('fecha_hora_inicio', end),
          supabase
            .from('visitas')
            .select(SELECT)
            .eq('estado', 'no_realizada')
            .gte('created_at', start)
            .lt('created_at', end),
        ])

        if (planificadas.error) throw new Error(planificadas.error.message)
        if (activas.error) throw new Error(activas.error.message)
        if (noRealizadas.error) throw new Error(noRealizadas.error.message)

        const deduped = new Map<string, VisitaDelDia>()

        for (const visita of [
          ...(planificadas.data ?? []),
          ...(activas.data ?? []),
          ...(noRealizadas.data ?? []),
        ]) {
          const mapped = mapRow(visita as unknown as RawVisita)
          deduped.set(mapped.id, mapped)
        }

        const drafts = await listVisitDrafts()
        const draftMap = new Map(drafts.map((draft) => [draft.visitId, draft]))
        const visitas = Array.from(deduped.values())
          .map((visita) => applyVisitDraftToRoute(visita, draftMap.get(visita.id) ?? null))
          .sort((a, b) => a.orden_visita - b.orden_visita)
        await saveRouteSnapshot(todayKey, visitas)

        return {
          visitas,
          source: 'remote',
          lastSyncedAt: new Date().toISOString(),
        }
      } catch (error) {
        if (!isProbablyOfflineError(error)) {
          throw error
        }

        const snapshot = await getRouteSnapshot(todayKey)
        if (!snapshot) {
          throw error
        }

        const drafts = await listVisitDrafts()
        const draftMap = new Map(drafts.map((draft) => [draft.visitId, draft]))

        return {
          visitas: snapshot.visitas.map((visita) =>
            applyVisitDraftToRoute(visita, draftMap.get(visita.id) ?? null)
          ),
          source: 'snapshot',
          lastSyncedAt: snapshot.savedAt,
        }
      }
    },
  })

  return {
    ...query,
    data: query.data?.visitas ?? [],
    isOfflineFallback: query.data?.source === 'snapshot',
    lastSyncedAt: query.data?.lastSyncedAt ?? null,
  }
}
