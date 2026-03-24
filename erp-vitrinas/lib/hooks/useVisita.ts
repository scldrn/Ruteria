import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const STORAGE_BUCKET = 'fotos-visita'

export type ItemConteo = {
  productoId: string
  nombre: string
  precioUnitario: number
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
): Omit<ItemConteo, 'cantidadObjetivo' | 'stockColaboradora'> {
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

  const query = useQuery({
    queryKey: ['visita', id],
    enabled: !!id,
    queryFn: async (): Promise<VisitaDetalle> => {
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
          .select('producto_id, cantidad_objetivo, productos(id, nombre, precio_venta_comercio)')
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

      type ProdRaw = { id: string; nombre: string; precio_venta_comercio: number }

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
          cantidadObjetivo: se.cantidad_objetivo ?? 0,
          stockColaboradora: inventarioColaboradoraMap.get(prod.id) ?? 0,
        }
      }).filter((item): item is ItemConteo => item !== null)

      const pdvRaw = visita.puntos_de_venta as MaybeArray<{ nombre_comercial: string }>
      const vitrRaw = visita.vitrinas as MaybeArray<{ codigo: string }>
      const fotosRaw = visita.fotos_visita as MaybeArray<FotoVisita> | FotoVisita[] | null

      return {
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
    },
  })

  const iniciarVisita = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('visitas')
        .update({ estado: 'en_ejecucion', fecha_hora_inicio: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
      queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })
    },
  })

  const guardarConteo = useMutation({
    mutationFn: async (items: ItemConteo[]) => {
      const rows = items.map((item) => ({
        visita_id: id,
        producto_id: item.productoId,
        inv_anterior: item.invAnterior,
        inv_actual: item.invActual ?? 0,
        precio_unitario: item.precioUnitario,
        unidades_repuestas: 0,
      }))

      const { error } = await supabase
        .from('detalle_visita')
        .upsert(rows, {
          onConflict: 'visita_id,producto_id',
          ignoreDuplicates: false,
        })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
      queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })
    },
  })

  const marcarNoRealizada = useMutation({
    mutationFn: async (motivo: string) => {
      if (!motivo.trim()) throw new Error('El motivo es requerido')
      const { error } = await supabase
        .from('visitas')
        .update({
          estado: 'no_realizada',
          motivo_no_realizada: motivo.trim(),
        })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
      queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })
    },
  })

  const subirFoto = useMutation({
    mutationFn: async (file: File): Promise<FotoVisita> => {
      const extension = file.name.split('.').pop() || 'jpg'
      const path = `visitas/${id}/${Date.now()}-${crypto.randomUUID()}.${extension}`

      const { data: uploaded, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          upsert: false,
          contentType: file.type || 'image/jpeg',
        })

      if (uploadError || !uploaded) {
        throw new Error(uploadError?.message ?? 'No se pudo subir la foto')
      }

      const { data: foto, error } = await supabase
        .from('fotos_visita')
        .insert({
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
    },
  })

  const eliminarFoto = useMutation({
    mutationFn: async ({ fotoId, path }: { fotoId: string; path: string }) => {
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
      const { error } = await supabase.rpc('cerrar_visita', {
        p_visita_id: id,
        p_cobro: payload.cobro,
        p_reposiciones: payload.reposiciones,
      })

      if (error) throw new Error(error.message)
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
    iniciarVisita,
    guardarConteo,
    marcarNoRealizada,
    subirFoto,
    eliminarFoto,
    cerrarVisita,
  }
}
